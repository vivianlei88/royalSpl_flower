import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { getAddons, createAddon, updateAddon, deleteAddon, uploadProductImage } from '@/services/api';
import type { Addon } from '@/types/types';
import { toast } from 'sonner';

function emptyForm() {
  return {
    name: '', description: '', price: '',
    images: [] as string[], stock_quantity: '', is_active: true, sort_order: '0',
  };
}

export default function AdminAddons() {
  const [addons, setAddons]       = useState<Addon[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);

  async function loadData() {
    setLoading(true);
    setAddons(await getAddons());
    setLoading(false);
  }
  useEffect(() => { loadData(); }, []);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setDialogOpen(true); }
  function openEdit(a: Addon) {
    setEditingId(a.id);
    setForm({
      name: a.name, description: a.description || '',
      price: String(a.price), images: a.images || [],
      stock_quantity: String(a.stock_quantity),
      is_active: a.is_active, sort_order: String(a.sort_order),
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('請填寫配件名稱'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { toast.error('請輸入有效價格'); return; }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      images: form.images,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
    };
    const result = editingId
      ? await updateAddon(editingId, payload)
      : await createAddon(payload);
    setSaving(false);

    if (result) {
      toast.success(editingId ? '配件已更新' : '配件已建立');
      setDialogOpen(false);
      loadData();
    } else {
      toast.error('儲存失敗');
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadProductImage(file, `addon-${Date.now()}-${file.name}`);
    setUploading(false);
    if (url) setForm(prev => ({ ...prev, images: [...prev.images, url] }));
    else toast.error('圖片上傳失敗');
  }

  async function handleDelete(id: string) {
    const ok = await deleteAddon(id);
    if (ok) { toast.success('配件已刪除'); setDeletingId(null); loadData(); }
    else toast.error('刪除失敗');
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">動態加購配件</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理可加購配件（花瓶、巧克力、保鮮劑等），並在商品編輯頁關聯</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />新增配件
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : addons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <p className="text-sm">尚未新增任何配件</p>
          <Button variant="outline" size="sm" onClick={openCreate}>立即新增</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {addons.map(addon => (
            <div key={addon.id} className="bg-card border border-border rounded-lg overflow-hidden group relative">
              {/* 圖片 */}
              <div className="aspect-square bg-muted overflow-hidden">
                {addon.images?.[0] ? (
                  <img src={addon.images[0]} alt={addon.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">無圖片</div>
                )}
              </div>
              {/* 狀態徽章 */}
              <div className="absolute top-2 left-2">
                <Badge variant={addon.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                  {addon.is_active ? '啟用' : '停用'}
                </Badge>
              </div>
              {/* 操作按鈕 */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/90 hover:bg-white border-0 shadow" onClick={() => openEdit(addon)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/90 hover:bg-white border-0 shadow text-destructive hover:text-destructive" onClick={() => setDeletingId(addon.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* 資訊 */}
              <div className="p-3 space-y-1">
                <p className="font-medium text-sm text-foreground truncate">{addon.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">HK${Number(addon.price).toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">庫存 {addon.stock_quantity}</span>
                </div>
                {addon.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{addon.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯配件' : '新增配件'}</DialogTitle>
            <DialogDescription>配件將顯示於商品 PDP 頁面的「加購專區」</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 pt-1">
            {/* 圖片 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">配件圖片</Label>
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="h-20 w-20 rounded-lg object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Label className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <Plus className="h-4 w-4 text-muted-foreground mb-0.5" />
                  <span className="text-[10px] text-muted-foreground">{uploading ? '上傳中...' : '上傳'}</span>
                  <Input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </Label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">配件名稱 <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="例：精美花瓶" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">價格 (HKD) <span className="text-rose-500">*</span></Label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">庫存數量</Label>
                <Input type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} placeholder="0" min={0} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">排序順序</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: e.target.value})} placeholder="0" min={0} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">描述</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="簡短介紹此配件..." rows={2} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({...form, is_active: e.target.checked})}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm">啟用（前台可顯示）</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit" disabled={saving}>
                {saving ? '儲存中...' : editingId ? '更新' : '建立'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除配件</DialogTitle>
            <DialogDescription>確定要刪除此配件嗎？已關聯的商品將自動解除關聯。</DialogDescription>
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
