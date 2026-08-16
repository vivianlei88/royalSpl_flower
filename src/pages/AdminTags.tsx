import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Tag, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getTagPool,
  createTag,
  deleteTag,
  getAllProducts,
  batchBindTags,
  batchUnbindTags,
} from '@/services/api';
import type { Product } from '@/types/types';

/* 5 大維度 */
const DIMENSIONS = ['場景用途', '核心花材', '設計風格', '價格區間', '附加服務'];

interface TagEntry {
  id: string;
  name: string;
  dimension: string;
}

export default function AdminTags() {
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  /* 新增標籤表單 */
  const [newName, setNewName] = useState('');
  const [newDim, setNewDim] = useState(DIMENSIONS[0]);
  const [creating, setCreating] = useState(false);

  /* 批量綁定 */
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedTagNames, setSelectedTagNames] = useState<Set<string>>(new Set());
  const [binding, setBinding] = useState(false);

  /* 載入資料 */
  const loadData = useCallback(async () => {
    setLoading(true);
    const [tagData, productData] = await Promise.all([getTagPool(), getAllProducts()]);
    setTags(tagData);
    setProducts(productData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* 按維度分組 */
  const grouped = DIMENSIONS.map(dim => ({
    dim,
    items: tags.filter(t => t.dimension === dim),
  }));

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const ok = await createTag(newName.trim(), newDim);
    if (ok) {
      toast.success(`標籤「${newName.trim()}」已新增`);
      setNewName('');
      await loadData();
    } else {
      toast.error('新增失敗，請稍後再試');
    }
    setCreating(false);
  }

  async function handleDelete(tag: TagEntry) {
    const ok = await deleteTag(tag.id, tag.name);
    if (ok) {
      toast.success(`標籤「${tag.name}」已刪除`);
      await loadData();
    } else {
      toast.error('刪除失敗');
    }
  }

  function toggleProduct(id: string) {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTag(name: string) {
    setSelectedTagNames(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function selectAllProducts() {
    setSelectedProductIds(new Set(products.map(p => p.id)));
  }
  function clearProducts() { setSelectedProductIds(new Set()); }
  function clearTags() { setSelectedTagNames(new Set()); }

  async function handleBatchBind() {
    if (!selectedProductIds.size || !selectedTagNames.size) return;
    setBinding(true);
    const ok = await batchBindTags(Array.from(selectedProductIds), Array.from(selectedTagNames));
    if (ok) {
      toast.success(`已為 ${selectedProductIds.size} 個商品綁定 ${selectedTagNames.size} 個標籤`);
      setSelectedProductIds(new Set());
      setSelectedTagNames(new Set());
      await loadData();
    } else {
      toast.error('批量綁定失敗');
    }
    setBinding(false);
  }

  async function handleBatchUnbind() {
    if (!selectedProductIds.size || !selectedTagNames.size) return;
    setBinding(true);
    const ok = await batchUnbindTags(Array.from(selectedProductIds), Array.from(selectedTagNames));
    if (ok) {
      toast.success(`已解綁 ${selectedProductIds.size} 個商品的 ${selectedTagNames.size} 個標籤`);
      setSelectedProductIds(new Set());
      setSelectedTagNames(new Set());
      await loadData();
    } else {
      toast.error('批量解綁失敗');
    }
    setBinding(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">交叉標籤管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理全域標籤池，批量為商品綁定或解綁標籤。</p>
      </div>

      {/* ─── 標籤池 ─── */}
      <div className="border border-border rounded-none p-6 space-y-6">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4" />
          全域標籤池
        </h2>

        {/* 新增標籤 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <p className="text-xs text-muted-foreground mb-1.5">標籤名稱</p>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="例：母親節"
              className="rounded-none"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="w-40">
            <p className="text-xs text-muted-foreground mb-1.5">所屬維度</p>
            <Select value={newDim} onValueChange={setNewDim}>
              <SelectTrigger className="rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="rounded-none gap-2"
          >
            <Plus className="h-4 w-4" />
            新增標籤
          </Button>
        </div>

        {/* 按維度展示標籤 */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {grouped.map(({ dim, items }) => (
              <div key={dim} className="border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">{dim}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">尚無標籤</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {items.map(tag => (
                      <div
                        key={tag.id}
                        className="group flex items-center gap-1 border border-border px-2 py-1 text-xs text-foreground"
                      >
                        {tag.name}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="ml-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle>確認刪除標籤</AlertDialogTitle>
                              <AlertDialogDescription>
                                刪除「{tag.name}」後，所有已綁定此標籤的商品將同步移除。此操作不可復原。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none">取消</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(tag)}
                              >
                                確認刪除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 批量綁定工具 ─── */}
      <div className="border border-border rounded-none p-6 space-y-6">
        <h2 className="text-base font-semibold text-foreground">批量標籤綁定工具</h2>
        <p className="text-xs text-muted-foreground">
          選擇商品 + 選擇標籤 → 點擊「批量綁定」或「批量解綁」
        </p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 左：選擇商品 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">選擇商品</p>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAllProducts} className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                  全選
                </button>
                <button onClick={clearProducts} className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                  清除
                </button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto border border-border divide-y divide-border">
              {products.map(p => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted transition-colors ${
                    selectedProductIds.has(p.id) ? 'bg-muted' : ''
                  }`}
                >
                  <div className={`h-4 w-4 border flex items-center justify-center shrink-0 ${
                    selectedProductIds.has(p.id) ? 'border-foreground bg-foreground' : 'border-border'
                  }`}>
                    {selectedProductIds.has(p.id) && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedProductIds.has(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.style_tags && p.style_tags.length > 0
                        ? p.style_tags.slice(0, 3).join('、')
                        : '無標籤'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">已選 {selectedProductIds.size} 個商品</p>
          </div>

          {/* 右：選擇標籤 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">選擇標籤</p>
              <button onClick={clearTags} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                清除
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto border border-border p-4 space-y-4">
              {grouped.map(({ dim, items }) => items.length > 0 && (
                <div key={dim}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{dim}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`border px-3 py-1 text-xs transition-colors ${
                          selectedTagNames.has(tag.name)
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">已選 {selectedTagNames.size} 個標籤</p>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={handleBatchBind}
            disabled={binding || !selectedProductIds.size || !selectedTagNames.size}
            className="rounded-none gap-2"
          >
            批量綁定標籤
          </Button>
          <Button
            variant="outline"
            onClick={handleBatchUnbind}
            disabled={binding || !selectedProductIds.size || !selectedTagNames.size}
            className="rounded-none gap-2"
          >
            批量解綁標籤
          </Button>
          {(selectedProductIds.size > 0 || selectedTagNames.size > 0) && (
            <p className="self-center text-xs text-muted-foreground">
              {selectedProductIds.size} 個商品 × {selectedTagNames.size} 個標籤
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
