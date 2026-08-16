import { useEffect, useState, useCallback } from 'react';
// @ts-ignore
import Papa from 'papaparse';
import {
  Pencil, Trash2, Plus, X, Upload, Download,
  Eye, EyeOff, ChevronLeft, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { AIQuickField, AIQuickWrapper } from '@/components/admin/AIQuickButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAllProducts,
  getCategories,
  getAddons,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  updateProductsFeatured,
  updateProductsActive,
} from '@/services/api';
import type { Product, Category, Addon, ProductVariant } from '@/types/types';
import { toast } from 'sonner';

// ── 預設三款 Variant 範本 ────────────────────────────────────────────────
const DEFAULT_VARIANTS: ProductVariant[] = [
  { id: 'standard', label_zh: '標準款', label_en: 'Standard', price_delta: 0, description: '' },
  { id: 'deluxe',   label_zh: '加價款', label_en: 'Deluxe',   price_delta: 100, description: '' },
  { id: 'premium',  label_zh: '頂級款', label_en: 'Premium',  price_delta: 200, description: '' },
];

// ── 空表單初始值 ────────────────────────────────────────────────────────
function emptyForm() {
  return {
    name: '', slug: '', sku_code: '', english_name: '',
    category_id: '', price: '', original_price: '',
    description: '', style_tags: '', scent_notes: '',
    flower_materials: '', origin: '', specification: '',
    images: [] as string[], featured: false, is_active: true,
    inventory_type: 'in_stock' as 'in_stock' | 'pre_order',
    pre_order_days: '',
    style_spectrum_value: 50,
    variants: DEFAULT_VARIANTS as ProductVariant[],
    linked_addons: [] as string[],
    meta_title: '', meta_description: '', og_image_url: '',
  };
}

export default function AdminProducts() {
  // ── 列表狀態 ────────────────────────────────────────────────────────────
  const [products, setProducts]         = useState<Product[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [allAddons, setAllAddons]       = useState<Addon[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchKeyword, setSearchKeyword]   = useState('');
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());

  // ── Detail view ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode]         = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [form, setForm]                 = useState(emptyForm());

  // ── Delete dialog ────────────────────────────────────────────────────────
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // ── Tag input helpers (香氣筆記) ─────────────────────────────────────────
  const [scentInput, setScentInput]     = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, c, a] = await Promise.all([getAllProducts(), getCategories(), getAddons()]);
    setProducts(p); setCategories(c); setAllAddons(a);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 篩選 ─────────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const catOk  = filterCategory === 'all' || p.category_id === filterCategory;
    const kwOk   = !searchKeyword ||
      p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (p.sku_code && p.sku_code.toLowerCase().includes(searchKeyword.toLowerCase()));
    return catOk && kwOk;
  });

  // ── 批量操作 ──────────────────────────────────────────────────────────────
  const handleSelectAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(filtered.map(p => p.id)) : new Set());

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  async function handleBatchFeature(featured: boolean) {
    if (!selectedIds.size) return;
    const ok = await updateProductsFeatured(Array.from(selectedIds), featured);
    if (ok) { toast.success(`已更新 ${selectedIds.size} 個精選狀態`); setSelectedIds(new Set()); loadData(); }
    else toast.error('更新精選失敗');
  }

  async function handleBatchActive(is_active: boolean) {
    if (!selectedIds.size) return;
    const ok = await updateProductsActive(Array.from(selectedIds), is_active);
    if (ok) { toast.success(`已${is_active ? '開啟' : '關閉'} ${selectedIds.size} 個前台展示`); setSelectedIds(new Set()); loadData(); }
    else toast.error('更新展示失敗');
  }

  // ── 單品眼睛快速切換 ──────────────────────────────────────────────────────
  async function toggleActive(product: Product) {
    const ok = await updateProductsActive([product.id], !product.is_active);
    if (ok) loadData();
    else toast.error('更新失敗');
  }

  // ── 開啟編輯頁 ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setScentInput('');
    setViewMode('edit');
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      sku_code: product.sku_code || '',
      english_name: product.english_name || '',
      category_id: product.category_id || '',
      price: String(product.price),
      original_price: product.original_price ? String(product.original_price) : '',
      description: product.description || '',
      style_tags: product.style_tags?.join(', ') || '',
      scent_notes: product.scent_notes?.join(', ') || '',
      flower_materials: product.flower_materials || '',
      origin: product.origin || '',
      specification: product.specification || '',
      images: product.images || [],
      featured: product.featured,
      is_active: product.is_active,
      inventory_type: product.inventory_type || 'in_stock',
      pre_order_days: product.pre_order_days ? String(product.pre_order_days) : '',
      style_spectrum_value: product.style_spectrum_value ?? 50,
      variants: (product.variants && product.variants.length > 0) ? product.variants : DEFAULT_VARIANTS,
      linked_addons: product.linked_addons || [],
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      og_image_url: product.og_image_url || '',
    });
    setScentInput('');
    setViewMode('edit');
  }

  // ── 儲存 ──────────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) {
      toast.error('請填寫名稱和價格');
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { toast.error('請輸入有效價格'); return; }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || form.sku_code.trim().toLowerCase() || `product-${Date.now()}`,
      sku_code: form.sku_code.trim() || null,
      english_name: form.english_name.trim() || null,
      category_id: form.category_id || null,
      price,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      description: form.description.trim() || null,
      style_tags: form.style_tags ? form.style_tags.split(',').map(s => s.trim()).filter(Boolean) : null,
      scent_notes: form.scent_notes ? form.scent_notes.split(',').map(s => s.trim()).filter(Boolean) : null,
      flower_materials: form.flower_materials.trim() || null,
      origin: form.origin.trim() || null,
      specification: form.specification.trim() || null,
      images: form.images,
      featured: form.featured,
      is_active: form.is_active,
      inventory_type: form.inventory_type,
      pre_order_days: form.inventory_type === 'pre_order' && form.pre_order_days ? parseInt(form.pre_order_days) : null,
      style_spectrum_value: form.style_spectrum_value,
      variants: form.variants,
      linked_addons: form.linked_addons,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
    };

    setSaving(true);
    const result = editingId
      ? await updateProduct(editingId, payload)
      : await createProduct(payload as Parameters<typeof createProduct>[0]);
    setSaving(false);

    if (result) {
      toast.success(editingId ? '產品已更新' : '產品已建立');
      setViewMode('list');
      loadData();
    } else {
      toast.error('產品儲存失敗');
    }
  }

  // ── 圖片上傳 ──────────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadProductImage(file, `${Date.now()}-${file.name}`);
    setUploading(false);
    if (url) setForm(prev => ({ ...prev, images: [...prev.images, url] }));
    else toast.error('圖片上傳失敗');
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results: any) => {
        let ok = 0;
        for (const row of results.data as Record<string, string>[]) {
          const p = {
            name: row['product_name'] || '',
            slug: (row['sku_code'] || `p-${Date.now()}`).toLowerCase(),
            sku_code: row['sku_code'] || null,
            english_name: row['english_name'] || null,
            category_id: null,
            price: parseFloat(row['price'] || '0'),
            original_price: row['Original price'] ? parseFloat(row['Original price']) : null,
            description: row['description'] || null,
            style_tags: [row['Product Classification'], row['Product Classification_1'], row['Product Classification_2']].filter(Boolean) as string[],
            scent_notes: [] as string[],
            flower_materials: null, origin: null,
            specification: row['additionalInfoDescription1'] || null,
            images: row['productImageUrl'] ? row['productImageUrl'].split(';') : [],
            featured: false, is_active: true,
            inventory_type: 'in_stock' as const,
            pre_order_days: null,
            style_spectrum_value: 50,
            variants: DEFAULT_VARIANTS,
            linked_addons: [],
            meta_title: null, meta_description: null, og_image_url: null,
          };
          if (p.name && !isNaN(p.price)) { await createProduct(p as any); ok++; }
        }
        toast.success(`成功匯入 ${ok} 個產品`);
        loadData();
        setUploading(false);
        if (e.target) e.target.value = '';
      },
      error: () => { toast.error('解析 CSV 失敗'); setUploading(false); }
    });
  }

  function handleCsvDownload() {
    if (!products.length) return;
    const csv = Papa.unparse(products.map(p => ({
      sku_code: p.sku_code || '', product_name: p.name,
      english_name: p.english_name || '', price: p.price,
      original_price: p.original_price || '', description: p.description || '',
      category: p.category?.name || '',
      productImageUrl: p.images.join(';'),
      'Product Classification': p.style_tags?.[0] || '',
      'Product Classification_1': p.style_tags?.[1] || '',
    })));
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.setAttribute('download', 'royalspl-products.csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── 刪除 ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const ok = await deleteProduct(id);
    if (ok) { toast.success('產品已刪除'); setDeletingId(null); loadData(); }
    else toast.error('刪除失敗');
  }

  // ── Variant helpers ───────────────────────────────────────────────────────
  function updateVariant(idx: number, field: keyof ProductVariant, value: string | number) {
    setForm(prev => {
      const v = [...prev.variants];
      v[idx] = { ...v[idx], [field]: value };
      return { ...prev, variants: v };
    });
  }

  // ── Scent tag helpers ──────────────────────────────────────────────────────
  function addScentTag() {
    const tag = scentInput.trim();
    if (!tag) return;
    const existing = form.scent_notes ? form.scent_notes.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!existing.includes(tag)) {
      setForm(prev => ({ ...prev, scent_notes: [...existing, tag].join(', ') }));
    }
    setScentInput('');
  }

  function removeScentTag(tag: string) {
    const existing = form.scent_notes.split(',').map(s => s.trim()).filter(Boolean);
    setForm(prev => ({ ...prev, scent_notes: existing.filter(t => t !== tag).join(', ') }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – EDIT VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'edit') {
    return (
      <div className="space-y-6">
        {/* 頂部導航 */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="pl-0 hover:bg-transparent gap-1.5 text-muted-foreground" onClick={() => setViewMode('list')}>
            <ChevronLeft className="h-5 w-5" />
            <span>產品管理</span>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{editingId ? form.name || '編輯產品' : '新增產品'}</span>
        </div>

        <form onSubmit={handleSave}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="border-b border-border bg-transparent h-auto p-0 gap-0 w-full justify-start rounded-none">
              {[
                { value: 'basic',   label: '基礎資料' },
                { value: 'pdp',     label: 'PDP 規格' },
                { value: 'publish', label: '上架控制' },
                { value: 'seo',     label: 'SEO 掛載' },
              ].map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent px-5 py-2.5 text-sm text-muted-foreground"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── TAB 1: 基礎資料 ─────────────────────────────────────────── */}
            <TabsContent value="basic" className="space-y-8 mt-0">
              {/* 圖片區 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">商品圖片</h3>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="h-24 w-24 rounded-lg object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 rounded">主圖</span>}
                    </div>
                  ))}
                  <Label className="h-24 w-24 rounded-lg border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">{uploading ? '上傳中...' : '上傳圖片'}</span>
                    <Input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </Label>
                </div>
              </div>

              {/* 基本欄位 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <h3 className="text-sm font-semibold text-foreground">基本資訊</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">商品名稱（繁體中文）<span className="text-rose-500 ml-0.5">*</span></Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例：心意滿滿牡丹花束" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">英文名稱</Label>
                    <Input value={form.english_name} onChange={e => setForm({...form, english_name: e.target.value})} placeholder="e.g. Heartfelt Peony Bouquet" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">SKU 編號</Label>
                    <Input value={form.sku_code} onChange={e => setForm({...form, sku_code: e.target.value})} placeholder="RSP-001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">網址代碼 (Slug)</Label>
                    <Input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="heartfelt-peony" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">分類</Label>
                    <Select value={form.category_id || 'none'} onValueChange={v => setForm({...form, category_id: v === 'none' ? '' : v})}>
                      <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">無分類</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">售價 (HKD) <span className="text-rose-500">*</span></Label>
                    <Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">原價 / 特價前 (HKD)</Label>
                    <Input type="number" step="0.01" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})} placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">商品描述</Label>
                  <AIQuickWrapper
                    value={form.description}
                    onChange={v => setForm({...form, description: v})}
                    page="/admin/products"
                  >
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="商品描述..." rows={4} className="px-2" />
                  </AIQuickWrapper>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">花材</Label>
                    <Input value={form.flower_materials} onChange={e => setForm({...form, flower_materials: e.target.value})} placeholder="粉紅牡丹、黃色文心蘭" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">產地</Label>
                    <Input value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="荷蘭・阿姆斯特丹" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">規格</Label>
                    <Input value={form.specification} onChange={e => setForm({...form, specification: e.target.value})} placeholder="約 12 支牡丹" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">風格標籤（逗號分隔）</Label>
                    <Input value={form.style_tags} onChange={e => setForm({...form, style_tags: e.target.value})} placeholder="浪漫, 雅緻" />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.featured} onCheckedChange={v => setForm({...form, featured: v === true})} />
                    <span className="text-sm">設為精選</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v === true})} />
                    <span className="text-sm">前台展示</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: PDP 規格 ──────────────────────────────────────────── */}
            <TabsContent value="pdp" className="space-y-6 mt-0">
              {/* 香氣筆記 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">香氣筆記 Scent Notes</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">多選標籤，前台 PDP 呈現香氣描述</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={scentInput}
                    onChange={e => setScentInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addScentTag(); } }}
                    placeholder="輸入後按 Enter 新增，如：淡雅玫瑰香"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addScentTag}>新增</Button>
                </div>
                {form.scent_notes && (
                  <div className="flex flex-wrap gap-2">
                    {form.scent_notes.split(',').map(s => s.trim()).filter(Boolean).map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1.5">
                        {tag}
                        <button type="button" onClick={() => removeScentTag(tag)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 風格光譜 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">風格光譜 Style Spectrum</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">設定 0–100 數值，前台渲染風格調性滑條（0 = 極簡日式，100 = 繁盛歐式）</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>極簡日式</span>
                    <span className="font-medium text-foreground">{form.style_spectrum_value}</span>
                    <span>繁盛歐式</span>
                  </div>
                  <Slider
                    value={[form.style_spectrum_value]}
                    onValueChange={([v]) => setForm({...form, style_spectrum_value: v})}
                    min={0} max={100} step={1}
                  />
                </div>
              </div>

              {/* 規格變體 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">規格變體 Variants</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Standard / Deluxe / Premium，前台讓顧客選擇規格</p>
                </div>
                <div className="space-y-3">
                  {form.variants.map((v, i) => (
                    <div key={v.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-lg border border-border bg-muted/20">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">中文名稱</Label>
                        <Input value={v.label_zh} onChange={e => updateVariant(i, 'label_zh', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">英文名稱</Label>
                        <Input value={v.label_en} onChange={e => updateVariant(i, 'label_en', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">加價 (HKD)</Label>
                        <Input type="number" value={v.price_delta} onChange={e => updateVariant(i, 'price_delta', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">描述</Label>
                        <Input value={v.description} onChange={e => updateVariant(i, 'description', e.target.value)} placeholder="簡短說明..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 動態加購配件 */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">動態加購配件 Add-ons</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">勾選後前台 PDP 自動顯示可加購配件（花瓶、巧克力、保鮮劑等）</p>
                </div>
                {allAddons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">尚無配件，請先至「配件管理」新增。</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allAddons.map(addon => {
                      const checked = form.linked_addons.includes(addon.id);
                      return (
                        <label key={addon.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={v => {
                              setForm(prev => ({
                                ...prev,
                                linked_addons: v
                                  ? [...prev.linked_addons, addon.id]
                                  : prev.linked_addons.filter(id => id !== addon.id)
                              }));
                            }}
                          />
                          {addon.images?.[0] && (
                            <img src={addon.images[0]} alt={addon.name} className="h-10 w-10 rounded object-cover shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{addon.name}</p>
                            <p className="text-xs text-muted-foreground">HK${addon.price.toFixed(2)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── TAB 3: 上架控制 ──────────────────────────────────────────── */}
            <TabsContent value="publish" className="space-y-6 mt-0">
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <h3 className="text-sm font-semibold text-foreground">庫存與上架狀態</h3>
                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">庫存類型</Label>
                  <Select value={form.inventory_type} onValueChange={v => setForm({...form, inventory_type: v as 'in_stock' | 'pre_order'})}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">現貨 In Stock</SelectItem>
                      <SelectItem value="pre_order">預購 Pre-order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.inventory_type === 'pre_order' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">預計發貨天數</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.pre_order_days}
                        onChange={e => setForm({...form, pre_order_days: e.target.value})}
                        placeholder="7"
                        className="w-28"
                        min={1}
                      />
                      <span className="text-sm text-muted-foreground">天</span>
                    </div>
                    <p className="text-xs text-muted-foreground">前台顯示「預購中，{form.pre_order_days || 'N'} 天後發貨」</p>
                  </div>
                )}

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v === true})} />
                    <span className="text-sm">前台展示（開啟後顧客可瀏覽）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.featured} onCheckedChange={v => setForm({...form, featured: v === true})} />
                    <span className="text-sm">首頁精選展示</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 4: SEO ──────────────────────────────────────────────── */}
            <TabsContent value="seo" className="space-y-6 mt-0">
              <div className="bg-card border border-border rounded-lg p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">SEO 與 AI 媒體掛載</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Meta 標題建議 ≤60 字元，Meta 描述建議 ≤160 字元</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Meta Title</Label>
                    <span className="text-xs text-muted-foreground">{form.meta_title.length}/60</span>
                  </div>
                  <AIQuickWrapper
                    value={form.meta_title}
                    onChange={v => setForm({...form, meta_title: v.slice(0, 80)})}
                    page="/admin/products"
                  >
                    <Input value={form.meta_title} onChange={e => setForm({...form, meta_title: e.target.value})} placeholder="精選牡丹花束 | Royalspl 花坊" maxLength={80} className="px-2" />
                  </AIQuickWrapper>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Meta Description</Label>
                    <span className="text-xs text-muted-foreground">{form.meta_description.length}/160</span>
                  </div>
                  <AIQuickWrapper
                    value={form.meta_description}
                    onChange={v => setForm({...form, meta_description: v.slice(0, 200)})}
                    page="/admin/products"
                  >
                    <Textarea value={form.meta_description} onChange={e => setForm({...form, meta_description: e.target.value})} placeholder="精心挑選法國進口牡丹花束，適合送禮或自用..." rows={3} maxLength={200} className="px-2" />
                  </AIQuickWrapper>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">OG 分享圖片 URL</Label>
                  <Input value={form.og_image_url} onChange={e => setForm({...form, og_image_url: e.target.value})} placeholder="https://..." />
                  {form.og_image_url && (
                    <img src={form.og_image_url} alt="OG Preview" className="mt-2 h-28 rounded-lg object-cover border border-border" />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 底部操作列 */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border sticky bottom-0 bg-background py-4 z-10">
            <Button type="button" variant="outline" onClick={() => setViewMode('list')}>取消</Button>
            <Button type="submit" disabled={saving} className="min-w-[100px]">
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  儲存中...
                </span>
              ) : editingId ? '更新產品' : '建立產品'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER – LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">產品管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {products.length} 件商品</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">已選 {selectedIds.size} 項</span>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full" onClick={() => handleBatchFeature(true)}>設為精選</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full" onClick={() => handleBatchFeature(false)}>取消精選</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => handleBatchActive(true)}>開啟展示</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full text-rose-700 border-rose-300 hover:bg-rose-50" onClick={() => handleBatchActive(false)}>關閉展示</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full" onClick={() => setSelectedIds(new Set())}>取消</Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleCsvDownload}><Download className="mr-1.5 h-3.5 w-3.5" />匯出 CSV</Button>
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <span><Upload className="mr-1.5 h-3.5 w-3.5" />{uploading ? '匯入中...' : '匯入 CSV'}</span>
            </Button>
          </Label>
          <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={uploading} />
          <Button size="sm" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" />新增產品</Button>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="搜尋名稱或 SKU..." value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="所有分類" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}</div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full" style={{direction: 'ltr'}}>
            {/* 頂部捲軸替代元素 */}
            <div className="overflow-x-auto pb-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full" id="scroll-mirror" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-4 whitespace-nowrap">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-20">圖片</TableHead>
                  <TableHead className="whitespace-nowrap">商品名稱</TableHead>
                  <TableHead className="whitespace-nowrap">售價 (HK$)</TableHead>
                  <TableHead className="whitespace-nowrap">庫存狀態</TableHead>
                  <TableHead className="whitespace-nowrap">前台</TableHead>
                  <TableHead className="whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map(product => (
                  <TableRow key={product.id} className={selectedIds.has(product.id) ? 'bg-primary/5' : ''}>
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={v => handleSelectOne(product.id, v as boolean)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="h-14 w-14 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">無圖</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        {product.english_name && <p className="text-xs text-muted-foreground">{product.english_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <span className="font-medium">HK${Number(product.price).toFixed(0)}</span>
                        {product.original_price && (
                          <span className="text-xs text-muted-foreground line-through ml-1.5">HK${Number(product.original_price).toFixed(0)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={product.inventory_type === 'pre_order' ? 'secondary' : 'outline'} className="text-xs">
                        {product.inventory_type === 'pre_order' ? `預購 ${product.pre_order_days ?? ''}天` : '現貨'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border transition-colors ${
                          product.is_active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {product.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {product.is_active ? '展示中' : '已隱藏'}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingId(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      {searchKeyword ? '找不到符合的產品' : '尚未新增任何產品'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 刪除確認 */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除產品</DialogTitle>
            <DialogDescription>確定要刪除此產品嗎？此操作無法復原。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
