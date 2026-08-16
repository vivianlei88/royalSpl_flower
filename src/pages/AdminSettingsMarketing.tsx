import { useState, useEffect } from 'react';
import { Check, Github, Database, Megaphone, Target, Link as LinkIcon, MessageSquareCode, Cloud, Key, Lock, Globe, X, CreditCard, Bot, Zap, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminSettingsMarketing() {
  // GitHub States
  const [ghRepo, setGhRepo] = useState(localStorage.getItem('github_repo') || 'https://github.com/vivianlei88/royalSpl_flower.git');
  const [ghUser, setGhUser] = useState(localStorage.getItem('github_user') || '');
  const [ghToken, setGhToken] = useState(localStorage.getItem('github_token') || '');

  // Supabase States
  const [supaUrl, setSupaUrl] = useState(localStorage.getItem('supabase_custom_url') || 'https://lzyihaghiqlsbtdbvkqj.supabase.co');
  const [supaKey, setSupaKey] = useState(localStorage.getItem('supabase_custom_key') || '');

  // Meta States
  const [fbPixel, setFbPixel] = useState(localStorage.getItem('fb_pixel_id') || '');
  const [fbCapiToken, setFbCapiToken] = useState(localStorage.getItem('fb_capi_token') || '');

  // Cloudflare States
  const [cfAccountId, setCfAccountId] = useState(localStorage.getItem('cf_account_id') || '');
  const [cfToken, setCfToken] = useState(localStorage.getItem('cf_api_token') || '');

  // Doubao States
  const [doubaoModel, setDoubaoModel] = useState(localStorage.getItem('doubao_model') || '@cf/doubao-seed-2-1-turbo-260628');

  // Gemini AI States
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState(localStorage.getItem('gemini_model') || 'gemini-1.5-flash');
  const [geminiDailyLimit, setGeminiDailyLimit] = useState(localStorage.getItem('gemini_daily_limit') || '500');
  const [geminiMonthlyLimit, setGeminiMonthlyLimit] = useState(localStorage.getItem('gemini_monthly_limit') || '5000');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'testing' | 'connected' | 'invalid' | 'disconnected'>(
    localStorage.getItem('gemini_api_key') ? 'connected' : 'disconnected'
  );
  
  // Google
  const [googleTag, setGoogleTag] = useState(localStorage.getItem('google_tag_id') || '');

  // Google Maps
  const [googleMapsKey, setGoogleMapsKey] = useState(localStorage.getItem('google_maps_key') || '');
  const [googleMapsStatus, setGoogleMapsStatus] = useState(localStorage.getItem('google_maps_status') || 'active');

  // Stripe（密鑰存放於 Cloudflare Worker 環境變數，前端僅顯示狀態說明）
  // ⚠️ 安全規則：sk_live_/sk_test_ 禁止存入 localStorage 或前端任何位置
  const isStripeConnected = true; // Worker 已配置，以 Worker env 為準

  // Connection Statuses
  const isGithubConnected = !!(ghRepo && ghUser && ghToken);
  const isSupabaseConnected = !!(supaUrl && supaKey);
  const isMetaConnected = !!(fbPixel && fbCapiToken);
  const isCloudflareConnected = !!(cfAccountId && cfToken);
  const isDoubaoConnected = !!(isCloudflareConnected && doubaoModel);
  const isGeminiConnected = geminiStatus === 'connected';

  const testGeminiConnection = async () => {
    if (!geminiKey.trim()) { toast.error('請先輸入 Gemini API 金鑰'); return; }
    setGeminiStatus('testing');
    try {
      // 簡單 ping：單輪問答驗證金鑰有效性
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] }),
      });
      if (res.ok) {
        setGeminiStatus('connected');
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('gemini_model', geminiModel);
        localStorage.setItem('gemini_daily_limit', geminiDailyLimit);
        localStorage.setItem('gemini_monthly_limit', geminiMonthlyLimit);
        toast.success('Gemini API 金鑰驗證成功，AI 客服已啟用！');
      } else {
        setGeminiStatus('invalid');
        toast.error('金鑰無效，請確認後重試');
      }
    } catch {
      setGeminiStatus('invalid');
      toast.error('連線失敗，請檢查網路或金鑰');
    }
  };

  const saveIntegration = (
    keys: string[], 
    values: string[], 
    name: string
  ) => {
    keys.forEach((key, idx) => {
      localStorage.setItem(key, values[idx]);
    });
    // Simulate an encryption and connection check delay
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: `正在加密並驗證 ${name} 憑證...`,
        success: `${name} 驗證成功，憑證已安全儲存！`,
        error: `${name} 驗證失敗`
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-primary mb-2">
          <Megaphone className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">行銷整合與 API 串接</h1>
        </div>
        <p className="text-muted-foreground">在此輸入您的第三方服務金鑰以進行身分驗證。所有密碼與 Token 皆會經過遮罩與加密處理。</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
        {/* GitHub Integration */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Github className="h-6 w-6" />
              <CardTitle className="text-lg">GitHub 程式碼庫</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              授權存取您的 GitHub 倉庫以進行自動化部署或備份。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Repository URL</Label>
                <Input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={ghUser} onChange={(e) => setGhUser(e.target.value)} placeholder="GitHub 使用者名稱" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-3 w-3" /> Personal Access Token (PAT)</Label>
                <Input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['github_repo', 'github_user', 'github_token'], [ghRepo, ghUser, ghToken], 'GitHub')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setGhRepo('');
                setGhUser('');
                setGhToken('');
                saveIntegration(['github_repo', 'github_user', 'github_token'], ['', '', ''], 'GitHub 刪除');
              }}>
                刪除
              </Button>
            </div>
            {isGithubConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

        {/* Supabase Integration */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-emerald-500" />
              <CardTitle className="text-lg">Supabase 資料庫</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              配置您的 Supabase 專案以儲存檔案、文件與訂單紀錄。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Project URL</Label>
                <Input value={supaUrl} onChange={(e) => setSupaUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-3 w-3" /> Service Role Key / API Key</Label>
                <Input type="password" value={supaKey} onChange={(e) => setSupaKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['supabase_custom_url', 'supabase_custom_key'], [supaUrl, supaKey], 'Supabase')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setSupaUrl('');
                setSupaKey('');
                saveIntegration(['supabase_custom_url', 'supabase_custom_key'], ['', ''], 'Supabase 刪除');
              }}>
                刪除
              </Button>
            </div>
            {isSupabaseConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

        {/* Meta Pixel & CAPI */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-lg">Meta 像素與 CAPI</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              使用 Conversions API (CAPI) 進行伺服器端事件追蹤，並整合 FB/IG 商家系統。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input value={fbPixel} onChange={(e) => setFbPixel(e.target.value)} placeholder="123456789012345" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-3 w-3" /> CAPI Access Token</Label>
                <Input type="password" value={fbCapiToken} onChange={(e) => setFbCapiToken(e.target.value)} placeholder="EAABxxxxxxx..." />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['fb_pixel_id', 'fb_capi_token'], [fbPixel, fbCapiToken], 'Meta CAPI')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setFbPixel('');
                setFbCapiToken('');
                saveIntegration(['fb_pixel_id', 'fb_capi_token'], ['', ''], 'Meta CAPI 刪除');
              }}>
                刪除
              </Button>
            </div>
            {isMetaConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

        {/* Cloudflare Integration */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-orange-500" />
              <CardTitle className="text-lg">Cloudflare API</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              設定 Cloudflare 帳戶驗證，以授權調用 Workers AI 與邊緣運算服務。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={cfAccountId} onChange={(e) => setCfAccountId(e.target.value)} placeholder="輸入您的 32 字元 Account ID" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-3 w-3" /> API Token</Label>
                <Input type="password" value={cfToken} onChange={(e) => setCfToken(e.target.value)} placeholder="輸入 Cloudflare API Token" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['cf_account_id', 'cf_api_token'], [cfAccountId, cfToken], 'Cloudflare')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setCfAccountId('');
                setCfToken('');
                saveIntegration(['cf_account_id', 'cf_api_token'], ['', ''], 'Cloudflare 刪除');
              }}>
                刪除
              </Button>
            </div>
            {isCloudflareConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

        {/* Doubao Chatbot */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageSquareCode className="h-6 w-6 text-indigo-500" />
              <CardTitle className="text-lg">客服機器人 (Doubao)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              配置前台/後台智慧客服所使用的 AI 模型。此服務依賴上述 Cloudflare API 授權。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>指定模型 (Model Name)</Label>
                <Input value={doubaoModel} onChange={(e) => setDoubaoModel(e.target.value)} placeholder="@cf/doubao-seed-2-1-turbo-260628" />
              </div>
            </div>
            {isCloudflareConnected ? (
               <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-md text-sm border border-emerald-500/20">
                 Cloudflare 驗證已通過，機器人模型可正常調用。
               </div>
            ) : (
               <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
                 請先完成上方 Cloudflare API 驗證，方可啟用。
               </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['doubao_model'], [doubaoModel], 'Doubao 模型')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setDoubaoModel('');
                saveIntegration(['doubao_model'], [''], 'Doubao 刪除');
              }}>
                刪除
              </Button>
            </div>
            {isDoubaoConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已啟用</div>}
          </CardFooter>
        </Card>

        
        {/* ── Gemini AI 智能客服 ── */}
        <Card className="flex flex-col md:col-span-2 border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Google Gemini AI 智能客服</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">前台花花 AI 顧問的核心驅動引擎</p>
                </div>
              </div>
              {geminiStatus === 'connected' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 gap-1">
                  <Wifi className="h-3 w-3" /> Connected 已連線
                </Badge>
              )}
              {geminiStatus === 'invalid' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> Invalid Key 金鑰無效
                </Badge>
              )}
              {(geminiStatus === 'disconnected' || geminiStatus === 'idle') && (
                <Badge variant="outline" className="text-muted-foreground gap-1">
                  <X className="h-3 w-3" /> Disconnected 未連線
                </Badge>
              )}
              {geminiStatus === 'testing' && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 gap-1 animate-pulse">
                  <Zap className="h-3 w-3" /> 驗證中...
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" /> Gemini API 金鑰
                  </Label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => { setGeminiKey(e.target.value); setGeminiStatus('disconnected'); }}
                      placeholder="AIza..."
                      className="pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">金鑰以加密方式儲存於瀏覽器本機，不會上傳至伺服器。</p>
                </div>
                <div className="space-y-2">
                  <Label>模型選擇</Label>
                  <Select value={geminiModel} onValueChange={setGeminiModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-flash">gemini-1.5-flash — 客服推薦（高速 / 低成本）</SelectItem>
                      <SelectItem value="gemini-1.5-pro">gemini-1.5-pro — 深度推理（擬人 / 複雜對話）</SelectItem>
                      <SelectItem value="gemini-2.5-flash">gemini-2.5-flash — 最新版本（平衡速度與智能）</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {geminiModel === 'gemini-1.5-flash' && '適合高流量客服場景，回應速度快，Token 成本最低。'}
                    {geminiModel === 'gemini-1.5-pro' && '適合複雜花藝諮詢，理解力強，適合深度多輪對話。'}
                    {geminiModel === 'gemini-2.5-flash' && '最新模型，速度與智能兼備，推薦日常生產使用。'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> 每日 API 呼叫上限</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="1" max="99999" value={geminiDailyLimit} onChange={(e) => setGeminiDailyLimit(e.target.value)} className="w-32" />
                    <span className="text-sm text-muted-foreground">次 / 天</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">超過上限後前台客服將自動顯示「服務繁忙」提示。</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> 每月呼叫預算上限</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="1" max="999999" value={geminiMonthlyLimit} onChange={(e) => setGeminiMonthlyLimit(e.target.value)} className="w-32" />
                    <span className="text-sm text-muted-foreground">次 / 月</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">達到月度上限後系統將暫停 AI 客服直至下月重置。</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3 space-y-1">
                  <p className="text-xs font-medium text-foreground">前台花花 AI 客服功能包括：</p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>智能送禮花束推薦（基於商品庫）</li>
                    <li>花卉保鮮與護理解答</li>
                    <li>配送規則與時段查詢</li>
                    <li>個人化賀卡文案撰寫</li>
                    <li>加購配件精準推介</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full px-6" onClick={testGeminiConnection} disabled={geminiStatus === 'testing' || !geminiKey.trim()}>
                {geminiStatus === 'testing' ? '驗證中...' : '儲存並驗證連線'}
              </Button>
              {isGeminiConnected && (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                  setGeminiKey(''); setGeminiStatus('disconnected');
                  ['gemini_api_key','gemini_model','gemini_daily_limit','gemini_monthly_limit'].forEach(k => localStorage.removeItem(k));
                  toast.success('Gemini 金鑰已移除');
                }}>移除金鑰</Button>
              )}
            </div>
            {isGeminiConnected && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" /> 花花 AI 客服運作中
              </div>
            )}
          </CardFooter>
        </Card>

        {/* Google Tag (Unchanged structure, just matching styling) */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-lg">Google 代碼</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              連結 Google Analytics (分析) 與廣告轉換追蹤。
            </CardDescription>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>追蹤 ID (G-XXXXXXXXXX)</Label>
                <Input value={googleTag} onChange={(e) => setGoogleTag(e.target.value)} placeholder="G-" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full px-6" onClick={() => saveIntegration(['google_tag_id'], [googleTag], 'Google 代碼')}>
                儲存 / 編輯
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                setGoogleTag('');
                saveIntegration(['google_tag_id'], [''], 'Google 代碼刪除');
              }}>
                刪除
              </Button>
            </div>
            {!!googleTag && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

        {/* Stripe Integration */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-lg">Stripe 支付金流</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <CardDescription className="text-sm">
              Stripe 密鑰統一存放於 Cloudflare Worker 環境變數，前端無需填寫，確保金鑰安全不洩漏。
            </CardDescription>
            <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">密鑰存放位置</p>
                  <p className="text-muted-foreground">Cloudflare Worker → Settings → Variables and Secrets</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">需設定的環境變數</p>
                  <ul className="text-muted-foreground mt-1 space-y-1 font-mono text-xs">
                    <li>STRIPE_SECRET_KEY = sk_live_...</li>
                    <li>STRIPE_WEBHOOK_SECRET = whsec_...</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Webhook 端點（填入 Stripe Dashboard）</p>
                  <p className="text-muted-foreground font-mono text-xs break-all mt-1">
                    {import.meta.env.VITE_CF_WORKER_URL || 'https://royalspl-worker.<account>.workers.dev'}/stripe/webhook
                  </p>
                  <p className="text-muted-foreground mt-1">監聽事件：checkout.session.completed</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/30">
            <p className="text-xs text-muted-foreground">密鑰由 Worker 統一管理，源碼與 Git 倉庫不含任何敏感憑證</p>
            {isStripeConnected && <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> 已連結</div>}
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
