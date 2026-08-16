/**
 * doubao-chat Edge Function
 * 透過平台 gateway 調用 Gemini 2.5 Flash（OpenAI 兼容格式不可用時退回原生格式）
 * 鑑權：INTEGRATIONS_API_KEY（platform_managed，由平台自動注入）
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let activeRequests = 0;
const MAX_CONCURRENT = 5;

// 平台 gateway — Gemini 2.5 Flash（非串流用 generateContent）
const GATEWAY_GENERATE = "https://app-des7uh9iwsu9-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:generateContent";
const GATEWAY_STREAM   = "https://app-des7uh9iwsu9-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

const SYSTEM_PROMPT = "你是 Royalspl Flower 香港花店的專業 AI 助理。請強制以繁體中文（香港用語）輸出所有回覆，風格精煉專業。";

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

async function checkDailyLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("global_enabled, daily_limit_global, daily_limit_per_user")
    .single();

  if (!settings?.global_enabled) {
    return { allowed: false, reason: "全站 AI 功能已暫停，請聯絡管理員" };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { count: userCount } = await supabase
    .from("ai_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("status", "success");

  if ((userCount ?? 0) >= (settings.daily_limit_per_user ?? 500)) {
    return { allowed: false, reason: `今日個人用量已達上限（${settings.daily_limit_per_user} 次），請明日再試` };
  }

  const { count: globalCount } = await supabase
    .from("ai_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00Z`)
    .eq("status", "success");

  if ((globalCount ?? 0) >= (settings.daily_limit_global ?? 5000)) {
    return { allowed: false, reason: "全站 AI 今日總用量已達上限，請明日再試" };
  }

  return { allowed: true };
}

async function logCall(params: {
  userId: string | null;
  userEmail: string;
  page: string;
  instruction: string;
  promptText?: string;
  resultText?: string;
  tokensUsed: number;
  durationMs: number;
  status: "success" | "error" | "throttled";
  errorMsg?: string;
}) {
  try {
    await supabase.from("ai_logs").insert({
      user_id: params.userId,
      user_email: params.userEmail,
      page: params.page,
      instruction: params.instruction,
      prompt_text: params.promptText?.slice(0, 2000),
      result_text: params.resultText?.slice(0, 2000),
      tokens_used: params.tokensUsed,
      duration_ms: params.durationMs,
      status: params.status,
      error_msg: params.errorMsg,
    });
  } catch (e) {
    console.error("ai_logs insert failed:", e);
  }
}

// 將 OpenAI messages 格式轉換為 Gemini contents 格式
function messagesToContents(messages: Array<{ role: string; content: string }>) {
  const systemMsg = messages.find(m => m.role === "system");
  const chatMsgs  = messages.filter(m => m.role !== "system");

  const systemText = systemMsg?.content
    ? `${SYSTEM_PROMPT}\n\n${systemMsg.content}`
    : SYSTEM_PROMPT;

  // Gemini 需要先有 user turn，用 system prompt 作為初始化對話
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
    { role: "user",  parts: [{ text: systemText + "\n\n請確認你已準備好以繁體中文服務。" }] },
    { role: "model", parts: [{ text: "明白，我已準備好以繁體中文（香港用語）為您提供專業協助。" }] },
  ];

  for (const msg of chatMsgs) {
    const role = msg.role === "assistant" ? "model" : "user";
    contents.push({ role, parts: [{ text: msg.content }] });
  }

  return contents;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method Not Allowed" }, 405);

  const startTime = Date.now();

  let body: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    page?: string;
    instruction?: string;
    stream?: boolean;
  };

  try {
    body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("messages is required");
    }
  } catch {
    return jsonResp({ error: "請求格式錯誤" }, 400);
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return jsonResp({ error: "伺服器配置錯誤：缺少 INTEGRATIONS_API_KEY" }, 500);
  }

  const user       = await getUserFromToken(req.headers.get("Authorization"));
  const userId     = user?.id ?? null;
  const userEmail  = user?.email ?? "anonymous";

  if (userId) {
    const { allowed, reason } = await checkDailyLimit(userId);
    if (!allowed) {
      await logCall({ userId, userEmail, page: body.page ?? "", instruction: body.instruction ?? "", tokensUsed: 0, durationMs: 0, status: "throttled", errorMsg: reason });
      return jsonResp({ error: reason, code: "QUOTA_EXCEEDED" }, 429);
    }
  }

  if (activeRequests >= MAX_CONCURRENT) {
    await logCall({ userId, userEmail, page: body.page ?? "", instruction: body.instruction ?? "", tokensUsed: 0, durationMs: 0, status: "throttled", errorMsg: "並發限制" });
    return jsonResp({ error: "請求繁忙，請稍後重試", code: "CONCURRENT_LIMIT" }, 429);
  }

  activeRequests++;
  let resultText = "";
  let tokensUsed = 0;

  try {
    const contents = messagesToContents(body.messages);

    const gatewayHeaders = {
      "Content-Type": "application/json",
      "X-Gateway-Authorization": `Bearer ${apiKey}`,
    };

    // 串流模式
    if (body.stream) {
      const upstream = await fetch(GATEWAY_STREAM, {
        method: "POST",
        headers: gatewayHeaders,
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!upstream.ok) {
        const errText = await upstream.text();
        throw new Error(`Gateway 串流錯誤 ${upstream.status}: ${errText}`);
      }

      setTimeout(() => logCall({
        userId, userEmail,
        page: body.page ?? "",
        instruction: body.instruction ?? "串流對話",
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        status: "success",
      }), 0);

      return new Response(upstream.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
          ...corsHeaders,
        },
      });
    }

    // 非串流模式：使用 generateContent
    const upstream = await fetch(GATEWAY_GENERATE, {
      method: "POST",
      headers: gatewayHeaders,
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      throw new Error(`Gateway 錯誤 ${upstream.status}: ${errText}`);
    }

    const result = await upstream.json();
    resultText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    tokensUsed = (result?.usageMetadata?.promptTokenCount ?? 0) + (result?.usageMetadata?.candidatesTokenCount ?? 0);

    await logCall({
      userId, userEmail,
      page: body.page ?? "",
      instruction: body.instruction ?? "",
      promptText: body.messages[body.messages.length - 1]?.content,
      resultText,
      tokensUsed,
      durationMs: Date.now() - startTime,
      status: "success",
    });

    return jsonResp({ content: resultText, tokens_used: tokensUsed });

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    await logCall({
      userId, userEmail,
      page: body.page ?? "",
      instruction: body.instruction ?? "",
      tokensUsed,
      durationMs: Date.now() - startTime,
      status: "error",
      errorMsg,
    });

    let userMsg = "AI 服務暫時不可用，請稍後重試";
    if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("rate")) userMsg = "AI 接口限流，請稍後重試";
    else if (errorMsg.toLowerCase().includes("timeout") || errorMsg.toLowerCase().includes("abort")) userMsg = "AI 請求超時，請重試";

    return jsonResp({ error: userMsg, detail: errorMsg, code: "AI_ERROR" }, 502);
  } finally {
    activeRequests--;
  }
});
