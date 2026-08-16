import { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  LayoutTemplate, ClipboardList, Receipt, Mail,
  Save, Image as ImageIcon, Store, Phone, MapPin,
  CheckCircle2, Loader2, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { getShopProfile, updateShopProfileBatch, uploadProductImage } from '@/services/api';

// ── 工具：圖片壓縮 ──
async function compressImage(file: File, maxBytes = 1024 * 1024): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= maxBytes) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDim = 1920;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }
          if (blob.size <= maxBytes || quality <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, 'image/webp', quality);
      };
      tryCompress();
    };
    img.src = url;
  });
}

// ── 前台模板體系 ──
const TEMPLATES = [
  { id: 'minimal',  name: '簡約現代', desc: '留白克制，高質感花藝展示。',        color: 'bg-slate-100',   border: 'border-slate-200' },
  { id: 'elegant',  name: '情人節奢華版', desc: '柔和玫瑰色，浪漫古典形象。',    color: 'bg-rose-50',     border: 'border-rose-200' },
  { id: 'vibrant',  name: '母親節暖心版', desc: '溫暖活力，節慶感強。',           color: 'bg-amber-50',    border: 'border-amber-200' },
  { id: 'dark',     name: '深色尊爵版', desc: '深色主題，凸顯花色對比。',         color: 'bg-slate-800',   border: 'border-slate-700', textClass: 'text-white' },
  { id: 'nature',   name: '自然清新版', desc: '大地色系，有機環保美感。',          color: 'bg-emerald-50',  border: 'border-emerald-200' },
];

// ── Hero 配置結構 (每套模板獨立) ──
interface HeroConfig {
  desktop_banner: string;
  mobile_banner: string;
  slogan_main: string;
  slogan_sub: string;
  brand_story: string;
  cta_label_zh: string;
  cta_label_en: string;
  cta_link: string;
  gallery_1: string; gallery_2: string; gallery_3: string;
  gallery_4: string; gallery_5: string; gallery_6: string;
  campaign_banner: string;
}

const EMPTY_HERO: HeroConfig = {
  desktop_banner: '', mobile_banner: '',
  slogan_main: '', slogan_sub: '', brand_story: '',
  cta_label_zh: '立即選購', cta_label_en: 'Shop Now', cta_link: '/products',
  gallery_1: '', gallery_2: '', gallery_3: '', gallery_4: '', gallery_5: '', gallery_6: '',
  campaign_banner: '',
};

// ── 模板管理分頁 ──
function TemplateTab() {
  const [active, setActive] = useState('minimal');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [heroMap, setHeroMap] = useState<Record<string, HeroConfig>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    getShopProfile().then(data => {
      setActive(data.active_template || 'minimal');
      // Load saved template content
      const map: Record<string, HeroConfig> = {};
      TEMPLATES.forEach(t => {
        const prefix = `tpl_${t.id}_`;
        const cfg: HeroConfig = { ...EMPTY_HERO };
        Object.keys(EMPTY_HERO).forEach(k => {
          if (data[prefix + k]) cfg[k as keyof HeroConfig] = data[prefix + k];
        });
        map[t.id] = cfg;
      });
      setHeroMap(map);
    });
  }, []);

  function getHero(id: string): HeroConfig {
    return heroMap[id] ?? { ...EMPTY_HERO };
  }

  function setHero(id: string, patch: Partial<HeroConfig>) {
    setHeroMap(prev => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_HERO), ...patch } }));
  }

  async function handleActivate(id: string) {
    setSaving(true);
    const { updateShopProfileBatch: batch } = await import('@/services/api');
    const ok = await batch({ active_template: id });
    if (ok) { setActive(id); toast.success('已切換啟用模板'); }
    else toast.error('切換失敗');
    setSaving(false);
  }

  async function handleSaveHero(id: string) {
    setSaving(true);
    const hero = getHero(id);
    const prefix = `tpl_${id}_`;
    const entries: Record<string, string> = {};
    (Object.keys(hero) as (keyof HeroConfig)[]).forEach(k => {
      entries[prefix + k] = hero[k];
    });
    const { updateShopProfileBatch: batch } = await import('@/services/api');
    const ok = await batch(entries);
    if (ok) toast.success(`已儲存「${TEMPLATES.find(t => t.id === id)?.name}」模板內容`);
    else toast.error('儲存失敗');
    setSaving(false);
  }

  async function handleUploadImage(templateId: string, field: keyof HeroConfig, file: File) {
    const key = `${templateId}_${field}`;
    setUploadingKey(key);
    const compressed = await compressImage(file);
    const filename = `template-${templateId}-${field}-${Date.now()}.webp`;
    const url = await uploadProductImage(compressed, filename);
    setUploadingKey(null);
    if (url) {
      setHero(templateId, { [field]: url } as Partial<HeroConfig>);
      toast.success('圖片已上傳');
    } else {
      toast.error('圖片上傳失敗');
    }
  }

  const sel = selectedTemplate;

  return (
    <div className="space-y-8">
      {/* ─ 5 套模板卡片 ─ */}
      <div>
        <h2 className="text-base font-semibold mb-1">模板切換控制台</h2>
        <p className="text-sm text-muted-foreground mb-4">點選「設為啟用」即時切換前台套用的模板版型，點選「設定內容」配置各模板的圖片與文字。</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TEMPLATES.map(t => {
            const isActive = active === t.id;
            const isSelected = sel === t.id;
            return (
              <div key={t.id} className={`relative rounded-xl border-2 overflow-hidden flex flex-col transition-all ${isActive ? 'border-primary shadow-sm' : isSelected ? 'border-muted-foreground' : 'border-border bg-card hover:border-muted-foreground/50'}`}>
                <div className={`h-24 flex items-center justify-center ${t.color} border-b ${t.border}`}>
                  <LayoutTemplate className={`h-8 w-8 ${t.textClass ?? 'text-muted-foreground'}`} />
                </div>
                {isActive && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> 啟用中
                  </div>
                )}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground flex-1">{t.desc}</p>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {!isActive && (
                      <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => handleActivate(t.id)} disabled={saving}>
                        設為啟用
                      </Button>
                    )}
                    <Button size="sm" variant={isSelected ? 'default' : 'secondary'} className="w-full text-xs h-7" onClick={() => setSelectedTemplate(isSelected ? null : t.id)}>
                      {isSelected ? '收起設定' : '設定內容'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─ 展開的獨立內容設定面板 ─ */}
      {sel && (() => {
        const t = TEMPLATES.find(x => x.id === sel)!;
        const hero = getHero(sel);
        return (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">「{t.name}」模板內容設定</CardTitle>
              <CardDescription>以下設定僅在此模板啟用時生效。每套模板各自獨立配置。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Banner 圖片 */}
              <section className="space-y-4">
                <h3 className="font-medium text-sm flex items-center gap-2 border-b pb-2"><ImageIcon className="h-4 w-4" /> Hero 主視覺 Banner</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([['desktop_banner','桌機版 Banner'], ['mobile_banner','手機版 Banner']] as const).map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-xs">{label}</Label>
                      {hero[field] && <img src={hero[field]} alt={label} className="w-full h-28 object-cover rounded-lg border border-border" />}
                      <div className="flex gap-2">
                        <Input placeholder="圖片 URL" value={hero[field]} onChange={e => setHero(sel, { [field]: e.target.value } as any)} className="text-xs" />
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild disabled={uploadingKey === `${sel}_${field}`}>
                            <span>{uploadingKey === `${sel}_${field}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}</span>
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(sel, field, f); }} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6 欄藝廊 */}
              <section className="space-y-4">
                <h3 className="font-medium text-sm flex items-center gap-2 border-b pb-2"><ImageIcon className="h-4 w-4" /> 6 欄藝廊區塊圖片</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {([1,2,3,4,5,6] as const).map(n => {
                    const field = `gallery_${n}` as keyof HeroConfig;
                    return (
                      <div key={n} className="space-y-1.5">
                        <Label className="text-xs">藝廊 {n}</Label>
                        {hero[field] && <img src={hero[field]} alt={`藝廊 ${n}`} className="w-full h-20 object-cover rounded border border-border" />}
                        <div className="flex gap-1">
                          <Input placeholder="URL" value={hero[field]} onChange={e => setHero(sel, { [field]: e.target.value } as any)} className="text-xs" />
                          <label className="cursor-pointer shrink-0">
                            <Button variant="outline" size="sm" asChild disabled={uploadingKey === `${sel}_${field}`}>
                              <span>{uploadingKey === `${sel}_${field}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                            </Button>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(sel, field, f); }} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 活動推廣圖 */}
              <section className="space-y-3">
                <h3 className="font-medium text-sm flex items-center gap-2 border-b pb-2"><ImageIcon className="h-4 w-4" /> 活動/節慶推廣圖</h3>
                {hero.campaign_banner && <img src={hero.campaign_banner} alt="推廣圖" className="w-full h-28 object-cover rounded-lg border border-border" />}
                <div className="flex gap-2">
                  <Input placeholder="圖片 URL" value={hero.campaign_banner} onChange={e => setHero(sel, { campaign_banner: e.target.value })} />
                  <label className="cursor-pointer shrink-0">
                    <Button variant="outline" size="sm" asChild disabled={uploadingKey === `${sel}_campaign_banner`}>
                      <span>{uploadingKey === `${sel}_campaign_banner` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(sel, 'campaign_banner', f); }} />
                  </label>
                </div>
              </section>

              {/* 文字內容 */}
              <section className="space-y-4">
                <h3 className="font-medium text-sm flex items-center gap-2 border-b pb-2"><Store className="h-4 w-4" /> 文字與 CTA 設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">品牌主標題 (Slogan)</Label>
                    <Input value={hero.slogan_main} onChange={e => setHero(sel, { slogan_main: e.target.value })} placeholder="為每份心意，捕捉永恆之美" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">品牌副標題</Label>
                    <Input value={hero.slogan_sub} onChange={e => setHero(sel, { slogan_sub: e.target.value })} placeholder="香港花藝 · 精品花禮" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">品牌故事文案</Label>
                    <Textarea value={hero.brand_story} onChange={e => setHero(sel, { brand_story: e.target.value })} rows={3} placeholder="品牌理念與故事..." className="resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CTA 按鈕文字（中文）</Label>
                    <Input value={hero.cta_label_zh} onChange={e => setHero(sel, { cta_label_zh: e.target.value })} placeholder="立即選購" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CTA 按鈕文字（英文）</Label>
                    <Input value={hero.cta_label_en} onChange={e => setHero(sel, { cta_label_en: e.target.value })} placeholder="Shop Now" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">CTA 跳轉鏈接（可填商品 ID、分類 Slug 或外部 URL）</Label>
                    <Input value={hero.cta_link} onChange={e => setHero(sel, { cta_link: e.target.value })} placeholder="/products 或 /festival-occasions" />
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <Button onClick={() => handleSaveHero(sel)} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  儲存此模板設定
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

// ── 訂單模板分頁 ──
function OrderTemplateTab() {
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getShopProfile().then(setProfile); }, []);

  function set(key: string, val: string) { setProfile(prev => ({ ...prev, [key]: val })); }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const compressed = await compressImage(file);
    const url = await uploadProductImage(compressed, `shop-logo-${Date.now()}.webp`);
    setUploadingLogo(false);
    if (url) { set('shop_logo', url); toast.success('Logo 已上傳'); }
    else toast.error('上傳失敗');
  }

  async function handleSave() {
    setSaving(true);
    const ok = await updateShopProfileBatch({
      shop_logo:    profile.shop_logo    || '',
      shop_name:    profile.shop_name    || '',
      shop_address: profile.shop_address || '',
      shop_phone:   profile.shop_phone   || '',
      shop_email:   profile.shop_email   || '',
      shop_website: profile.shop_website || '',
      order_template_note: profile.order_template_note || '',
    });
    if (ok) toast.success('訂單模板資料已儲存'); else toast.error('儲存失敗');
    setSaving(false);
  }

  const FIELDS: [string, string, string][] = [
    ['order_code',           '1. 訂單編號 (Order Code)',                    '系統自動產生，展示於模板頂部'],
    ['creation_date',        '2. 成立日期 (Creation Date)',                 '訂單建立時自動填入'],
    ['delivery_date',        '3. 送貨日期時間 (Delivery Date & Time Slot)', '顧客填寫'],
    ['customer_name',        '4. 訂購人姓名 (Customer Name)',               '顧客填寫'],
    ['customer_phone',       '5. 電話 / WhatsApp',                          '顧客填寫'],
    ['customer_email',       '6. Email',                                    '顧客填寫'],
    ['order_remarks',        '7. 備註 (Remarks)',                           '顧客選填'],
    ['recipient_name',       '8. 收件人姓名',                               '顧客填寫'],
    ['recipient_phone',      '9. 收件人電話',                               '顧客填寫'],
    ['recipient_address',    '10. 收件人地址',                              '顧客填寫'],
    ['greeting_card',        '11. 心意卡內容',                             '顧客選填'],
    ['items_display',        '12. 訂購商品展示（名稱、單價、數量、小計）',  '自動從訂單資料生成'],
    ['shipping_fee',         '13. 運費',                                    '自動計算'],
    ['total_price',          '14. 總價',                                    '自動計算'],
  ];

  return (
    <div className="space-y-6">
      {/* 店鋪資料 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> 店鋪資料（印於訂單抬頭）</CardTitle>
          <CardDescription>以下資料會顯示在訂單模板、收據及郵件的頭部。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-xs">店鋪 Logo</Label>
            <div className="flex items-center gap-4">
              {profile.shop_logo
                ? <img src={profile.shop_logo} alt="Logo" className="h-16 w-16 rounded-lg object-contain border border-border" />
                : <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">無圖</div>
              }
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" disabled={uploadingLogo} onClick={() => fileRef.current?.click()}>
                  {uploadingLogo ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  上傳 Logo
                </Button>
                <p className="text-xs text-muted-foreground">建議 512×512px，PNG/WEBP，1MB 以內</p>
              </div>
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value=''; }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['shop_name',    '店鋪名稱', 'Royalspl Floral Studio'],
              ['shop_phone',   '聯繫電話 / WhatsApp', '+852 XXXX XXXX'],
              ['shop_email',   '聯繫 Email', 'hello@royalspl.com'],
              ['shop_website', '網站 URL', 'https://royalspl.com'],
            ] as const).map(([key, label, ph]) => (
              <div key={key} className="space-y-2">
                <Label className="text-xs">{label}</Label>
                <Input value={profile[key] || ''} onChange={e => set(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">店鋪地址</Label>
              <Input value={profile.shop_address || ''} onChange={e => set('shop_address', e.target.value)} placeholder="香港九龍旺角花街 XX 號" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">訂單備注欄位說明（印於模板底部）</Label>
              <Textarea value={profile.order_template_note || ''} onChange={e => set('order_template_note', e.target.value)} rows={2} placeholder="例如：如需更改訂單，請於下單後 2 小時內聯絡我們。" className="resize-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 訂單欄位一覽 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> 訂單欄位結構（共 14 項）</CardTitle>
          <CardDescription>以下欄位將依序展示於訂單模板中，系統自動填充或由顧客提供。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {FIELDS.map(([, label, hint]) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          儲存訂單模板設定
        </Button>
      </div>
    </div>
  );
}

// ── 收據模板分頁 ──
function ReceiptTemplateTab() {
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { getShopProfile().then(setProfile); }, []);
  function set(key: string, val: string) { setProfile(prev => ({ ...prev, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    const ok = await updateShopProfileBatch({
      shop_logo:    profile.shop_logo    || '',
      shop_name:    profile.shop_name    || '',
      shop_address: profile.shop_address || '',
      shop_phone:   profile.shop_phone   || '',
      receipt_template_note: profile.receipt_template_note || '',
    });
    if (ok) toast.success('收據模板已儲存'); else toast.error('儲存失敗');
    setSaving(false);
  }

  const receiptHtml = `
<!DOCTYPE html><html lang="zh-HK"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:'Noto Serif TC',serif;font-size:13px;color:#222;margin:0;padding:24px;max-width:560px}
  .header{display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid #ccc;margin-bottom:16px}
  .logo{width:60px;height:60px;object-fit:contain}
  .logo-placeholder{width:60px;height:60px;background:#f0ede8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa}
  .shop-info h1{font-size:16px;margin:0 0 4px}
  .shop-info p{margin:0;font-size:12px;color:#666}
  .title{text-align:center;font-size:15px;font-weight:bold;margin:0 0 16px;letter-spacing:2px}
  .meta{display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{text-align:left;font-size:12px;padding:6px 8px;border-bottom:1px solid #ccc;font-weight:600}
  td{padding:6px 8px;font-size:12px;border-bottom:1px solid #eee}
  .total-row td{font-weight:bold;border-top:1px solid #ccc;border-bottom:none}
  .note{font-size:11px;color:#999;margin-top:16px;border-top:1px dashed #ccc;padding-top:12px}
  .footer{text-align:center;font-size:11px;color:#bbb;margin-top:24px}
</style></head><body>
<div class="header">
  ${profile.shop_logo ? `<img class="logo" src="${profile.shop_logo}" alt="Logo">` : '<div class="logo-placeholder">LOGO</div>'}
  <div class="shop-info">
    <h1>${profile.shop_name || 'Royalspl Floral Studio'}</h1>
    <p>${profile.shop_address || '香港'}</p>
    <p>${profile.shop_phone || ''} ${profile.shop_email ? '| ' + profile.shop_email : ''}</p>
  </div>
</div>
<div class="title">花 藝 收 據</div>
<div class="meta">
  <span>收據編號：RCPT-20260801-001</span>
  <span>日期：2026年8月1日</span>
</div>
<table>
  <thead><tr><th>商品名稱</th><th>單價</th><th>數量</th><th>小計</th></tr></thead>
  <tbody>
    <tr><td>法式玫瑰花束</td><td>HK$580</td><td>1</td><td>HK$580</td></tr>
    <tr><td>緞帶包裝</td><td>HK$50</td><td>1</td><td>HK$50</td></tr>
    <tr><td colspan="3" style="text-align:right">運費</td><td>HK$80</td></tr>
    <tr class="total-row"><td colspan="3" style="text-align:right">總計</td><td>HK$710</td></tr>
  </tbody>
</table>
${profile.receipt_template_note ? `<div class="note">${profile.receipt_template_note}</div>` : ''}
<div class="footer">感謝您的惠顧 · ${profile.shop_name || 'Royalspl'}</div>
</body></html>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> 收據模板設定</CardTitle>
          <CardDescription>收據套用 HTML/CSS 格式，可匯出為 A5 PDF。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">店鋪 Logo、名稱、地址、電話已從「訂單模板」共用，如需更改請前往「訂單模板」分頁。</p>
          <div className="space-y-2">
            <Label className="text-xs">收據底部附加說明（退換貨政策、感謝語等）</Label>
            <Textarea
              value={profile.receipt_template_note || ''}
              onChange={e => set('receipt_template_note', e.target.value)}
              rows={3}
              placeholder="例如：所有花藝訂單於確認後不接受退款。如對商品有任何疑問，請於收貨後 24 小時內聯絡我們。"
              className="resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setPreviewOpen(v => !v)}>
              {previewOpen ? '收起預覽' : '預覽收據模板'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存收據設定
            </Button>
          </div>
          {previewOpen && (
            <div className="rounded-lg border border-border overflow-hidden bg-white">
              <div className="bg-muted px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>收據預覽（A5 尺寸示意）</span>
              </div>
              <iframe
                srcDoc={receiptHtml}
                className="w-full"
                style={{ height: '520px', border: 'none' }}
                title="收據預覽"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 郵件模板分頁 ──
function EmailTemplateTab() {
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { getShopProfile().then(setProfile); }, []);
  function set(key: string, val: string) { setProfile(prev => ({ ...prev, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    const ok = await updateShopProfileBatch({
      email_template_subject: profile.email_template_subject || '',
      email_template_body:    profile.email_template_body    || '',
    });
    if (ok) toast.success('郵件模板已儲存'); else toast.error('儲存失敗');
    setSaving(false);
  }

  const PLACEHOLDERS = [
    { tag: '{{order_code}}',    desc: '訂單編號' },
    { tag: '{{customer_name}}', desc: '訂購人姓名' },
    { tag: '{{delivery_date}}', desc: '送貨日期' },
    { tag: '{{items_list}}',    desc: '商品清單' },
    { tag: '{{total_price}}',   desc: '總價' },
    { tag: '{{shop_name}}',     desc: '店鋪名稱' },
    { tag: '{{shop_phone}}',    desc: '店鋪電話' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> 郵件通知模板</CardTitle>
          <CardDescription>設定發送給顧客的訂單確認郵件主旨與內文，支援動態變數。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs">郵件主旨</Label>
            <Input
              value={profile.email_template_subject || ''}
              onChange={e => set('email_template_subject', e.target.value)}
              placeholder="【{{shop_name}}】訂單確認 - 訂單編號 {{order_code}}"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">郵件內文（支援 HTML 或純文字）</Label>
            <Textarea
              value={profile.email_template_body || ''}
              onChange={e => set('email_template_body', e.target.value)}
              rows={12}
              placeholder={`親愛的 {{customer_name}}，\n\n感謝您向 {{shop_name}} 訂購花禮！\n\n您的訂單已確認，詳情如下：\n訂單編號：{{order_code}}\n送貨日期：{{delivery_date}}\n\n訂購商品：\n{{items_list}}\n\n總價：{{total_price}}\n\n如有任何問題，請聯絡我們：{{shop_phone}}\n\n謹此，\n{{shop_name}} 團隊`}
              className="resize-none font-mono text-xs"
            />
          </div>

          {/* 變數標籤參考 */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-medium text-foreground">可用動態變數</p>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map(p => (
                <div key={p.tag} className="flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1">
                  <code className="text-xs text-primary">{p.tag}</code>
                  <span className="text-xs text-muted-foreground">— {p.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              儲存郵件模板
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 主頁面（4 分頁） ──
export default function AdminForms() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">前台模板與主題設定</h1>
        <p className="text-sm text-muted-foreground mt-1">管理 5 套前台模板、訂單/收據模板及郵件通知設定。</p>
      </div>

      <Tabs defaultValue="template" className="space-y-6">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <LayoutTemplate className="h-3.5 w-3.5" /> 模板切換與設定
          </TabsTrigger>
          <TabsTrigger value="order" className="flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5" /> 訂單模板
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5" /> 收據模板
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> 郵件模板
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template"><TemplateTab /></TabsContent>
        <TabsContent value="order"><OrderTemplateTab /></TabsContent>
        <TabsContent value="receipt"><ReceiptTemplateTab /></TabsContent>
        <TabsContent value="email"><EmailTemplateTab /></TabsContent>
      </Tabs>
    </div>
  );
}