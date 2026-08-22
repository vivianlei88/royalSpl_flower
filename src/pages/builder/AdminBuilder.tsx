import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Monitor, Smartphone, Undo2, Redo2, Save, Globe,
  Trash2, GripVertical, Image as ImageIcon, AlignLeft, AlignCenter,
  AlignRight, Upload, ExternalLink, ChevronDown, Eye, EyeOff,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import {
  getHomepageDraft,
  saveHomepageDraft,
  publishHomepageConfig,
  type HomepageLayoutConfig,
  type HeroSectionData,
  type HeroImage,
} from '@/services/api';
import { supabase } from '@/db/supabase';

// ── 內部頁面選項 ──
const INTERNAL_LINKS = [
  { label: '首頁', value: '/' },
  { label: '所有花藝', value: '/products' },
  { label: '節慶場合', value: '/festival-occasions' },
  { label: '購物車', value: '/cart' },
  { label: '聯絡我們', value: '/contact' },
  { label: '會員中心', value: '/member' },
];

// ── 歷史記錄 Hook（Undo/Redo）──
function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [cursor, setCursor] = useState(0);

  const current = history[cursor];

  const push = useCallback((next: T) => {
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor((c) => c + 1);
  }, [cursor]);

  const undo = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const redo = useCallback(() => setCursor((c) => Math.min(history.length - 1, c + 1)), [history.length]);
  const canUndo = cursor > 0;
  const canRedo = cursor < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

// ── 可拖排圖片項目 ──
function SortableImageItem({
  img,
  selected,
  onSelect,
  onDelete,
  onReplace,
}: {
  img: HeroImage;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onReplace: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `homepage/${uuidv4()}.${ext}`;
    const { data, error } = await supabase.storage.from('products').upload(path, file, { contentType: file.type });
    if (error || !data) { toast.error('圖片上傳失敗'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);
    onReplace(urlData.publicUrl);
    toast.success('圖片已更換');
    setUploading(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex items-center gap-3 p-2 rounded border cursor-pointer transition-all ${
        selected ? 'border-foreground bg-muted' : 'border-border hover:border-muted-foreground'
      }`}
    >
      {/* 拖拽把手 */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 縮圖 */}
      <div className="w-16 h-10 shrink-0 overflow-hidden rounded bg-muted">
        <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
      </div>

      <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{img.alt || img.url}</p>

      {/* 懸停操作 */}
      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          title="更換圖片"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          disabled={uploading}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          {uploading ? <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="h-3 w-3" />}
        </button>
        <button
          title="刪除"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
    </div>
  );
}

// ── 主編輯器 ──
export default function AdminBuilder() {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedImgId, setSelectedImgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  const defaultConfig: HomepageLayoutConfig = {
    version: 1,
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        sort: 0,
        data: {
          images: [{ id: 'img-hero-1', url: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_313dfd45-39ef-478c-b334-13e4b564d227.jpg', alt: 'Hero Banner', link: '/products' }],
          title: 'Royalspl Florist Hong Kong',
          subtitle: '每一束花皆為一件會呼吸的雕塑。',
          ctaText: '探索花藝',
          ctaLink: '/products',
          titleAlign: 'left',
          overlayOpacity: 0.35,
          titleColor: '#ffffff',
          subtitleColor: '#ffffffcc',
          ctaColor: '#ffffff',
          ctaBg: '#000000',
        },
      },
    ],
  };

  const { current: config, push, undo, redo, canUndo, canRedo } = useHistory<HomepageLayoutConfig>(defaultConfig);

  // 取得 hero section data
  const heroSection = config.sections.find((s) => s.type === 'hero');
  const hero: HeroSectionData = heroSection?.data ?? defaultConfig.sections[0].data;

  // 載入草稿
  useEffect(() => {
    getHomepageDraft().then((draft) => {
      if (draft?.config) push(draft.config);
      setLoading(false);
    });
  }, []);  // eslint-disable-line

  // 快捷鍵 Ctrl+Z / Ctrl+Y
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // 更新 hero data 並推入歷史
  function updateHero(patch: Partial<HeroSectionData>) {
    const next: HomepageLayoutConfig = {
      ...config,
      sections: config.sections.map((s) =>
        s.type === 'hero' ? { ...s, data: { ...s.data, ...patch } } : s
      ),
    };
    push(next);
  }

  // 圖片排序
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleImgDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = hero.images.findIndex((i) => i.id === active.id);
    const newIdx = hero.images.findIndex((i) => i.id === over.id);
    updateHero({ images: arrayMove(hero.images, oldIdx, newIdx) });
  }

  function addImage() {
    updateHero({
      images: [...hero.images, { id: uuidv4(), url: '', alt: '新圖片', link: '/products' }],
    });
  }

  function deleteImage(id: string) {
    updateHero({ images: hero.images.filter((i) => i.id !== id) });
    if (selectedImgId === id) setSelectedImgId(null);
  }

  function updateImage(id: string, patch: Partial<HeroImage>) {
    updateHero({ images: hero.images.map((i) => i.id === id ? { ...i, ...patch } : i) });
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveHomepageDraft(config);
    setSaving(false);
    ok ? toast.success('草稿已儲存') : toast.error('儲存失敗，請重試');
  }

  async function handlePublish() {
    setPublishing(true);
    const ok = await publishHomepageConfig(config);
    setPublishing(false);
    ok ? toast.success('已正式發布！前台首頁即時更新') : toast.error('發布失敗，請重試');
  }

  const selectedImg = hero.images.find((i) => i.id === selectedImgId);

  // ── Hero 預覽渲染 ──
  function renderHeroPreview() {
    const img = hero.images[0];
    const alignClass = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }[hero.titleAlign];
    return (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: device === 'desktop' ? '16/7' : '9/16' }}>
        {img?.url ? (
          <img src={img.url} alt={img.alt} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {showOverlay && (
          <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity }} />
        )}
        <div className={`absolute inset-0 flex flex-col justify-end p-8 md:p-16 gap-3 ${alignClass}`}>
          <p className="font-label-en text-xs" style={{ color: hero.subtitleColor, opacity: 0.8 }}>HONG KONG FLORAL ATELIER</p>
          <h1 className="font-serif-display text-3xl md:text-5xl leading-tight" style={{ color: hero.titleColor }}>
            {hero.title}
          </h1>
          <p className="text-sm md:text-base max-w-md" style={{ color: hero.subtitleColor }}>
            {hero.subtitle}
          </p>
          <button
            className="mt-2 px-6 py-2.5 text-sm font-medium self-start"
            style={{ color: hero.ctaColor, backgroundColor: hero.ctaBg, alignSelf: hero.titleAlign === 'center' ? 'center' : hero.titleAlign === 'right' ? 'flex-end' : 'flex-start' }}
          >
            {hero.ctaText}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">載入草稿中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">

      {/* ── 頂部固定工具列 ── */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 gap-4">
        {/* 左：返回 + 標題 */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin" className="shrink-0 p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors" title="返回後台">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-medium text-foreground hidden sm:block truncate">首頁編輯器</span>
        </div>

        {/* 中：裝置切換 */}
        <div className="flex items-center gap-1 bg-muted rounded p-0.5 shrink-0">
          <Button
            variant={device === 'desktop' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline text-xs">桌面端</span>
          </Button>
          <Button
            variant={device === 'mobile' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-3"
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline text-xs">手機端</span>
          </Button>
        </div>

        {/* 右：Undo/Redo + 儲存 + 發布 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!canUndo} onClick={undo} title="復原 (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!canRedo} onClick={redo} title="重做 (Ctrl+Y)">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-px h-5 bg-border" />
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="h-8">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? '儲存中…' : '儲存草稿'}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="h-8">
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            {publishing ? '發布中…' : '正式發布'}
          </Button>
        </div>
      </div>

      {/* ── 主體 ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── 左側圖片管理面板 ── */}
        <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hero 輪播圖片</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">拖拽調整順序，點選圖片後在右側設定連結</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImgDragEnd}>
              <SortableContext items={hero.images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {hero.images.map((img) => (
                  <SortableImageItem
                    key={img.id}
                    img={img}
                    selected={selectedImgId === img.id}
                    onSelect={() => setSelectedImgId(img.id)}
                    onDelete={() => deleteImage(img.id)}
                    onReplace={(url) => updateImage(img.id, { url })}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-1" onClick={addImage}>
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> 新增圖片
            </Button>
          </div>
        </aside>

        {/* ── 預覽畫布 ── */}
        <div
          className="flex-1 min-w-0 overflow-auto bg-[#f5f5f4] flex flex-col items-center py-8 px-4 gap-4"
          style={{ backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 0)', backgroundSize: '20px 20px' }}
        >
          {/* 遮罩開關 */}
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setShowOverlay((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-white/80 px-3 py-1.5 rounded border border-border"
            >
              {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showOverlay ? '遮罩開啟' : '遮罩關閉'}
            </button>
          </div>

          {/* 裝置外框 */}
          <div
            className="bg-white shadow-xl ring-1 ring-black/10 overflow-hidden transition-all duration-300"
            style={{
              width: device === 'desktop' ? 'min(1200px, 100%)' : '375px',
              minWidth: device === 'mobile' ? '375px' : undefined,
            }}
          >
            {renderHeroPreview()}

            {/* 後續 Section 佔位 */}
            <div className="px-8 py-16 text-center border-t border-border/30">
              <p className="text-xs text-muted-foreground/60">其他區塊（臻選系列、精選花藝等）由後台分類與商品動態生成</p>
            </div>
          </div>
        </div>

        {/* ── 右側屬性面板 ── */}
        <aside className="w-72 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedImg ? '圖片屬性' : 'Hero 文字與樣式'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* ── 圖片連結設定 ── */}
            {selectedImg ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">圖片說明（Alt）</Label>
                  <Input
                    value={selectedImg.alt}
                    onChange={(e) => updateImage(selectedImg.id, { alt: e.target.value })}
                    placeholder="圖片描述文字"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">點擊跳轉連結</Label>
                  <div className="space-y-2">
                    <Select
                      value={INTERNAL_LINKS.find((l) => l.value === selectedImg.link)?.value || 'custom'}
                      onValueChange={(v) => { if (v !== 'custom') updateImage(selectedImg.id, { link: v }); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="選擇內部頁面" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERNAL_LINKS.map((l) => (
                          <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                        ))}
                        <SelectItem value="custom" className="text-xs">自訂連結</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={selectedImg.link}
                      onChange={(e) => updateImage(selectedImg.id, { link: e.target.value })}
                      placeholder="https:// 或 /路徑"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">圖片 URL</Label>
                  <Input
                    value={selectedImg.url}
                    onChange={(e) => updateImage(selectedImg.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>

                <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => setSelectedImgId(null)}>
                  <ChevronDown className="h-3 w-3 mr-1" /> 返回 Hero 設定
                </Button>
              </div>
            ) : (
              <>
                {/* ── 文字內容 ── */}
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">文字內容</p>

                  <div className="space-y-1.5">
                    <Label className="text-xs">主標題</Label>
                    <Input value={hero.title} onChange={(e) => updateHero({ title: e.target.value })} className="h-8 text-xs" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">副標題</Label>
                    <Input value={hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} className="h-8 text-xs" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">按鈕文字（CTA）</Label>
                    <Input value={hero.ctaText} onChange={(e) => updateHero({ ctaText: e.target.value })} className="h-8 text-xs" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">按鈕連結</Label>
                    <div className="space-y-1.5">
                      <Select
                        value={INTERNAL_LINKS.find((l) => l.value === hero.ctaLink)?.value || 'custom'}
                        onValueChange={(v) => { if (v !== 'custom') updateHero({ ctaLink: v }); }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="選擇頁面" />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERNAL_LINKS.map((l) => (
                            <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
                          ))}
                          <SelectItem value="custom" className="text-xs">自訂連結</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={hero.ctaLink}
                        onChange={(e) => updateHero({ ctaLink: e.target.value })}
                        placeholder="https:// 或 /路徑"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </section>

                {/* ── 樣式設定 ── */}
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">視覺樣式</p>

                  {/* 對齊方式 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">文字對齊</Label>
                    <div className="flex gap-1">
                      {(['left','center','right'] as const).map((align) => {
                        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                        return (
                          <button
                            key={align}
                            onClick={() => updateHero({ titleAlign: align })}
                            className={`flex-1 h-8 flex items-center justify-center rounded border transition-colors ${
                              hero.titleAlign === align ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-muted-foreground'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 遮罩濃度 */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">背景遮罩濃度</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(hero.overlayOpacity * 100)}%</span>
                    </div>
                    <Slider
                      min={0} max={1} step={0.05}
                      value={[hero.overlayOpacity]}
                      onValueChange={([v]) => updateHero({ overlayOpacity: v })}
                      className="w-full"
                    />
                  </div>

                  {/* 顏色設定 */}
                  {[
                    { label: '主標題顏色', key: 'titleColor' as const },
                    { label: '副標題顏色', key: 'subtitleColor' as const },
                    { label: '按鈕文字色', key: 'ctaColor' as const },
                    { label: '按鈕背景色', key: 'ctaBg' as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hero[key] || '#ffffff'}
                          onChange={(e) => updateHero({ [key]: e.target.value })}
                          className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 shrink-0"
                        />
                        <Input
                          value={hero[key] || ''}
                          onChange={(e) => updateHero({ [key]: e.target.value })}
                          className="h-8 text-xs font-mono"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  ))}
                </section>

                {/* 預覽連結 */}
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  在新視窗預覽前台首頁
                </a>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
