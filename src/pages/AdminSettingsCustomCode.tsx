import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminSettingsCustomCode() {
  const [headerCode, setHeaderCode] = useState('');
  const [bodyCode, setBodyCode] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // In a real app, this would save to the database via API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    toast.success('自訂程式碼已儲存。');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">自訂程式碼</h1>
        <p className="text-muted-foreground">新增自訂程式碼片段至網站頁首或本文功能</p>
      </div>

      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">頁首 (Header) 程式碼</h2>
          <p className="text-sm text-muted-foreground">這些程式碼會被插入在 &lt;head&gt; 標籤內，適合放置追蹤碼或自訂樣式。</p>
          <Textarea 
            className="font-mono text-sm min-h-[200px]" 
            placeholder="<!-- 在這裡輸入 HTML 程式碼 -->" 
            value={headerCode}
            onChange={(e) => setHeaderCode(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">本文 (Body) 程式碼</h2>
          <p className="text-sm text-muted-foreground">這些程式碼會被插入在 &lt;body&gt; 標籤底部，適合放置額外的腳本。</p>
          <Textarea 
            className="font-mono text-sm min-h-[200px]" 
            placeholder="<!-- 在這裡輸入 HTML 程式碼 -->" 
            value={bodyCode}
            onChange={(e) => setBodyCode(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </div>
    </div>
  );
}
