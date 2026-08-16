import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── 系統提示詞：香港專業花藝師人設 ─────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `你是 Royalspl Flower（皇家花藝）的專屬 AI 花藝顧問「花花」。
你精通香港送禮文化、中式及西式婚禮花藝，熟悉粵語表達方式，並以繁體中文服務顧客。

【人設特質】
- 專業優雅，語氣溫暖親切，如同對待閨蜜或親切的專業顧問
- 善用粵語詞彙（如：「唔使擔心」「花束好靚㗎」）但以繁體中文為主要回應語言
- 對花材特性、保鮮技巧、送禮場合有豐富知識
- 能協助撰寫贈卡心意文案，文字典雅溫情

【服務範圍】
1. 推薦適合的花束（根據場合、預算、對象）
2. 解答花材保鮮方法及護理指引
3. 說明配送規則及時間安排
4. 協助撰寫貼心的賀卡文案
5. 推介加購配件（緞帶、花瓶、賀卡等）
6. 如需人工協助，引導顧客至 WhatsApp：https://wa.me/85298765432

【回覆原則】
- 每次回覆簡潔有力，避免冗長，適當使用分點列示
- 推薦商品時必須基於商品資料庫的實際商品
- 不確定的資訊不猜測，引導顧客聯絡客服確認
- 涉及訂單及付款問題，一律轉介人工客服`;

// ── 從資料庫拉取知識庫上下文 ───────────────────────────────────────────────
async function buildKnowledgeContext(options: {
  productContext?: string;
  cartContext?: string;
}): Promise<string> {
  const parts: string[] = [];

  // 1. 當前瀏覽商品（由前端傳入）
  if (options.productContext) {
    parts.push(`【顧客正在瀏覽的商品】\n${options.productContext}`);
  }

  // 2. 購物車內容（由前端傳入）
  if (options.cartContext) {
    parts.push(`【顧客目前購物車】\n${options.cartContext}`);
  }

  // 3. 精選在售商品（最多 12 件）
  const { data: products } = await supabase
    .from("products")
    .select("name, english_name, price, description, flower_materials, style_tags, inventory_type, pre_order_days")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .limit(12);

  if (products && products.length > 0) {
    const productList = products.map((p) => {
      const name = p.name + (p.english_name ? ` (${p.english_name})` : "");
      const inventory = p.inventory_type === "pre_order"
        ? `預購 ${p.pre_order_days ?? ""}天`
        : "現貨";
      const materials = Array.isArray(p.flower_materials) ? p.flower_materials.join("、") : "";
      const tags = Array.isArray(p.style_tags) ? p.style_tags.join("、") : "";
      return `• ${name}｜HK$${p.price}｜${inventory}${materials ? `｜主花材：${materials}` : ""}${tags ? `｜風格：${tags}` : ""}`;
    }).join("\n");
    parts.push(`【在售商品（精選）】\n${productList}`);
  }

  // 4. 加購配件
  const { data: addons } = await supabase
    .from("addons")
    .select("name, description, price")
    .eq("is_active", true)
    .order("sort_order")
    .limit(8);

  if (addons && addons.length > 0) {
    const addonList = addons.map((a) =>
      `• ${a.name}｜HK$${a.price}${a.description ? `｜${a.description}` : ""}`
    ).join("\n");
    parts.push(`【可選加購配件】\n${addonList}`);
  }

  // 5. 配送規則（靜態知識）
  parts.push(`【配送規則】
• 香港島、九龍：免費配送
• 新界（大部分地區）：附加 HK$30 運費
• 偏遠地區（如離島）：需另行查詢
• 每日配送時段：10:00–13:00 / 14:00–18:00 / 19:00–21:00（夜間附加 HK$50）
• 訂單需於配送日前 2 天下單（特殊節日如情人節、母親節需提前 5 天）
• 如需即日花束，請透過 WhatsApp 查詢 (https://wa.me/85298765432)`);

  // 6. 保鮮指引（靜態知識）
  parts.push(`【花卉保鮮指引】
• 收花後立即剪去底部 1–2cm 斜切，插入清水花瓶
• 避免陽光直射及空調直吹，理想溫度 18–22°C
• 每 1–2 天換一次清水，同時重新修剪莖部
• 玫瑰花期約 5–7 天；百合約 7–10 天；繡球約 5–7 天
• 如出現花瓣異常脫落或異味，請聯絡我們確認`);

  return parts.join("\n\n");
}

// ── 主處理邏輯 ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: {
    messages: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
    productContext?: string;
    cartContext?: string;
  };

  try {
    body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("messages is required");
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "請求格式錯誤" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "伺服器配置錯誤" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // 建立知識庫上下文
  const knowledgeContext = await buildKnowledgeContext({
    productContext: body.productContext,
    cartContext: body.cartContext,
  });

  // 組合 system prompt + knowledge 作為第一條 user → model 對話
  const systemTurn = [
    {
      role: "user" as const,
      parts: [{
        text: `${BASE_SYSTEM_PROMPT}\n\n以下是你可以參考的最新資料（請基於此回答顧客問題，但不要直接引用格式）：\n\n${knowledgeContext}\n\n請確認你已了解以上資訊，並準備好以花花的身份服務顧客。`,
      }],
    },
    {
      role: "model" as const,
      parts: [{ text: "明白！我是 Royalspl Flower 的專屬花藝顧問花花，已準備好為您服務～有咩可以幫到您呢？💐" }],
    },
  ];

  const contents = [...systemTurn, ...body.messages];

  // 呼叫 Gemini SSE
  const upstream = await fetch(
    "https://app-des7uh9iwsu9-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ contents }),
    }
  );

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(
      JSON.stringify({ error: `上游服務錯誤：${upstream.status}` }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders,
    },
  });
});
