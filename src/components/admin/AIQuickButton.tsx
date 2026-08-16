/**
 * AIQuickButton — 模式2：輸入框旁內嵌快捷 AI 按鈕
 * 使用方式：
 *   <AIQuickField label="商品描述" value={desc} onChange={setDesc} page="/admin/products" multiline />
 * 或 wrapper 模式（包裹現有 Input/Textarea）：
 *   <AIQuickWrapper value={v} onChange={setV} page="/admin/orders"><Input ... /></AIQuickWrapper>
 */
import { useState, useRef } from 'react';
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { sendAdminAI, type AdminAIOptions } from '@/lib/adminAI';

interface QuickAction {
  label: string;
  buildPrompt: (text: string) => string;
  instruction: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: '✦ 擴寫',
    instruction: '擴寫',
    buildPrompt: t => `請擴寫以下文字，輸出繁體中文（香港用語），保留原意並豐富細節，150字以內：\n\n${t}`,
  },
  {
    label: '✦ 精簡',
    instruction: '精簡',
    buildPrompt: t => `請精簡以下文字，輸出繁體中文（香港用語），保留核心要點，50字以內：\n\n${t}`,
  },
  {
    label: '✦ 潤色',
    instruction: '潤色',
    buildPrompt: t => `請潤色以下文字，輸出繁體中文（香港用語），使其更優雅精煉，長度與原文相近：\n\n${t}`,
  },
  {
    label: '✦ 轉英文',
    instruction: '轉英文',
    buildPrompt: t => `請將以下繁體中文翻譯為自然流暢的英文（適合香港花店品牌用語）：\n\n${t}`,
  },
  {
    label: '✦ 生成 SEO 標題',
    instruction: '生成SEO標題',
    buildPrompt: t => `請根據以下資訊生成一個 SEO 優化的繁體中文標題，60字以內，含核心關鍵詞：\n\n${t}`,
  },
  {
    label: '✦ 修正格式',
    instruction: '修正格式',
    buildPrompt: t => `請修正以下文字格式（圖片URL分隔符「;」改為「|」，清理多餘空格換行，確保CSV格式正確）：\n\n${t}`,
  },
];

// ── AIQuickField：完整的帶 Label 輸入框，含 AI 按鈕 ────────────────
interface AIQuickFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  page?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function AIQuickField({
  label, value, onChange, placeholder, page, multiline = false, rows = 4, disabled, className, inputClassName,
}: AIQuickFieldProps) {
  const [loading, setLoading] = useState(false);

  const run = async (action: QuickAction) => {
    if (!value.trim()) { toast.warning('請先輸入內容再使用 AI 功能'); return; }
    setLoading(true);
    const result = await sendAdminAI({
      messages: [{ role: 'user', content: action.buildPrompt(value) }],
      page: page ?? window.location.pathname,
      instruction: action.instruction,
    });
    setLoading(false);
    if (result?.content) {
      onChange(result.content);
      toast.success('AI 已回填內容');
    }
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <AIDropdown onSelect={run} loading={loading} hasValue={!!value.trim()} />
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || loading}
          className={`px-2 ${inputClassName ?? ''}`}
        />
      ) : (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          className={`px-2 ${inputClassName ?? ''}`}
        />
      )}
    </div>
  );
}

// ── AIQuickWrapper：包裹現有任意 Input/Textarea ────────────────────
interface AIQuickWrapperProps {
  value: string;
  onChange: (v: string) => void;
  page?: string;
  children: React.ReactNode;
  className?: string;
}

export function AIQuickWrapper({ value, onChange, page, children, className }: AIQuickWrapperProps) {
  const [loading, setLoading] = useState(false);

  const run = async (action: QuickAction) => {
    if (!value.trim()) { toast.warning('請先輸入內容再使用 AI 功能'); return; }
    setLoading(true);
    const result = await sendAdminAI({
      messages: [{ role: 'user', content: action.buildPrompt(value) }],
      page: page ?? window.location.pathname,
      instruction: action.instruction,
    });
    setLoading(false);
    if (result?.content) { onChange(result.content); toast.success('AI 已回填內容'); }
  };

  return (
    <div className={`relative flex items-start gap-1 ${className ?? ''}`}>
      <div className="flex-1 min-w-0">{children}</div>
      <AIDropdown onSelect={run} loading={loading} hasValue={!!value.trim()} compact />
    </div>
  );
}

// ── 共用下拉選單 ────────────────────────────────────────────────────
function AIDropdown({
  onSelect,
  loading,
  hasValue,
  compact = false,
}: {
  onSelect: (action: QuickAction) => void;
  loading: boolean;
  hasValue: boolean;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || !hasValue}
          className={`shrink-0 gap-1 text-xs ${compact ? 'h-9 w-9 p-0' : 'h-8 px-2'}`}
          title="AI 生成 / 優化"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5 text-primary" />
          }
          {!compact && !loading && <ChevronDown className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">AI 生成 / 優化</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_ACTIONS.map(a => (
          <DropdownMenuItem key={a.instruction} className="text-xs cursor-pointer" onClick={() => onSelect(a)}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
