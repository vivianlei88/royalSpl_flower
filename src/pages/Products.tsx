import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { getCategories, getProducts } from '@/services/api';
import type { Product, Category } from '@/types/types';
import PageMeta from '@/components/common/PageMeta';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

/* 5 大交叉標籤維度（前端顯示用） */
const TAG_DIMENSIONS = [
  {
    label: '場景用途',
    tags: ['戀愛', '生日', '母親節', '情人節', '清明', '開張', '探病', '商務', '婚禮', '週年'],
  },
  {
    label: '核心花材',
    tags: ['玫瑰', '郁金香', '芍藥', '進口鮮花', '荷花', '鬱金香'],
  },
  {
    label: '設計風格',
    tags: ['經典風', '韓式', '日式極簡', '永生花', '法式田園風', '高級定制'],
  },
  {
    label: '價格區間',
    tags: ['HK$300內', 'HK$300–600', 'HK$800+', 'HK$1200+'],
  },
  {
    label: '附加服務',
    tags: ['即日配送', '可加賀卡', '香港全境配送'],
  },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // 從 URL ?tag= 參數初始化 activeTags（支援首頁分類卡片點擊帶入過濾）
  const [activeTags, setActiveTags] = useState<Set<string>>(() => {
    const tagParam = searchParams.get('tag');
    return tagParam ? new Set(tagParam.split(',').map(t => t.trim()).filter(Boolean)) : new Set();
  });
  const selectedCategory = searchParams.get('category') || 'all';
  const { addToCart } = useCart();

  // 當 URL ?tag= 變化時同步更新 activeTags（瀏覽器前進/後退支援）
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    const fromUrl = tagParam ? new Set(tagParam.split(',').map(t => t.trim()).filter(Boolean)) : new Set<string>();
    setActiveTags(fromUrl);
  }, [searchParams.get('tag')]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [productsData, categoriesData] = await Promise.all([
      getProducts({ categorySlug: selectedCategory === 'all' ? undefined : selectedCategory }),
      getCategories(),
    ]);
    setProducts(productsData);
    setCategories(categoriesData);
    setLoading(false);
  }, [selectedCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleCategoryChange(category: string) {
    const next = new URLSearchParams(searchParams);
    if (category === 'all') {
      next.delete('category');
    } else {
      next.set('category', category);
    }
    next.delete('tag'); // 切換分類時清除標籤過濾
    setSearchParams(next);
  }

  function toggleTag(tag: string) {
    setActiveTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      // 同步寫回 URL ?tag= 參數
      const params = new URLSearchParams(searchParams);
      if (next.size > 0) {
        params.set('tag', Array.from(next).join(','));
      } else {
        params.delete('tag');
      }
      setSearchParams(params, { replace: true });
      return next;
    });
  }

  function clearAllTags() {
    const params = new URLSearchParams(searchParams);
    params.delete('tag');
    setSearchParams(params, { replace: true });
  }

  function handleAddToCart(product: Product) {
    addToCart(product, 1);
    toast.success(`已將「${product.name}」加入購物車`);
  }

  /* AND 邏輯：僅展示同時匹配全部選中標籤的產品 */
  const filteredProducts = activeTags.size === 0
    ? products
    : products.filter(p => {
        const allTags = [...(p.style_tags || []), ...(p.scent_notes || [])];
        return Array.from(activeTags).every(tag => allTags.includes(tag));
      });

  const mainCategories = categories
    .filter(c => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="bg-background min-h-screen">
      <PageMeta
        title="所有花藝 | Royalspl Florist Hong Kong"
        description="瀏覽 Royalspl Florist Hong Kong 精選花藝系列，探索各種場合的優雅花禮。"
      />

      {/* 頁面標題 */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-12 md:py-16 md:px-8">
          <span className="font-label-en text-muted-foreground text-xs">THE COLLECTION</span>
          <h1 className="font-serif-display text-4xl sm:text-5xl text-foreground mt-2">
            所有花藝
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:px-8 flex flex-col lg:flex-row gap-10">
        {/* ── 左側篩選面板（桌面常駐，手機隱藏） ── */}
        <aside className="hidden lg:block w-52 shrink-0 space-y-8">
          {/* 分類篩選 */}
          <div>
            <p className="font-label-en text-foreground text-xs mb-4">分類</p>
            <div className="space-y-2">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`block text-sm w-full text-left py-1 transition-colors ${
                  selectedCategory === 'all'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                全部
              </button>
              {mainCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`block text-sm w-full text-left py-1 transition-colors ${
                    selectedCategory === cat.slug
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 交叉標籤篩選 */}
          {TAG_DIMENSIONS.map(dim => (
            <div key={dim.label}>
              <p className="font-label-en text-foreground text-xs mb-3">{dim.label}</p>
              <div className="flex flex-col gap-2">
                {dim.tags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeTags.has(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-3.5 h-3.5 border border-border accent-foreground"
                    />
                    <span className={`text-xs transition-colors ${activeTags.has(tag) ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── 右側產品區 ── */}
        <div className="flex-1 min-w-0">
          {/* 手機分類橫向捲動 */}
          <div className="lg:hidden overflow-x-auto pb-2 mb-6">
            <div className="flex gap-2 whitespace-nowrap">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`border px-4 py-2 text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                全部
              </button>
              {mainCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`border px-4 py-2 text-xs font-medium transition-colors ${
                    selectedCategory === cat.slug
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 已選標籤 pills */}
          {activeTags.size > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {Array.from(activeTags).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="flex items-center gap-1.5 border border-foreground px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground hover:text-background transition-colors"
                >
                  {tag}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                onClick={() => clearAllTags()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                清除全部
              </button>
            </div>
          )}

          {/* 結果數量 */}
          <p className="font-label-en text-muted-foreground text-xs mb-8">
            {loading ? '載入中…' : `${filteredProducts.length} 款產品`}
          </p>

          {loading ? (
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 bg-muted animate-pulse" />
                  <div className="h-4 w-1/3 bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-6 grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="group flex flex-col">
                  {/* 商品圖片 */}
                  <Link to={`/product/${product.slug}`} className="block overflow-hidden bg-muted aspect-[3/4]">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>

                  {/* 商品資訊 */}
                  <div className="pt-4 flex flex-col gap-1 flex-1">
                    {product.inventory_type === 'pre_order' && (
                      <span className="font-label-en text-xs text-accent">預訂</span>
                    )}
                    <Link to={`/product/${product.slug}`}>
                      <h3 className="text-sm font-medium text-foreground leading-snug hover:text-muted-foreground transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-foreground mt-1">HK${Number(product.price).toLocaleString()}</p>

                    {/* 標籤 pills */}
                    {product.style_tags && product.style_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.style_tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="border border-border text-muted-foreground text-[10px] px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleAddToCart(product)}
                      className="mt-3 w-full border border-border text-xs py-2.5 text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                    >
                      加入購物車
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <p className="font-serif-display text-2xl text-foreground mb-3">未找到相關商品</p>
              <p className="text-sm text-muted-foreground">請嘗試調整篩選條件。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

