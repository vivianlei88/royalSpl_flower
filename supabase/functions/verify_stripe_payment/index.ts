import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

// ── Stripe Webhook 簽名驗證（Web Crypto API，無需外部庫）──────────────────
async function verifyWebhookSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split("=");
    if (k === "t") acc.timestamp = v;
    if (k === "v1") acc.signature = v;
    return acc;
  }, {});
  if (!parts.timestamp || !parts.signature) return false;
  // 防重放：5 分鐘內
  if (Math.abs(Date.now() / 1000 - Number(parts.timestamp)) > 300) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${parts.timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === parts.signature;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function ok(data: unknown): Response {
    return new Response(
        JSON.stringify({ code: "SUCCESS", message: "ok", data }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

function fail(msg: string, code = 400): Response {
    return new Response(
        JSON.stringify({ code: "FAIL", message: msg }),
        { status: code, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
}

// ── 標記訂單已付款（共用邏輯）──────────────────────────────────────────────
async function markOrderPaid(orderId: string, sessionId: string, session: Stripe.Checkout.Session) {
    // 1. 更新訂單狀態
    const { error } = await supabase
        .from("orders")
        .update({
            status: "processing",
            payment_status: "paid",
            stripe_payment_id: sessionId,
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    if (error) console.error("更新訂單狀態失敗:", error);

    // 2. 查詢訂單完整資料（含商品明細）
    const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    const { data: orderItems } = await supabase
        .from("order_items")
        .select("quantity, price, product_id")
        .eq("order_id", orderId);

    // 取得商品名稱
    let itemsWithNames: { name: string; quantity: number; price: number }[] = [];
    if (orderItems && orderItems.length > 0) {
        const productIds = orderItems.map((i) => i.product_id).filter(Boolean);
        const { data: products } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);
        const productMap = new Map((products || []).map((p) => [p.id, p.name]));
        itemsWithNames = orderItems.map((item) => ({
            name: productMap.get(item.product_id) || "商品",
            quantity: item.quantity,
            price: Number(item.price),
        }));
    }

    // 3. 發送確認郵件給顧客
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const customerEmail = order?.customer_email || session.customer_details?.email;
    const customerName = order?.customer_name || session.customer_details?.name || "親愛的顧客";
    const orderRef = orderId.substring(0, 8).toUpperCase();

    if (resendApiKey && customerEmail) {
        try {
            // 格式化日期（HKT）
            const deliveryDate = order?.delivery_date
                ? new Date(order.delivery_date).toLocaleDateString("zh-HK", {
                    year: "numeric", month: "long", day: "numeric", weekday: "long",
                    timeZone: "Asia/Hong_Kong",
                  })
                : "待確認";
            const deliverySlot = order?.delivery_time_slot || "";
            const specificTime = order?.specific_time || "";
            const deliveryArea = order?.delivery_area || "—";
            const cardMessage = order?.card_message || "";
            const remarks = order?.remarks || "";
            const shippingFee = Number(order?.final_shipping_fee || 0);
            const totalAmount = Number(order?.total_amount || (session.amount_total ? session.amount_total / 100 : 0));

            // 商品明細 HTML
            const itemsHtml = itemsWithNames.length > 0
                ? itemsWithNames.map((item) => `
                    <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#3d3d3d">${item.name}</td>
                        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#3d3d3d;text-align:center">× ${item.quantity}</td>
                        <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#3d3d3d;text-align:right">HK$${(item.price * item.quantity).toLocaleString()}</td>
                    </tr>`).join("")
                : `<tr><td colspan="3" style="padding:10px 0;font-size:14px;color:#888">（商品資料載入中）</td></tr>`;

            // 附加資訊（卡片留言、備註）
            const extraHtml = [
                cardMessage ? `<p style="margin:6px 0;font-size:13px;color:#666"><strong>卡片留言：</strong>${cardMessage}</p>` : "",
                remarks ? `<p style="margin:6px 0;font-size:13px;color:#666"><strong>備註：</strong>${remarks}</p>` : "",
            ].filter(Boolean).join("");

            const html = `<!DOCTYPE html>
<html lang="zh-HK">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">

    <!-- 頂部品牌 Banner -->
    <div style="background:#2c3e2d;padding:32px 40px;text-align:center">
      <p style="margin:0;font-size:11px;letter-spacing:3px;color:#a8c5a0;text-transform:uppercase">Royal Splendour Florist</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#ffffff;letter-spacing:1px">訂單確認</h1>
    </div>

    <!-- 主體內容 -->
    <div style="padding:40px">
      <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.7">
        親愛的 <strong>${customerName}</strong>，<br>
        感謝您選擇 Royalspl！您的付款已成功處理，我們將盡心為您準備每一束花。
      </p>

      <!-- 訂單摘要卡 -->
      <div style="background:#faf8f5;border-radius:4px;padding:20px 24px;margin-bottom:28px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#9a8f83;text-transform:uppercase">訂單編號</p>
        <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2c3e2d;letter-spacing:1px">#${orderRef}</p>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div>
            <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;color:#9a8f83;text-transform:uppercase">送花日期</p>
            <p style="margin:0;font-size:14px;color:#3d3d3d;font-weight:500">${deliveryDate}</p>
          </div>
          ${deliverySlot ? `<div>
            <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;color:#9a8f83;text-transform:uppercase">送花時段</p>
            <p style="margin:0;font-size:14px;color:#3d3d3d;font-weight:500">${deliverySlot}${specificTime ? " · " + specificTime : ""}</p>
          </div>` : ""}
          <div>
            <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;color:#9a8f83;text-transform:uppercase">送花地區</p>
            <p style="margin:0;font-size:14px;color:#3d3d3d;font-weight:500">${deliveryArea}</p>
          </div>
        </div>
      </div>

      <!-- 商品明細 -->
      <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;color:#9a8f83;text-transform:uppercase;font-weight:500">訂購商品</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr>
            <th style="padding:8px 0;border-bottom:2px solid #e8e4de;font-size:11px;color:#9a8f83;text-align:left;font-weight:500;letter-spacing:1px">商品</th>
            <th style="padding:8px 0;border-bottom:2px solid #e8e4de;font-size:11px;color:#9a8f83;text-align:center;font-weight:500;letter-spacing:1px">數量</th>
            <th style="padding:8px 0;border-bottom:2px solid #e8e4de;font-size:11px;color:#9a8f83;text-align:right;font-weight:500;letter-spacing:1px">小計</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- 費用合計 -->
      <div style="border-top:1px solid #e8e4de;padding-top:12px;margin-bottom:28px">
        ${shippingFee > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;color:#888">運費與附加費</span>
          <span style="font-size:13px;color:#888">HK$${shippingFee.toLocaleString()}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;margin-top:8px">
          <span style="font-size:15px;font-weight:600;color:#2c3e2d">總計</span>
          <span style="font-size:15px;font-weight:600;color:#2c3e2d">HK$${totalAmount.toLocaleString()}</span>
        </div>
      </div>

      ${extraHtml ? `<!-- 附加資訊 --><div style="background:#faf8f5;border-radius:4px;padding:16px 20px;margin-bottom:28px">${extraHtml}</div>` : ""}

      <!-- 分隔線 -->
      <hr style="border:none;border-top:1px solid #e8e4de;margin:0 0 24px">

      <p style="margin:0 0 8px;font-size:13px;color:#666;line-height:1.6">
        我們將於送花前與您確認詳情。如有任何疑問，歡迎透過 WhatsApp 或電郵與我們聯繫。
      </p>
      <p style="margin:0;font-size:13px;color:#888">
        📧 <a href="mailto:hello@royalspl.shop" style="color:#2c3e2d;text-decoration:none">hello@royalspl.shop</a>
      </p>
    </div>

    <!-- 底部 -->
    <div style="background:#f5f2ed;padding:24px 40px;text-align:center">
      <p style="margin:0 0 4px;font-size:12px;color:#9a8f83;letter-spacing:1px">ROYAL SPLENDOUR FLORIST · HONG KONG</p>
      <p style="margin:0;font-size:11px;color:#b5aea6">此為系統自動發送，請勿直接回覆此郵件</p>
    </div>
  </div>
</body>
</html>`;

            const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: "Royalspl Florist <orders@royalspl.shop>",
                    to: [customerEmail],
                    subject: `✅ 訂單確認 #${orderRef} — 感謝您選擇 Royalspl`,
                    html,
                }),
            });

            const emailResult = await emailRes.json();
            if (emailRes.ok) {
                console.log(`✅ 確認郵件已發送至 ${customerEmail}，郵件 ID: ${emailResult.id}`);
            } else {
                console.error("Resend 發送失敗:", JSON.stringify(emailResult));
            }
        } catch (e) {
            console.error("發送確認郵件失敗:", e);
        }
    } else {
        console.log(`跳過郵件發送：resendApiKey=${!!resendApiKey}, customerEmail=${customerEmail}`);
    }
}

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY 未設定");

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

        // ── 模式 A：Stripe Webhook（POST with stripe-signature）─────────────
        const stripeSignature = req.headers.get("stripe-signature");
        if (stripeSignature) {
            const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
            if (!webhookSecret) return fail("STRIPE_WEBHOOK_SECRET 未設定", 500);

            const rawBody = await req.text();
            const valid = await verifyWebhookSignature(rawBody, stripeSignature, webhookSecret);
            if (!valid) {
                console.error("Webhook 簽名驗證失敗");
                return fail("Invalid webhook signature", 400);
            }

            const event = JSON.parse(rawBody) as Stripe.Event;
            console.log("Webhook event:", event.type, event.id);

            if (event.type === "checkout.session.completed") {
                const session = event.data.object as Stripe.Checkout.Session;
                const orderId = session.metadata?.order_id || session.client_reference_id;
                if (orderId && session.payment_status === "paid") {
                    await markOrderPaid(orderId, session.id, session);
                    console.log(`訂單 ${orderId} 已通過 Webhook 標記為已付款`);
                }
            }

            if (event.type === "checkout.session.expired") {
                const session = event.data.object as Stripe.Checkout.Session;
                const orderId = session.metadata?.order_id || session.client_reference_id;
                if (orderId) {
                    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
                    console.log(`訂單 ${orderId} 因 Session 過期已取消`);
                }
            }

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // ── 模式 B：前端查詢付款結果（傳入 sessionId）────────────────────────
        if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

        const body = await req.json().catch(() => ({}));
        const sessionId: string = body.sessionId || body.session_id;
        if (!sessionId) return fail("缺少 sessionId 參數");

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return ok({ verified: false, status: session.payment_status, sessionId: session.id });
        }

        // 查找訂單
        const { data: order, error: fetchError } = await supabase
            .from("orders")
            .select("id, status, payment_status")
            .eq("stripe_payment_id", sessionId)
            .single();

        if (fetchError || !order) throw new Error("找不到對應訂單");

        let orderUpdated = false;
        if (order.payment_status !== "paid") {
            await markOrderPaid(order.id, session.id, session);
            orderUpdated = true;
        } else {
            orderUpdated = true; // 已是 paid，無需重複更新
        }

        return ok({
            verified: true,
            status: "paid",
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amount: session.amount_total,
            currency: session.currency?.toUpperCase(),
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
            orderUpdated,
            orderId: order.id,
        });

    } catch (error) {
        console.error("verify_stripe_payment error:", error);
        return fail(error instanceof Error ? error.message : "付款驗證失敗", 500);
    }
});