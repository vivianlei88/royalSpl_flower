import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { getProductBySlug, getProducts } from '@/services/api';
import type { Product } from '@/types/types';
import PageMeta from '@/components/common/PageMeta';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

/* 加購配件 */
const ADDONS = [
  { id: 'vase', label: '經典極簡玻璃花瓶', price: 180 },
  { id: 'food', label: '荷蘭進口植物保鮮劑', price: 30 },
];

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState<Set<string>>(new Set());
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const addonTotal = ADDONS.filter(a => addons.has(a.id)).reduce((s, a) => s + a.price, 0);
  const basePrice = product ? Number(product.price) : 0;
  const totalPrice = (basePrice + addonTotal) * qty;

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      const [productData, productsData] = await Promise.all([
        getProductBySlug(slug),
        getProducts(),
      ]);
      setProduct(productData);
      setRelatedProducts(productsData.filter(p => p.id !== productData?.id).slice(0, 3));
      setLoading(false);
      setSelectedImg(0);
    }
    loadData();
  }, [slug]);

  function toggleAddon(id: string) {
    setAddons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddToCart() {
    if (!product) return;
    addToCart(product, qty);
    toast.success(`已將「${product.name}」加入購物車`);
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-4 w-1/3 bg-muted animate-pulse" />
            <div className="h-10 w-2/3 bg-muted animate-pulse" />
            <div className="h-8 w-1/4 bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center md:px-8">
        <p className="font-label-en text-muted-foreground text-xs mb-4">404</p>
        <h1 className="font-serif-display text-3xl text-foreground mb-6">找不到產品</h1>
        <p className="text-muted-foreground mb-8">此產品不存在或已下架。</p>
        <Link to="/products" className="border-b border-foreground text-sm text-foreground pb-0.5">
          返回產品列表
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];

  return (
    <div className="bg-background">
      <PageMeta
        title={`${product.name} | Royalspl Florist Hong Kong`}
        description={product.description || '來自 Royalspl Florist Hong Kong 的優雅花藝。'}
      />

      <div className="container mx-auto px-4 py-10 md:py-16 md:px-8">
        {/* 返回 */}
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-10 font-label-en"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回產品
        </Link>

        {/* ── 雙欄主體 ── */}
        <div className="grid lg:grid-cols-[1fr_440px] gap-12 xl:gap-20 items-start">

          {/* 左欄：圖片長廊 */}
          <div className="space-y-4 min-w-0">
            {/* 主圖 */}
            <div className="aspect-[3/4] overflow-hidden bg-muted w-full">
              {images[selectedImg] ? (
                <img
                  src={images[selectedImg]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                  暫無圖片
                </div>
              )}
            </div>
            {/* 縮圖列 */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`aspect-square overflow-hidden bg-muted border transition-colors ${
                      selectedImg === i ? 'border-foreground' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右欄：產品資訊（Sticky） */}
          <div className="lg:sticky lg:top-24 h-fit space-y-6 min-w-0">

            {/* 分類小標 */}
            <p className="font-label-en text-muted-foreground text-xs">
              {product.category?.name?.toUpperCase() || 'ROYALSPL FLORIST'}
            </p>

            {/* 主標題 */}
            <div>
              <h1 className="font-serif-display text-3xl md:text-4xl text-foreground leading-snug">
                {product.name}
              </h1>
              {product.english_name && (
                <p className="font-label-en text-muted-foreground text-xs mt-2">
                  {product.english_name}
                </p>
              )}
            </div>

            {/* 狀態標籤 */}
            <div className="flex gap-2">
              {product.inventory_type === 'pre_order' ? (
                <span className="border border-accent text-accent font-label-en text-xs px-2 py-1">
                  預訂 {product.pre_order_days ? `· ${product.pre_order_days} 天` : ''}
                </span>
              ) : (
                <span className="border border-border text-muted-foreground font-label-en text-xs px-2 py-1">
                  現貨
                </span>
              )}
            </div>

            {/* 價格 */}
            <div className="flex items-baseline gap-3">
              <span className="font-serif-display text-2xl text-foreground">
                HK${totalPrice.toLocaleString()}
              </span>
              {product.original_price && (
                <span className="text-sm text-muted-foreground line-through">
                  HK${Number(product.original_price).toLocaleString()}
                </span>
              )}
            </div>

            {/* 描述 */}
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-t border-border pt-6">
                {product.description}
              </p>
            )}

            {/* 風格光譜滑塊 */}
            {product.style_tags && product.style_tags.length > 0 && (
              <div className="border-t border-border pt-6">
                <p className="font-label-en text-muted-foreground text-xs mb-4">STYLE SPECTRUM</p>
                <div className="relative flex items-center justify-between text-xs text-muted-foreground">
                  <span>浪漫 ROMANTIC</span>
                  <span>雅緻 SOPHISTICATED</span>
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-border" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-foreground border-2 border-background" />
                </div>
              </div>
            )}

            {/* 香氣筆記 */}
            {product.scent_notes && product.scent_notes.length > 0 && (
              <div className="border-t border-border pt-6">
                <p className="font-label-en text-muted-foreground text-xs mb-4">香氣筆記 · SCENT NOTES</p>
                <div className="flex flex-wrap gap-2">
                  {product.scent_notes.map((note, i) => (
                    <span
                      key={i}
                      className="border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 規格 Key-Value */}
            <div className="border-t border-border pt-6 space-y-3">
              {product.flower_materials && (
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">花材</span>
                  <span className="text-foreground text-right max-w-[60%]">{product.flower_materials}</span>
                </div>
              )}
              {product.origin && (
                <div className="flex justify-between text-sm py-1 border-t border-border/50">
                  <span className="text-muted-foreground">產地</span>
                  <span className="text-foreground text-right max-w-[60%]">{product.origin}</span>
                </div>
              )}
              {product.specification && (
                <div className="flex justify-between text-sm py-1 border-t border-border/50">
                  <span className="text-muted-foreground">規格</span>
                  <span className="text-foreground text-right max-w-[60%] whitespace-pre-wrap">{product.specification}</span>
                </div>
              )}
            </div>

            {/* 加購配件 */}
            <div className="border-t border-border pt-6">
              <p className="font-label-en text-muted-foreground text-xs mb-4">精選加購配件</p>
              <div className="space-y-3">
                {ADDONS.map(addon => (
                  <label
                    key={addon.id}
                    className="flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={addons.has(addon.id)}
                        onChange={() => toggleAddon(addon.id)}
                        className="w-4 h-4 border border-border rounded-none accent-foreground"
                      />
                      <span className="text-sm text-foreground group-hover:text-muted-foreground transition-colors">
                        {addon.label}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">+ HK${addon.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 數量 + 加入購物車 */}
            <div className="border-t border-border pt-6 space-y-4">
              {/* 數量選擇 */}
              <div className="flex items-center gap-4">
                <span className="font-label-en text-muted-foreground text-xs">數量</span>
                <div className="flex items-center border border-border">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    aria-label="減少數量"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm text-foreground">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    aria-label="增加數量"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* 加入購物車按鈕 */}
              <button
                onClick={handleAddToCart}
                className="w-full bg-foreground text-background py-4 text-sm font-medium tracking-wide hover:bg-muted-foreground transition-colors"
              >
                加入購物車 — HK${totalPrice.toLocaleString()}
              </button>
            </div>
          </div>
        </div>

        {/* ── 相關產品 ── */}
        {relatedProducts.length > 0 && (
          <section className="mt-24 md:mt-32 border-t border-border pt-16">
            <div className="mb-10">
              <span className="font-label-en text-foreground text-xs">YOU MAY ALSO LIKE</span>
              <span className="block font-serif-display text-3xl text-foreground mt-2">您可能也喜歡</span>
            </div>
            <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProducts.map(item => (
                <Link key={item.id} to={`/product/${item.slug}`} className="group">
                  <div className="overflow-hidden bg-muted aspect-[3/4] mb-4">
                    <img
                      src={item.images?.[0]}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug">{item.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">HK${Number(item.price).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

