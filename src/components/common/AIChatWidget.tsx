import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, RotateCcw, Loader2, Bot, User, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { streamChat } from '@/lib/aiChat';
import { useCart } from '@/contexts/CartContext';
import { useLocation } from 'react-router-dom';
import { Streamdown } from 'streamdown';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface Message {
  role: 'user' | 'model';
  text: string;
  streaming?: boolean;
}

const QUICK_ACTIONS = [
  { label: '💐 推薦送禮花束', prompt: '我想送花給朋友，可以幫我推薦適合的花束嗎？' },
  { label: '🌸 花卉保鮮方法', prompt: '請問鮮花收到後應該如何保存和護理？' },
  { label: '🚚 配送時間查詢', prompt: '請問你們的配送範圍和時間安排是怎樣的？' },
  { label: '💌 撰寫賀卡文案', prompt: '我想送花給媽媽作生日禮物，可以幫我寫一段心意文案嗎？' },
];

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { items } = useCart();
  const location = useLocation();

  // 派生值（非 hook，可安全放在 early return 之前）
  const isAdmin = location.pathname.startsWith('/admin');
  const cartContext = items.length > 0
    ? items.map(i => `• ${i.product.name} × ${i.quantity}（HK$${i.product.price}）`).join('\n')
    : undefined;
  const pdpMatch = location.pathname.match(/^\/products\/(.+)/);
  const productContext = pdpMatch ? `顧客正在瀏覽商品 slug：${pdpMatch[1]}` : undefined;

  // 自動捲到底部 — hook 必須在 early return 之前
  useEffect(() => {
    if (!isAdmin && open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open, minimized, isAdmin]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    const assistantMsg: Message = { role: 'model', text: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setLoading(true);

    // 建立對話歷史（排除 streaming placeholder）
    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    abortRef.current = new AbortController();

    await streamChat({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      messages: history,
      productContext,
      cartContext,
      onChunk: (chunk) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'model') {
            next[next.length - 1] = { ...last, text: last.text + chunk };
          }
          return next;
        });
      },
      onComplete: () => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'model') {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
        setLoading(false);
      },
      onError: () => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'model') {
            next[next.length - 1] = { ...last, text: '抱歉，服務暫時繁忙，請稍後再試或透過 WhatsApp 聯絡我們。', streaming: false };
          }
          return next;
        });
        setLoading(false);
      },
      signal: abortRef.current.signal,
    });
  }, [loading, messages, productContext, cartContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
    setMinimized(false);
  };

  // Early return AFTER all hooks — safe per Rules of Hooks
  if (isAdmin) return null;

  return (
    <>
      {/* 浮動按鈕 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="開啟 AI 客服"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`fixed right-6 z-50 flex flex-col rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 ${
            minimized ? 'bottom-6 h-14 w-80' : 'bottom-6 h-[600px] w-[380px] max-h-[90dvh]'
          } md:w-[400px]`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between rounded-t-2xl bg-foreground px-4 py-3 text-background">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">花花 AI 花藝顧問</p>
                <p className="mt-0.5 text-[11px] text-background/70">Royalspl Flower 智能客服</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(v => !v)}
                className="rounded-lg p-1.5 hover:bg-background/20 transition-colors"
                aria-label="縮小"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 hover:bg-background/20 transition-colors"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* 訊息區 */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                {/* 歡迎訊息 */}
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-3 text-sm text-foreground leading-relaxed">
                        你好！我係 Royalspl Flower 嘅專屬花藝顧問花花 💐<br />
                        無論係推薦花束、保鮮技巧定撰寫賀卡文案，都可以問我～
                      </div>
                    </div>
                    {/* 快速功能 */}
                    <div className="pl-9 space-y-1.5">
                      {QUICK_ACTIONS.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => sendMessage(a.prompt)}
                          disabled={loading}
                          className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 對話訊息 */}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                      msg.role === 'user' ? 'bg-foreground' : 'bg-muted'
                    }`}>
                      {msg.role === 'user'
                        ? <User className="h-3.5 w-3.5 text-background" />
                        : <Bot className="h-3.5 w-3.5 text-foreground" />
                      }
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-foreground text-background'
                        : 'rounded-tl-sm bg-muted text-foreground'
                    }`}>
                      {msg.role === 'model' ? (
                        msg.streaming ? (
                          <Streamdown parseIncompleteMarkdown isAnimating>
                            {msg.text || '▋'}
                          </Streamdown>
                        ) : (
                          <Streamdown>{msg.text}</Streamdown>
                        )
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && messages[messages.length - 1]?.text === '' && (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* 底部操作 */}
              <div className="shrink-0 border-t border-border px-3 py-3 space-y-2">
                {/* 快速功能（有訊息後縮小顯示） */}
                {messages.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => sendMessage(a.prompt)}
                        disabled={loading}
                        className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入訊息… (Enter 發送)"
                    rows={1}
                    className="min-h-[40px] max-h-[100px] flex-1 resize-none rounded-xl text-sm py-2.5 px-3 scrollbar-none"
                    disabled={loading}
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-xl shrink-0"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    {messages.length > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground"
                        onClick={handleReset}
                        title="重新開始對話"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* WhatsApp 轉接 */}
                <p className="text-center text-[10px] text-muted-foreground">
                  需要人工協助？
                  <a
                    href="https://wa.me/85298765432"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline hover:text-foreground transition-colors"
                  >
                    WhatsApp 聯絡我們
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
