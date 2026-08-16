import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
  const [lang, setLang] = useState('zh-TW');

  // 目前僅為介面切換示範
  const toggleLang = (target: string) => {
    setLang(target);
    // 實作時可配合 i18n 或 localStorage
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切換語言">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleLang('zh-TW')} className={lang === 'zh-TW' ? 'bg-muted' : ''}>
          繁體中文
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleLang('en')} className={lang === 'en' ? 'bg-muted' : ''}>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}