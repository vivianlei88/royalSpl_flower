import { useState, useEffect } from 'react';
import { Bot, X, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  position?: 'bottom-right' | 'top-right';
  title?: string;
}

export function ChatWidget({ position = 'bottom-right', title = '客服機器人' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '您好！我是您的專屬客服機器人，請問有什麼我可以協助您的嗎？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Connect to Cloudflare Worker Middle Layer for AI
  const WORKER_URL = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787';

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${WORKER_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'doubao-pro-32k',
          messages: [
            { role: 'system', content: 'You are a helpful assistant for Royalspl flower shop.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!response.ok) throw new Error('AI request failed');
      const data = await response.json();
      
      const reply = data.choices?.[0]?.message?.content || '抱歉，我現在無法回答。';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '抱歉，連線發生錯誤。' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'bottom-6 right-6' 
    : 'top-20 right-6';

  return (
    <div className={`fixed z-50 ${positionClasses}`}>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      ) : (
        <div className="flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 flex-row">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: '0.2s' }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入您的訊息..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
