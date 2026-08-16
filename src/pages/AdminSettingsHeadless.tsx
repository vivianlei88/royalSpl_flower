import { useState } from 'react';
import { Save, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSettingsHeadless() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Example predefined generated secret
  const generatedSecret = 'sec_live_1234567890abcdefghijklmnopqrstuvwxyz';

  async function handleSave() {
    setSaving(true);
    // In a real app, this would save to the database
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    toast.success('Headless 設定已儲存。');
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('已複製到剪貼簿');
  }

  function handleGenerateSecret() {
    setClientSecret(generatedSecret);
    toast.success('已產生新的 Client Secret');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Headless 設定</h1>
        <p className="text-muted-foreground">建立用戶端，以透過 OAuth 應用程式連結外部介面。您可輸入 clientID 並安裝 SDK，進行身份驗證並調用網站 API。</p>
      </div>

      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium border-b border-border pb-4">OAuth 應用程式憑證</h2>
        
        <div className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input 
              id="clientId"
              placeholder="輸入您的 Client ID，例如: my-external-app" 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">用於識別您的應用程式。</p>
          </div>

          <div className="space-y-2 pt-4">
            <Label>Client Secret</Label>
            <div className="flex gap-2">
              <Input 
                value={clientSecret}
                placeholder="尚未產生 Client Secret"
                readOnly
                type="password"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleCopy(clientSecret)}
                disabled={!clientSecret}
              >
                {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">請妥善保存此密鑰，它只會顯示一次。</p>
            {!clientSecret && (
              <Button type="button" variant="secondary" size="sm" onClick={handleGenerateSecret} className="mt-2">
                產生 Secret
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-md font-medium mb-4">SDK 安裝與使用</h3>
          <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto text-muted-foreground">
            <p># 1. 安裝 SDK</p>
            <p className="text-foreground">npm install @royalspl/sdk</p>
            <br />
            <p># 2. 初始化客戶端</p>
            <p className="text-foreground">import {'{ RoyalsplClient }'} from '@royalspl/sdk';</p>
            <br />
            <p className="text-foreground">const client = new RoyalsplClient({'{'}</p>
            <p className="text-foreground pl-4">clientId: '您的_CLIENT_ID',</p>
            <p className="text-foreground pl-4">clientSecret: '您的_CLIENT_SECRET'</p>
            <p className="text-foreground">{'}'});</p>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-border mt-6">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </div>
    </div>
  );
}
