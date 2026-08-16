import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, Plus, Search, Circle, CheckCircle2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  uploadProductImage,
  getAllProducts,
  getProductsByCategory,
  updateProductCategory
} from '@/services/api';
import type { Category, Product } from '@/types/types';
import { toast } from 'sonner';

// ── 可拖拉的產品卡片 ──
function SortableProductCard({
  product, index, checked, onToggleCheck,
}: {
  product: Product;
  index: number;
  checked: boolean;
  onToggleCheck: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group select-none">
      {/* 勾選框 */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggleCheck}
        className="absolute top-2 left-2 z-10 h-4 w-4 rounded border-border accent-primary cursor-pointer"
      />
      {/* 拖拉把手 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-0.5 rounded bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* 序號標籤 */}
      <div className="absolute top-2 left-7 z-10">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted/80 text-[10px] font-medium text-foreground/70 backdrop-blur-sm">
          {index + 1}
        </span>
      </div>
      {/* 圖片 */}
      <div className={`aspect-square w-full rounded-lg overflow-hidden bg-muted border ${checked ? 'border-primary' : 'border-border'} transition-colors`}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">無圖片</div>
        )}
      </div>
      {/* 名稱 */}
      <p className="mt-1.5 text-xs text-foreground truncate px-0.5">{product.name}</p>
    </div>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', image_url: '', description: '', sort_order: 0 });
  const [uploading, setUploading] = useState(false);
  
  // Products management state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [savingProducts, setSavingProducts] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);

  // 拖拉排序狀態
  const [sortedProductIds, setSortedProductIds] = useState<string[]>([]);
  // 批量刪除勾選狀態
  const [checkedRemoveIds, setCheckedRemoveIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadData();
    loadAllProducts();
  }, []);

  async function loadData() {
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  }

  async function loadAllProducts() {
    const products = await getAllProducts();
    setAllProducts(products);
  }

  async function loadCategoryProducts(categoryId: string) {
    const products = await getProductsByCategory(categoryId);
    setCategoryProducts(products);
    setSelectedProductIds(new Set(products.map(p => p.id)));
    setSortedProductIds(products.map(p => p.id));
    setCheckedRemoveIds(new Set());
  }

  function resetForm() {
    setForm({ name: '', slug: '', image_url: '', description: '', sort_order: 0 });
    setEditingId(null);
  }

  function openEdit(category: Category) {
    setSelectedCategory(category);
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      image_url: category.image_url || '',
      description: category.description || '',
      sort_order: category.sort_order ?? 0,
    });
    loadCategoryProducts(category.id);
    setViewMode('detail');
  }

  async function handleUpdateCategoryInfo() {
    if (!editingId) return;

    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('請填寫名稱和網址代碼。');
      return;
    }

    setSavingInfo(true);
    const result = await updateCategory(
      editingId,
      form.name.trim(),
      form.slug.trim(),
      form.image_url.trim() || undefined,
      form.description.trim() || undefined,
      form.sort_order
    );

    if (result) {
      toast.success('類別資訊已成功更新。');
      loadData();
      if (selectedCategory) {
        setSelectedCategory({
          ...selectedCategory,
          name: form.name.trim(),
          slug: form.slug.trim(),
          image_url: form.image_url.trim() || null,
          description: form.description.trim() || null,
          sort_order: form.sort_order,
        });
      }
    } else {
      toast.error('類別儲存失敗，請重試。');
    }
    setSavingInfo(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filename = `${Date.now()}-${file.name}`;
    const url = await uploadProductImage(file, filename);
    setUploading(false);

    if (url) {
      setForm((prev) => ({ ...prev, image_url: url }));
    } else {
      toast.error('圖片上傳失敗。');
    }
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('請填寫名稱和網址代碼。');
      return;
    }

    let result;
    if (editingId) {
      result = await updateCategory(editingId, form.name.trim(), form.slug.trim(), form.image_url.trim() || undefined, form.description.trim() || undefined);
    } else {
      result = await createCategory(form.name.trim(), form.slug.trim(), form.image_url.trim() || undefined, form.description.trim() || undefined);
    }

    if (result) {
      toast.success(editingId ? '類別已更新。' : '類別已建立。');
      setDialogOpen(false);
      resetForm();
      loadData();
    } else {
      toast.error('類別儲存失敗。');
    }
  }

  async function handleDelete(id: string) {
    const success = await deleteCategory(id);
    if (success) {
      toast.success('類別已刪除。');
      setDeletingId(null);
      loadData();
    } else {
      toast.error('刪除類別失敗，可能存在關聯的產品。');
    }
  }

  async function handleManageProducts(category: Category) {
    setEditingId(category.id);
    await loadCategoryProducts(category.id);
    setSearchQuery('');
    setProductsDialogOpen(true);
  }

  async function handleSaveProducts() {
    if (!editingId) return;
    setSavingProducts(true);
    try {
      const productsToAdd = Array.from(selectedProductIds).filter(
        id => !categoryProducts.some(p => p.id === id)
      );
      const productsToRemove = categoryProducts
        .filter(p => !selectedProductIds.has(p.id))
        .map(p => p.id);
      for (const productId of productsToAdd) {
        await updateProductCategory(productId, editingId);
      }
      for (const productId of productsToRemove) {
        await updateProductCategory(productId, null);
      }
      toast.success('類別產品已更新。');
      setProductsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update category products:', error);
      toast.error('更新產品失敗。');
    } finally {
      setSavingProducts(false);
    }
  }

  // 拖拉排序結束
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSortedProductIds(prev => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  // 批量從類別移除
  async function handleBatchRemove() {
    if (checkedRemoveIds.size === 0 || !editingId) return;
    setSavingProducts(true);
    try {
      for (const id of checkedRemoveIds) {
        await updateProductCategory(id, null);
      }
      toast.success(`已移除 ${checkedRemoveIds.size} 個產品。`);
      await loadCategoryProducts(editingId);
    } catch {
      toast.error('移除失敗，請重試。');
    } finally {
      setSavingProducts(false);
    }
  }

  function toggleCheck(id: string) {
    setCheckedRemoveIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    if (checkedRemoveIds.size === sortedProductIds.length) {
      setCheckedRemoveIds(new Set());
    } else {
      setCheckedRemoveIds(new Set(sortedProductIds));
    }
  }

  const filteredProductsForAdd = allProducts.filter(p => 
    searchQuery === '' || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku_code && p.sku_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (viewMode === 'detail' && selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => {
            setViewMode('list');
            setSelectedCategory(null);
            setEditingId(null);
          }} className="pl-0 hover:bg-transparent">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5 text-muted-foreground"><path d="m15 18-6-6 6-6"/></svg>
            <span className="text-xl text-muted-foreground">類別</span>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-slate-50/50">
            <h2 className="text-lg font-bold text-foreground">類別資訊</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground">類別名稱 <span className="text-rose-500">*</span></Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-50" placeholder="例如：乾燥花" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">網址代碼 (Slug) <span className="text-rose-500">*</span></Label>
                <Input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="bg-slate-50" placeholder="例如：dried-flowers" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">排序順序</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                  className="bg-slate-50 w-32"
                  min={0}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">數字越小排列越靠前</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground">頁首說明</Label>
                  <span className="text-xs text-muted-foreground">{form.description.length} 字</span>
                </div>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="min-h-[120px] w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  placeholder="簡單介紹一下這個類別..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">類別圖片</Label>
              <div className="border border-border rounded-lg overflow-hidden bg-slate-50 relative flex items-center justify-center group" style={{ minHeight: '300px' }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <span className="mb-2">無圖片</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Label className="cursor-pointer bg-white text-black px-4 py-2 rounded shadow-sm hover:bg-slate-100 transition-colors text-sm font-medium">
                    {uploading ? '上傳中...' : '更換圖片'}
                    <Input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={uploading} />
                  </Label>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <Label className="text-muted-foreground text-xs">或直接輸入圖片 URL</Label>
                <Input
                  value={form.image_url}
                  onChange={e => setForm({...form, image_url: e.target.value})}
                  className="bg-slate-50 text-xs"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50/50 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">* 為必填欄位。點擊「更新」將同步儲存所有欄位。</p>
            <Button onClick={handleUpdateCategoryInfo} disabled={savingInfo} className="min-w-[88px]">
              {savingInfo ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  儲存中...
                </span>
              ) : '更新'}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">
              類別中的產品
              <span className="text-muted-foreground font-normal ml-2">{sortedProductIds.length}</span>
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              {checkedRemoveIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 h-8 text-xs"
                  onClick={handleBatchRemove}
                  disabled={savingProducts}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  移除已選 ({checkedRemoveIds.size})
                </Button>
              )}
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 h-8 text-sm" onClick={() => setProductsDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 新增產品
              </Button>
            </div>
          </div>

          {sortedProductIds.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              此類別中暫無產品。
            </div>
          ) : (
            <div className="p-5">
              {/* 全選列 */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  checked={checkedRemoveIds.size === sortedProductIds.length && sortedProductIds.length > 0}
                  onChange={toggleCheckAll}
                />
                <span className="text-xs text-muted-foreground select-none">
                  {checkedRemoveIds.size > 0 ? `已選 ${checkedRemoveIds.size} 個` : '全選'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <GripVertical className="h-3.5 w-3.5" /> 拖拉可調整排序
                </span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedProductIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {sortedProductIds.map((pid, idx) => {
                      const product = categoryProducts.find(p => p.id === pid);
                      if (!product) return null;
                      return (
                        <SortableProductCard
                          key={pid}
                          product={product}
                          index={idx}
                          checked={checkedRemoveIds.has(pid)}
                          onToggleCheck={() => toggleCheck(pid)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
        
        {/* Add Products Modal inside Detail View */}
        <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg lg:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 shrink-0 bg-blue-500 text-white rounded-t-lg border-b-0">
              <DialogTitle className="text-white text-xl">將產品新增至此類別</DialogTitle>
              <div className="relative mt-4 bg-white rounded-md text-foreground">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="按名稱搜尋產品..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 w-full rounded-md border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-1 pb-4 pt-4">
                {filteredProductsForAdd.length > 0 ? (
                  filteredProductsForAdd.map(product => {
                    const isSelected = selectedProductIds.has(product.id);
                    return (
                      <div 
                        key={product.id}
                        onClick={() => {
                          const newSet = new Set(selectedProductIds);
                          if (isSelected) newSet.delete(product.id);
                          else newSet.add(product.id);
                          setSelectedProductIds(newSet);
                        }}
                        className="flex items-center gap-4 py-3 hover:bg-slate-50 cursor-pointer rounded-lg px-2 group transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-white">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-100 text-xs text-slate-400">無</div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                        </div>
                        
                        <div className="shrink-0 pl-2">
                          {isSelected ? (
                            <CheckCircle2 className="h-6 w-6 text-blue-500 fill-blue-50" />
                          ) : (
                            <Circle className="h-6 w-6 text-slate-300 group-hover:text-slate-400 transition-colors" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    找不到符合的產品
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-border shrink-0 bg-white flex justify-between items-center">
              <Button variant="ghost" onClick={() => setProductsDialogOpen(false)} className="text-blue-500 hover:text-blue-600 hover:bg-transparent">
                取消
              </Button>
              <Button 
                onClick={async () => {
                  await handleSaveProducts();
                  await loadCategoryProducts(selectedCategory.id);
                }} 
                disabled={savingProducts}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8"
              >
                {savingProducts ? '新增中...' : '新增'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">類別</h1>
            <span className="text-2xl text-blue-500 font-semibold">{categories.length + 1}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">整理產品並管理其顯示方式。 <a href="#" className="text-blue-600 hover:underline">了解方法</a></p>
        </div>
        <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 shadow-sm">
          <Plus className="mr-1 h-4 w-4" />
          新類別
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Default "All Products" category card */}
          <div className="group relative rounded-lg overflow-hidden border border-border bg-[#2c3e50] shadow-sm hover:shadow-md transition-all h-64">
            <div className="p-6 h-full flex flex-col justify-end">
              <div className="bg-[#1a252f] p-4 rounded-lg mb-4 text-sm text-gray-300 flex justify-between items-center shadow-lg absolute top-[35%] left-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>您的所有產品都會自動新增到「所有產品」中。</span>
                <button className="text-gray-400 hover:text-white"><span className="sr-only">關閉</span>×</button>
              </div>
              <div className="flex justify-between items-end mt-auto z-20">
                <h3 className="text-2xl font-bold text-white">所有產品</h3>
                <div className="text-white text-sm font-medium">
                  {/* Would show total products count here */}
                  428
                </div>
              </div>
            </div>
          </div>

          {categories.length > 0 ? (
            categories.map((category) => (
              <div 
                key={category.id} 
                className="group relative rounded-lg overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all h-64 cursor-pointer"
                onClick={() => openEdit(category)}
              >
                <div className="absolute inset-0 bg-muted">
                  {category.image_url ? (
                    <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gray-100">無圖片</div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-emerald-500 text-white shadow-sm">
                      作用中
                    </span>
                  </div>
                  
                  {/* Actions Dropdown Container */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-white hover:bg-gray-100 text-blue-600 shadow border-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageProducts(category);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-white hover:bg-gray-100 text-red-600 shadow border-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(category.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Dark gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                </div>
                
                <div className="p-5 absolute bottom-0 left-0 right-0 z-20">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-white drop-shadow-md truncate">{category.name}</h3>
                      <p className="text-sm text-white/90 drop-shadow-sm truncate">{category.slug}</p>
                    </div>
                    <div className="text-white text-sm font-medium">
                      {/* Would show count for this category */}
                      12
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : null}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯類別' : '新增類別'}</DialogTitle>
            <DialogDescription>
              {editingId ? '更新類別資訊。' : '建立新的產品類別。'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名稱</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：乾燥花"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">網址代碼 (Slug)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="例如：dried-flowers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">介紹</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="類別介紹..."
              />
            </div>
            <div className="space-y-2">
              <Label>類別圖片</Label>
              <div className="flex items-center gap-4">
                {form.image_url && (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border">
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="relative flex-1">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <div className="absolute inset-0 z-10 pointer-events-none border border-border rounded flex items-center justify-center bg-background/50">
                    <span className="text-sm font-medium">{uploading ? '上傳中...' : form.image_url ? '更換圖片' : '上傳圖片'}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{editingId ? '更新' : '建立'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除類別</DialogTitle>
            <DialogDescription>確定要刪除此類別嗎？如果有產品屬於此類別，刪除可能會失敗。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Products Modal */}
      <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg lg:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>將產品新增至此類別</DialogTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="按名稱搜尋產品..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10 w-full rounded-full bg-slate-50 border-slate-200"
              />
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-1 pb-4 pt-2">
              {filteredProductsForAdd.length > 0 ? (
                filteredProductsForAdd.map(product => {
                  const isSelected = selectedProductIds.has(product.id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => {
                        const newSet = new Set(selectedProductIds);
                        if (isSelected) newSet.delete(product.id);
                        else newSet.add(product.id);
                        setSelectedProductIds(newSet);
                      }}
                      className="flex items-center gap-4 py-3 hover:bg-slate-50 cursor-pointer rounded-lg px-2 group transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-slate-100 bg-white">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-slate-100 text-xs text-slate-400">無</div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                        {product.sku_code && <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.sku_code}</p>}
                      </div>
                      
                      <div className="shrink-0 pl-2">
                        {isSelected ? (
                          <CheckCircle2 className="h-6 w-6 text-blue-500 fill-blue-50" />
                        ) : (
                          <Circle className="h-6 w-6 text-slate-300 group-hover:text-slate-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  找不到符合的產品
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-border shrink-0 bg-white flex justify-between items-center">
            <Button variant="ghost" onClick={() => setProductsDialogOpen(false)} className="text-muted-foreground">
              取消
            </Button>
            <Button 
              onClick={handleSaveProducts} 
              disabled={savingProducts}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8"
            >
              {savingProducts ? '儲存中...' : '新增'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}