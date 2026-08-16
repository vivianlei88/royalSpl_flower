/**
 * adminAI.ts — 後台全站統一 AI 請求工具
 * 所有後台頁面共用此模組，禁止在元件層直接調用 API
 */
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AdminAIOptions {
  messages: AIMessage[];
  page?: string;
  instruction?: string;
  stream?: false; // 後台預設非串流，直接返回結果
  onError?: (msg: string) => void;
}

export interface AdminAIResult {
  content: string;
  tokens_used: number;
}

// ── 節流控制 ─────────────────────────────────────────────────────────
let _lastCallTime = 0;
const THROTTLE_MS = 800;

function isThrottled(): boolean {
  const now = Date.now();
  if (now - _lastCallTime < THROTTLE_MS) return true;
  _lastCallTime = now;
  return false;
}

// ── 主請求函數 ────────────────────────────────────────────────────────
export async function sendAdminAI(options: AdminAIOptions): Promise<AdminAIResult | null> {
  if (isThrottled()) {
    toast.warning('操作太頻繁，請稍候再試');
    return null;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/doubao-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages: options.messages,
        page: options.page ?? window.location.pathname,
        instruction: options.instruction ?? '',
        stream: false,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error ?? `AI 請求失敗 (${res.status})`;
      if (options.onError) options.onError(msg);
      else toast.error(msg);
      return null;
    }

    return { content: data.content ?? '', tokens_used: data.tokens_used ?? 0 };
  } catch (e) {
    const msg = e instanceof Error
      ? (e.name === 'TimeoutError' ? 'AI 請求超時，請重試' : `網路錯誤：${e.message}`)
      : 'AI 服務暫時不可用';
    if (options.onError) options.onError(msg);
    else toast.error(msg);
    return null;
  }
}

// ── 業務快捷方法 ──────────────────────────────────────────────────────

/** 擴寫：把輸入文字擴展為更豐富的繁體中文描述 */
export function aiExpand(text: string, page?: string) {
  return sendAdminAI({
    messages: [{ role: 'user', content: `請擴寫以下文字，輸出繁體中文（香港用語），保留原意並豐富細節，150字以內：\n\n${text}` }],
    page,
    instruction: '擴寫',
  });
}

/** 精簡：壓縮文字至精華 */
export function aiSummarize(text: string, page?: string) {
  return sendAdminAI({
    messages: [{ role: 'user', content: `請精簡以下文字，輸出繁體中文（香港用語），保留核心要點，50字以內：\n\n${text}` }],
    page,
    instruction: '精簡',
  });
}

/** 潤色：提升文字質感 */
export function aiPolish(text: string, page?: string) {
  return sendAdminAI({
    messages: [{ role: 'user', content: `請潤色以下文字，輸出繁體中文（香港用語），使其更優雅精煉，長度與原文相近：\n\n${text}` }],
    page,
    instruction: '潤色',
  });
}

/** 轉英文：翻譯為英文 */
export function aiToEnglish(text: string, page?: string) {
  return sendAdminAI({
    messages: [{ role: 'user', content: `請將以下繁體中文翻譯為自然流暢的英文（適合香港花店品牌用語）：\n\n${text}` }],
    page,
    instruction: '轉英文',
  });
}

/** 生成 SEO 標題 */
export function aiSEOTitle(text: string, page?: string) {
  return sendAdminAI({
    messages: [{ role: 'user', content: `請根據以下商品/頁面資訊，生成一個 SEO 優化的繁體中文標題，60字以內，含核心關鍵詞：\n\n${text}` }],
    page,
    instruction: '生成SEO標題',
  });
}

/** 修正格式：清洗 CSV 文字、修正圖片 URL 分隔符 */
export function aiFixFormat(text: string, page?: string) {
  return sendAdminAI({
    messages: [{
      role: 'user',
      content: `請修正以下文字的格式問題：
1. 將圖片 URL 分隔符「;」統一替換為「|」
2. 清理多餘空格、換行
3. 確保 CSV 格式正確（如適用）
4. 輸出與輸入相同的結構，僅修正格式，不改變內容

輸入：\n${text}`,
    }],
    page,
    instruction: '修正格式',
  });
}

/** 批量清洗商品 CSV */
export function aiCleanProductCSV(csvText: string, page?: string) {
  return sendAdminAI({
    messages: [{
      role: 'user',
      content: `你是商品資料清洗助手。請對以下商品 CSV 進行清洗：
1. 圖片 URL 分隔符「;」改為「|」
2. 多餘引號、空格清理
3. 商品名稱/描述欄位如為空，標記為「待填寫」
4. 保持原有 CSV 欄位順序與表頭
5. 輸出標準 UTF-8 CSV 格式

CSV 內容：
\`\`\`
${csvText}
\`\`\``,
    }],
    page,
    instruction: '批量清洗商品CSV',
  });
}

/** 生成客服回覆 */
export function aiServiceReply(orderInfo: string, issue: string, page?: string) {
  return sendAdminAI({
    messages: [{
      role: 'user',
      content: `請以 Royalspl Flower 客服名義，為以下訂單問題撰寫繁體中文（香港用語）回覆，語氣溫暖專業，100-150字：

訂單資訊：${orderInfo}
顧客問題：${issue}`,
    }],
    page,
    instruction: '生成客服回覆',
  });
}

/** 使用預設模板生成 */
export function aiWithPreset(presetPrompt: string, userInput: string, page?: string) {
  return sendAdminAI({
    messages: [
      { role: 'system', content: presetPrompt },
      { role: 'user', content: userInput },
    ],
    page,
    instruction: '預設模板',
  });
}
