/**
 * AdminAISettings — AI 用量管控頁
 * - 全局開關 + 每日上限設定
 * - 調用日誌即時展示（按帳號篩選）
 * - 預設提示詞 CRUD（3套業務模板可後台編輯）
 */
import { useState, useEffect, useCallback } from 'react';
import { Bot, Zap, Shield, FileText, ToggleLeft, ToggleRight, Trash2, Plus, Save, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

// ── 類型 ────────────────────────────────────────────────────────────
interface AISettingsRow {
  id: string;
  global_enabled: boolean;
  daily_limit_global: number;
  daily_limit_per_user: number;
  throttle_ms: number;
  max_concurrent: number;
}

interface AILog {
  id: string;
  user_email: string;
  page: string;
  instruction: string;
  tokens_used: number;
  duration_ms: number;
  status: string;
  error_msg?: string;
  created_at: string;
}

interface AIPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  is_active: boolean;
  sort_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  product: '商品文案',
  service: '客服話術',
  marketing: '行銷推文',
  custom: '自訂',
};

// ── 日誌狀態色 ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[11px]">成功</Badge>;
  if (status === 'throttled') return <Badge variant="outline" className="text-amber-600 border-amber-400 text-[11px]">限流</Badge>;
  return <Badge variant="destructive" className="text-[11px]">錯誤</Badge>;
}

export default function AdminAISettings() {
  // ── 全域設定狀態 ────────────────────────────────────────────────
  const [settings, setSettings] = useState<AISettingsRow | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── 日誌狀態 ────────────────────────────────────────────────────
  const [logs, setLogs] = useState<AILog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('all');

  // ── 預設提示詞 ───────────────────────────────────────────────────
  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [editPreset, setEditPreset] = useState<Partial<AIPreset> | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // ── 載入設定 ────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data } = await supabase.from('ai_settings').select('*').single();
    if (data) setSettings(data);
    setSettingsLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    let q = supabase
      .from('ai_logs')
      .select('id, user_email, page, instruction, tokens_used, duration_ms, status, error_msg, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (logFilter !== 'all') q = q.eq('status', logFilter);
    const { data } = await q;
    setLogs(data ?? []);
    setLogsLoading(false);
  }, [logFilter]);

  const loadPresets = useCallback(async () => {
    setPresetsLoading(true);
    const { data } = await supabase.from('ai_presets').select('*').order('sort_order');
    setPresets(data ?? []);
    setPresetsLoading(false);
  }, []);

  useEffect(() => { loadSettings(); loadLogs(); loadPresets(); }, [loadSettings, loadLogs, loadPresets]);
  useEffect(() => { loadLogs(); }, [logFilter, loadLogs]);

  // ── 儲存全域設定 ────────────────────────────────────────────────
  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('ai_settings')
      .update({
        global_enabled: settings.global_enabled,
        daily_limit_global: settings.daily_limit_global,
        daily_limit_per_user: settings.daily_limit_per_user,
        throttle_ms: settings.throttle_ms,
        max_concurrent: settings.max_concurrent,
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) toast.error('儲存失敗：' + error.message);
    else toast.success('AI 設定已儲存');
  };

  // ── 預設提示詞 CRUD ─────────────────────────────────────────────
  const openNewPreset = () => {
    setEditPreset({ name: '', category: 'custom', description: '', prompt: '', is_active: true, sort_order: presets.length });
    setEditOpen(true);
  };

  const openEditPreset = (p: AIPreset) => { setEditPreset({ ...p }); setEditOpen(true); };

  const savePreset = async () => {
    if (!editPreset?.name?.trim() || !editPreset?.prompt?.trim()) {
      toast.error('名稱與提示詞不可為空'); return;
    }
    if (editPreset.id) {
      const { error } = await supabase.from('ai_presets').update({
        name: editPreset.name, category: editPreset.category,
        description: editPreset.description, prompt: editPreset.prompt,
        is_active: editPreset.is_active, sort_order: editPreset.sort_order,
      }).eq('id', editPreset.id);
      if (error) { toast.error('更新失敗'); return; }
    } else {
      const { error } = await supabase.from('ai_presets').insert({
        name: editPreset.name, category: editPreset.category ?? 'custom',
        description: editPreset.description ?? '', prompt: editPreset.prompt,
        is_active: editPreset.is_active ?? true, sort_order: editPreset.sort_order ?? 0,
      });
      if (error) { toast.error('新增失敗'); return; }
    }
    toast.success('提示詞模板已儲存');
    setEditOpen(false);
    loadPresets();
  };

  const deletePreset = async (id: string) => {
    const { error } = await supabase.from('ai_presets').delete().eq('id', id);
    if (error) toast.error('刪除失敗');
    else { toast.success('已刪除'); loadPresets(); }
  };

  const togglePresetActive = async (p: AIPreset) => {
    await supabase.from('ai_presets').update({ is_active: !p.is_active }).eq('id', p.id);
    loadPresets();
  };

  // ── 日誌彙總 ────────────────────────────────────────────────────
  const totalTokens = logs.filter(l => l.status === 'success').reduce((s, l) => s + l.tokens_used, 0);
  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI 助手設定</h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理 doubao-seed-2-1-turbo-260628 用量限制、日誌與提示詞模板</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
          <Bot className="h-4 w-4" />
          火山方舟 Doubao
        </Badge>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="mb-4">
          <TabsTrigger value="settings" className="gap-1.5"><Shield className="h-3.5 w-3.5" />全局設定</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><Zap className="h-3.5 w-3.5" />調用日誌</TabsTrigger>
          <TabsTrigger value="presets" className="gap-1.5"><FileText className="h-3.5 w-3.5" />提示詞模板</TabsTrigger>
        </TabsList>

        {/* ── 全局設定 ── */}
        <TabsContent value="settings">
          {settingsLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">載入中…</div>
          ) : settings && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* 全站開關 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">全站 AI 功能</CardTitle>
                  <CardDescription>關閉後所有後台 AI 功能將立即停用</CardDescription>
                </CardHeader>
                <CardContent>
                  <button
                    onClick={() => setSettings({ ...settings, global_enabled: !settings.global_enabled })}
                    className="flex items-center gap-3 group"
                  >
                    {settings.global_enabled
                      ? <ToggleRight className="h-8 w-8 text-primary" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    }
                    <span className={`text-sm font-medium ${settings.global_enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                      {settings.global_enabled ? '已啟用' : '已停用'}
                    </span>
                  </button>
                </CardContent>
              </Card>

              {/* 每日用量上限 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">每日用量上限</CardTitle>
                  <CardDescription>超出上限後自動暫停 AI 功能至翌日重置</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">全站每日總上限（次）</Label>
                    <Input
                      type="number" min="1" max="99999"
                      value={settings.daily_limit_global}
                      onChange={e => setSettings({ ...settings, daily_limit_global: Number(e.target.value) })}
                      className="w-32 px-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">每帳號每日上限（次）</Label>
                    <Input
                      type="number" min="1" max="9999"
                      value={settings.daily_limit_per_user}
                      onChange={e => setSettings({ ...settings, daily_limit_per_user: Number(e.target.value) })}
                      className="w-32 px-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 並發與節流 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">並發與節流控制</CardTitle>
                  <CardDescription>防止多人同時調用造成費用暴增</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">最大並發請求數</Label>
                    <Input
                      type="number" min="1" max="20"
                      value={settings.max_concurrent}
                      onChange={e => setSettings({ ...settings, max_concurrent: Number(e.target.value) })}
                      className="w-24 px-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">前端節流間隔（毫秒）</Label>
                    <Input
                      type="number" min="200" max="5000"
                      value={settings.throttle_ms}
                      onChange={e => setSettings({ ...settings, throttle_ms: Number(e.target.value) })}
                      className="w-28 px-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* API 金鑰提示 */}
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-800">🔑 API 金鑰配置</CardTitle>
                  <CardDescription className="text-amber-700">
                    火山方舟 API Key 僅存放於 Supabase Edge Function 環境變量，前端不可見
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    請在 Supabase Dashboard → Project Settings → Edge Functions → Secrets 中設定：<br />
                    <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VOLCENGINE_ARK_API_KEY</code>
                  </p>
                </CardContent>
              </Card>

              <div className="md:col-span-2 flex justify-end">
                <Button onClick={saveSettings} disabled={saving} className="gap-2">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  儲存設定
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── 調用日誌 ── */}
        <TabsContent value="logs">
          <div className="space-y-4">
            {/* 彙總卡片 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '今日成功', value: successCount, color: 'text-emerald-600' },
                { label: '今日錯誤', value: errorCount, color: 'text-destructive' },
                { label: '今日 Tokens', value: totalTokens.toLocaleString(), color: 'text-primary' },
              ].map(s => (
                <Card key={s.label} className="text-center py-3">
                  <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </Card>
              ))}
            </div>

            {/* 篩選 + 刷新 */}
            <div className="flex items-center justify-between">
              <Select value={logFilter} onValueChange={setLogFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="error">錯誤</SelectItem>
                  <SelectItem value="throttled">限流</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadLogs} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> 刷新
              </Button>
            </div>

            {/* 日誌表 */}
            <div className="w-full overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">時間</TableHead>
                    <TableHead className="whitespace-nowrap">帳號</TableHead>
                    <TableHead className="whitespace-nowrap">頁面</TableHead>
                    <TableHead className="whitespace-nowrap">指令</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Tokens</TableHead>
                    <TableHead className="whitespace-nowrap text-right">耗時 ms</TableHead>
                    <TableHead className="whitespace-nowrap">狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">載入中…</TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">暫無日誌記錄</TableCell></TableRow>
                  ) : logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString('zh-HK')}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs max-w-[120px] truncate">{l.user_email}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs max-w-[100px] truncate">{l.page}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs max-w-[120px] truncate">{l.instruction}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-right">{l.tokens_used}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-right">{l.duration_ms}</TableCell>
                      <TableCell className="whitespace-nowrap"><StatusBadge status={l.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ── 預設提示詞模板 ── */}
        <TabsContent value="presets">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">管理全站 AI 預設提示詞，後台各頁面均可選用</p>
              <Button size="sm" onClick={openNewPreset} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> 新增模板
              </Button>
            </div>

            {presetsLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">載入中…</div>
            ) : (
              <div className="space-y-2">
                {presets.map(p => (
                  <Card key={p.id} className={`transition-opacity ${p.is_active ? '' : 'opacity-50'}`}>
                    <div className="flex items-start gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{p.name}</span>
                          <Badge variant="outline" className="text-[11px]">{CATEGORY_LABELS[p.category] ?? p.category}</Badge>
                          {!p.is_active && <Badge variant="secondary" className="text-[11px]">已停用</Badge>}
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono bg-muted/50 px-2 py-1 rounded">{p.prompt.slice(0, 100)}…</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => togglePresetActive(p)} title={p.is_active ? '停用' : '啟用'}>
                          {p.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditPreset(p)}>編輯</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deletePreset(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 編輯預設提示詞 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editPreset?.id ? '編輯提示詞模板' : '新增提示詞模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>模板名稱 *</Label>
                <Input value={editPreset?.name ?? ''} onChange={e => setEditPreset(p => ({ ...p!, name: e.target.value }))} placeholder="例：商品文案專用" className="px-2" />
              </div>
              <div className="space-y-1.5">
                <Label>分類</Label>
                <Select value={editPreset?.category ?? 'custom'} onValueChange={v => setEditPreset(p => ({ ...p!, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>描述（選填）</Label>
              <Input value={editPreset?.description ?? ''} onChange={e => setEditPreset(p => ({ ...p!, description: e.target.value }))} placeholder="這套模板適用於…" className="px-2" />
            </div>
            <div className="space-y-1.5">
              <Label>提示詞內容（System Prompt）*</Label>
              <Textarea value={editPreset?.prompt ?? ''} onChange={e => setEditPreset(p => ({ ...p!, prompt: e.target.value }))} rows={8} placeholder="輸入 System Prompt 內容…" className="px-2 font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={savePreset}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
