/**
 * Royalspl Florist — Cloudflare Worker
 * 路由：
 *   POST /stripe/checkout   → 建立 Stripe Checkout Session（直接呼叫 Stripe API）
 *   POST /stripe/webhook    → Stripe Webhook 驗證 & 事件處理（付款成功發 WhatsApp）
 *   POST /stripe/verify     → 前端付款後查詢結果
 *   POST /api/upload        → R2 圖片上傳
 *   GET  /api/analytics     → Cloudflare 流量數據
 *
 * ⚠️ 所有私密金鑰均從 context.env 讀取（Cloudflare Worker 環境變數）
 *    源碼與 Git 倉庫不含任何敏感憑證
 *
 * Worker 環境變數（Cloudflare Dashboard → Settings → Variables and Secrets）：
 *   STRIPE_SECRET_KEY          → sk_live_...
 *   STRIPE_WEBHOOK_SECRET      → whsec_...
 *   SUPABASE_URL               → https://oqxppwunatpdivykuwxk.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  → eyJ...
 *   SITE_URL                   → https://royalspl.shop
 *   WHATSAPP_TOKEN             → Meta WhatsApp Business API Token
 *   WHATSAPP_PHONE_NUMBER_ID   → WhatsApp Business Phone Number ID
 *   OWNER_WHATSAPP             → 店主號碼，如 85291234567（含國碼，不含 +）
 */

// ─── CORS Headers ────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── Route: POST /stripe/checkout ─────────────────────────────────────────
    if (url.pathname === "/stripe/checkout" && request.method === "POST") {
      return handleCheckout(request, env);
    }

    // ── Route: POST /stripe/webhook ──────────────────────────────────────────
    if (url.pathname === "/stripe/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    // ── Route: POST /stripe/verify ───────────────────────────────────────────
    if (url.pathname === "/stripe/verify" && request.method === "POST") {
      return handleVerify(request, env);
    }

    return json({ error: "Not Found" }, 404);
  },
};

// ─── Route 1: 建立 Checkout Session（直接呼叫 Stripe API，密鑰在 env）────────
async function handleCheckout(request, env) {
  try {
    const body = await request.json();

    // 驗證必填欄位
    const required = ["items", "total_amount", "customer_name", "customer_email"];
    for (const field of required) {
      if (!body[field]) {
        return json({ code: "FAIL", message: `缺少必填欄位: ${field}` }, 400);
      }
    }

    // ✅ 所有 Stripe 私密金鑰從 Worker 環境變數讀取，前端/源碼不持有
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return json({ code: "FAIL", message: "STRIPE_SECRET_KEY 未設定於 Worker 環境變數" }, 500);
    }

    const siteUrl = env.SITE_URL || "https://royalsplflower.com";
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    // 建立 Stripe line items（貨幣 HKD，金額×100 轉 cents）
    const lineItems = body.items.map((item) => ({
      price_data: {
        currency: "hkd",
        product_data: { name: item.name || item.product?.name || "商品" },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Number(item.quantity) || 1,
    }));

    // 加入運費行項
    if (Number(body.final_shipping_fee) > 0) {
      lineItems.push({
        price_data: {
          currency: "hkd",
          product_data: { name: "運費與附加費" },
          unit_amount: Math.round(Number(body.final_shipping_fee) * 100),
        },
        quantity: 1,
      });
    }

    // 在 Supabase 建立訂單記錄（Worker 持有 service role key）
    const orderId = await createOrder(body, { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseKey });

    // 直接呼叫 Stripe REST API（無需 npm stripe SDK）
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildStripeFormData({
        mode: "payment",
        success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cart`,
        customer_email: body.customer_email,
        "client_reference_id": orderId,
        "metadata[order_id]": orderId,
        ...buildLineItemsFormData(lineItems),
      }),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error("Stripe API error:", session);
      return json({ code: "FAIL", message: session.error?.message || "Stripe 建立 Session 失敗" }, 500);
    }

    // 更新訂單綁定 Stripe Session ID
    await updateOrderStripeId(orderId, session.id, { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: supabaseKey });

    console.log(`訂單建立成功: ${orderId}, Session: ${session.id}`);
    return json({ code: "SUCCESS", message: "ok", data: { url: session.url, sessionId: session.id, orderId } });

  } catch (err) {
    console.error("handleCheckout error:", err);
    return json({ code: "FAIL", message: err.message || "付款處理失敗" }, 500);
  }
}

// ─── Route 2: Stripe Webhook（Stripe → Cloudflare Worker，密鑰在 Worker env）─
async function handleWebhook(request, env) {
  try {
    // ✅ Webhook Secret 從 Worker 環境變數讀取，Stripe Dashboard 填 Worker URL
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return json({ code: "FAIL", message: "STRIPE_WEBHOOK_SECRET 未設定於 Worker 環境變數" }, 500);
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return json({ code: "FAIL", message: "缺少 stripe-signature header" }, 400);
    }

    const rawBody = await request.text();

    // 使用 Web Crypto API 驗證簽名（防重放攻擊）
    const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error("Webhook 簽名驗證失敗");
      return json({ code: "FAIL", message: "Invalid signature" }, 400);
    }

    const event = JSON.parse(rawBody);
    console.log(`Stripe Webhook: ${event.type} [${event.id}]`);

    const supabaseEnv = { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY };

    // checkout.session.completed → 標記訂單已付款
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || session.client_reference_id;
      if (orderId && session.payment_status === "paid") {
        await markOrderPaid(orderId, session.id, supabaseEnv);
        console.log(`✅ 訂單 ${orderId} 已付款（via Webhook）`);
      }
    }

    // checkout.session.expired → 取消訂單
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || session.client_reference_id;
      if (orderId) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ status: "cancelled" }),
        });
        console.log(`訂單 ${orderId} 因 Session 過期已取消`);
      }
    }

    // 必須回傳 200，否則 Stripe 會重試
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("handleWebhook error:", err);
    return json({ code: "FAIL", message: err.message }, 500);
  }
}

// ─── Route 3: 查詢付款結果（前端付款後主動查詢，密鑰在 Worker env）─────────
async function handleVerify(request, env) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return json({ code: "FAIL", message: "缺少 sessionId" }, 400);
    }

    // ✅ Stripe Secret Key 從 Worker 環境變數讀取
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return json({ code: "FAIL", message: "STRIPE_SECRET_KEY 未設定於 Worker 環境變數" }, 500);
    }

    const supabaseEnv = { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY };

    // 查詢 Stripe Session 狀態
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ code: "FAIL", message: session.error?.message || "查詢 Stripe Session 失敗" }, 500);
    }

    const verified = session.payment_status === "paid";
    const orderId = session.metadata?.order_id || session.client_reference_id;

    // 付款成功則同步更新 Supabase 訂單（Webhook 可能有延遲，此處作補充）
    if (verified && orderId) {
      await markOrderPaid(orderId, session.id, supabaseEnv);
    }

    return json({
      code: "SUCCESS",
      message: "ok",
      data: {
        verified,
        status: session.payment_status,
        sessionId: session.id,
        orderId,
        amountTotal: session.amount_total,   // cents，100 HKD = 10000
        currency: session.currency?.toUpperCase(),
      },
    });
  } catch (err) {
    console.error("handleVerify error:", err);
    return json({ code: "FAIL", message: err.message }, 500);
  }
}

// ─── Supabase Helpers ─────────────────────────────────────────────────────────
async function createOrder(body, env) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        total_amount: body.total_amount,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || "",
        customer_email: body.customer_email,
        delivery_date: body.delivery_date || null,
        delivery_time_slot: body.delivery_time_slot || "",
        delivery_area: body.delivery_area || "",
        time_surcharge: body.time_surcharge || 0,
        area_surcharge: body.area_surcharge || 0,
        final_shipping_fee: body.final_shipping_fee || 0,
        card_message: body.card_message || "",
        remarks: body.remarks || "",
        specific_time: body.specific_time || "",
        status: "pending",
        payment_status: "pending",
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`建立訂單失敗: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0].id : data.id;
}

async function updateOrderStripeId(orderId, stripeSessionId, env) {
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ stripe_payment_id: stripeSessionId }),
    }
  );
}

async function markOrderPaid(orderId, stripeSessionId, env) {
  // 1. 更新 Supabase 訂單狀態
  const patchRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "processing",
        payment_status: "paid",
        stripe_payment_id: stripeSessionId,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  // 2. 讀取訂單詳情（用於 WhatsApp 通知內容）
  let orderData = null;
  try {
    const rows = await patchRes.json();
    orderData = Array.isArray(rows) ? rows[0] : null;
  } catch { /* 忽略解析錯誤，仍繼續發通知 */ }

  // 3. 同步觸發 Supabase Edge Function 發送顧客確認郵件（Worker 不持有 RESEND_API_KEY）
  // Edge Function verify_stripe_payment 內的 markOrderPaid 已含郵件邏輯，
  // 若 Webhook 路徑進入 Worker，再呼叫一次 Edge Function 的 /send-email 端點
  // 此處只需確保 WhatsApp 通知店主即可
  await notifyOwnerWhatsApp(orderId, orderData, stripeSessionId, env);
}

// ─── WhatsApp 通知店主（Meta Cloud API）─────────────────────────────────────
async function notifyOwnerWhatsApp(orderId, order, sessionId, env) {
  try {
    const token = env.WHATSAPP_TOKEN;
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const ownerPhone = env.OWNER_WHATSAPP; // 如 85291234567（含國碼，不含 +）

    // 若未設定 WhatsApp 憑證則跳過（不影響主流程）
    if (!token || !phoneNumberId || !ownerPhone) {
      console.log("WhatsApp 通知跳過：環境變數未設定（WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / OWNER_WHATSAPP）");
      return;
    }

    // 格式化訂單資訊
    const customerName = order?.customer_name || "客戶";
    const amount = order?.total_amount ? `HK$${Number(order.total_amount).toLocaleString()}` : "—";
    const deliveryDate = order?.delivery_date || "—";
    const deliveryArea = order?.delivery_area || "—";
    const orderTime = new Date().toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" });

    const messageText =
      `🌸 *Royalspl 新訂單通知*\n\n` +
      `✅ 付款已成功確認\n\n` +
      `📦 訂單編號：${orderId.slice(0, 8).toUpperCase()}\n` +
      `👤 客戶姓名：${customerName}\n` +
      `💰 付款金額：${amount}\n` +
      `📅 送花日期：${deliveryDate}\n` +
      `📍 送花地區：${deliveryArea}\n` +
      `🕐 付款時間：${orderTime}\n\n` +
      `請登入後台確認訂單詳情。`;

    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: ownerPhone,
          type: "text",
          text: { body: messageText },
        }),
      }
    );

    const waResult = await waRes.json();
    if (waRes.ok) {
      console.log(`✅ WhatsApp 通知已發送至店主 ${ownerPhone}，訊息 ID: ${waResult.messages?.[0]?.id}`);
    } else {
      console.error("WhatsApp 發送失敗:", JSON.stringify(waResult));
    }
  } catch (err) {
    // WhatsApp 通知失敗不影響訂單主流程
    console.error("notifyOwnerWhatsApp error:", err.message);
  }
}

// ─── Stripe Signature Verification (Web Crypto API) ──────────────────────────
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    // 解析 stripe-signature header: t=timestamp,v1=sig,...
    const parts = sigHeader.split(",").reduce((acc, part) => {
      const [key, val] = part.split("=");
      if (key === "t") acc.timestamp = val;
      if (key === "v1") acc.signature = val;
      return acc;
    }, {});

    if (!parts.timestamp || !parts.signature) return false;

    // 防重放攻擊：timestamp 必須在 5 分鐘內
    const tolerance = 5 * 60; // 300 seconds
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(parts.timestamp)) > tolerance) {
      console.error("Webhook timestamp 超出容忍範圍");
      return false;
    }

    // 計算期望簽名
    const signedPayload = `${parts.timestamp}.${payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === parts.signature;
  } catch {
    return false;
  }
}

// ─── Stripe Form Data Helpers ─────────────────────────────────────────────────
function buildStripeFormData(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

function buildLineItemsFormData(lineItems) {
  const params = {};
  lineItems.forEach((item, i) => {
    params[`line_items[${i}][price_data][currency]`] = item.price_data.currency;
    params[`line_items[${i}][price_data][product_data][name]`] = item.price_data.product_data.name;
    params[`line_items[${i}][price_data][unit_amount]`] = item.price_data.unit_amount;
    params[`line_items[${i}][quantity]`] = item.quantity;
  });
  return params;
}
