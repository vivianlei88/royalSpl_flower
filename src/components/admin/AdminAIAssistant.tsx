/**
 * AdminAIAssistant — 後台全站懸浮 AI 助手
 * 模式1：右上角懸浮按鈕 → 全域對話彈窗
 * - 支援複製選中文字帶入
 * - 支援 CSV/TXT 批量上傳
 * - 對話歷史本地緩存（按帳號 key）
 * - 3 套業務預設提示詞
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, RotateCcw, Minimize2, Maximize2, Upload, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { sendAdminAI, type AIMessage } from '@/lib/adminAI';
import { useAuth } from '@/contexts/AuthContext';

const CACHE_PREFIX = 'admin_ai_chat_';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const PRESET_ACTIONS = [
  {
    label: '商品文案生成',
    category: 'product',
    prompt: '你是 Royalspl Flower 香港高端花藝品牌的專業文案撰稿師，請以繁體中文（香港用語）輸出，風格優雅精煉。',
  },
  {
    label: '客服話術撰寫',
    category: 'service',
    prompt: '你是 Royalspl Flower 的專業客服代表，請以繁體中文（香港用語）輸出，語氣溫暖專業，解決問題為先。',
  },
  {
    label: '行銷推文創作',
    category: 'marketing',
    prompt: '你是 Royalspl Flower 的品牌行銷文案師，請以繁體中文（香港用語）輸出，風格時尚，適合社交媒體。',
  },
];

const QUICK_PROMPTS = [
  '幫我為此商品生成一段 80 字的繁體中文描述',
  '生成一個 SEO 優化的繁體中文商品標題（60 字以內）',
  '把以下英文商品名稱翻譯為繁體中文（香港用語）：',
  '為此訂單問題撰寫一段溫暖的客服回覆：',
  '撰寫一段香港花店 Instagram 推廣帖文：',
  '清洗 CSV 圖片 URL（把 ; 分隔符改為 |）：',
];

export default function AdminAIAssistant() {
  const { user } = useAuth();
  const cacheKey = `${CACHE_PREFIX}${user?.id ?? 'anon'}`;

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) ?? '[]');
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<typeof PRESET_ACTIONS[0] | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步本地緩存
  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(messages.slice(-50)));
  }, [messages, cacheKey]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages, open, minimized]);

  // 擷取頁面選中文字並帶入
  const importSelection = useCallback(() => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) {
      setInput(prev => prev ? `${prev}\n\n${sel}` : sel);
      toast.success('已帶入選中文字');
      textareaRef.current?.focus();
    } else {
      toast.info('請先在頁面選中文字');
    }
  }, []);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history: AIMessage[] = messages.slice(-8).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    if (activePreset) {
      history.unshift({ role: 'system', content: activePreset.prompt });
    }
    history.push({ role: 'user', content: msg });

    const result = await sendAdminAI({ messages: history, page: window.location.pathname, instruction: msg.slice(0, 50) });
    setLoading(false);

    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.content, timestamp: Date.now() }]);
    }
  }, [input, loading, messages, activePreset]);

  const handleReset = () => {
    setMessages([]);
    localStorage.removeItem(cacheKey);
  };

  const copyLast = useCallback(() => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (last) {
      navigator.clipboard.writeText(last.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) { toast.error('文件大小不可超過 512KB'); return; }
    const text = await file.text();
    if (file.name.endsWith('.csv')) {
      setInput(`[CSV 檔案：${file.name}]\n${text.slice(0, 3000)}`);
      toast.success('CSV 已載入，可點擊「清洗 CSV」快捷處理');
    } else {
      setInput(text.slice(0, 3000));
      toast.success('文本已載入');
    }
    e.target.value = '';
  };

  return (
    <>
      {/* 懸浮觸發按鈕 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg hover:opacity-90 transition-all text-sm font-medium"
          aria-label="開啟 AI 助手"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:inline">AI 助手</span>
        </button>
      )}

      {/* 對話彈窗 */}
      {open && (
        <div
          className={`fixed z-50 flex flex-col bg-background border border-border rounded-xl shadow-2xl transition-all duration-200
            ${minimized
              ? 'bottom-4 right-4 w-64 h-12'
              : 'top-4 right-4 w-[420px] max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-h-[720px]'
            }`}
        >
          {/* 標題欄 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">AI 助手 · Gemini 2.5 Flash</span>
              {activePreset && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{activePreset.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={minimized ? () => setMinimized(false) : () => setMinimized(true)} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* 工具列 */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border shrink-0 flex-wrap">
                {/* 預設模式 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1">
                      模式 <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="text-[11px]">選擇業務預設模式</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs" onClick={() => setActivePreset(null)}>
                      ✦ 通用模式（不限場景）
                    </DropdownMenuItem>
                    {PRESET_ACTIONS.map(p => (
                      <DropdownMenuItem key={p.category} className="text-xs" onClick={() => setActivePreset(p)}>
                        {activePreset?.category === p.category ? '✓ ' : '  '}{p.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 帶入選中文字 */}
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={importSelection}>
                  選中文字帶入
                </Button>

                {/* 上傳檔案 */}
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-3 w-3" /> 上傳
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />

                {/* 複製最後一條回覆 */}
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1 ml-auto" onClick={copyLast} disabled={!messages.some(m => m.role === 'assistant')}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>

                {/* 清除對話 */}
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleReset}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>

              {/* 快捷指令 */}
              {messages.length === 0 && (
                <div className="px-3 pt-2 pb-0 shrink-0">
                  <p className="text-[11px] text-muted-foreground mb-1.5">快捷指令</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(p)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {p.slice(0, 16)}…
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 訊息區 */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words
                        ${m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                        }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* 輸入區 */}
              <div className="border-t border-border p-3 shrink-0">
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="輸入指令或問題…（Shift+Enter 換行）"
                    className="min-h-[60px] max-h-32 resize-none text-sm px-2"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
