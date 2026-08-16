import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSiteContent, getProducts } from '@/services/api';
import type { Product } from '@/types/types';
import PageMeta from '@/components/common/PageMeta';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

const HERO_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_313dfd45-39ef-478c-b334-13e4b564d227.jpg';
// 臻選系列三分類圖片
const FRENCH_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3068594e-c6c0-41f5-8ff4-4ed3183e4328.jpg';
const PRESERVED_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_ebeb4be3-b588-4330-9455-84d7939c1505.jpg';
const BRIDAL_IMAGE = 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_cc5cc865-8c0d-4c1f-8007-9c9c0098cfb1.jpg';

export default function Home() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadData() {
      const [siteContent, products] = await Promise.all([
        getSiteContent(),
        getProducts({ featured: true }),
      ]);
      setContent(siteContent);
      setFeaturedProducts(products);
      setLoading(false);
    }
    loadData();
  }, []);

  const heroTitle = content.hero_title || 'Royalspl Florist Hong Kong';
  const heroSubtitle = content.hero_subtitle || '每一束花皆為一件會呼吸的雕塑。';
  const heroImage = content.hero_image || HERO_IMAGE;
  const heroLink = content.hero_link || '/products';

  // 臻選系列 — 三分類
  const cat1Image = content.col_french_image || FRENCH_IMAGE;
  const cat1Link  = content.col_french_link  || '/products?tag=法式自然風';
  const cat2Image = content.col_preserved_image || PRESERVED_IMAGE;
  const cat2Link  = content.col_preserved_link  || '/products?tag=日式永生花';
  const cat3Image = content.col_bridal_image || BRIDAL_IMAGE;
  const cat3Link  = content.col_bridal_link  || '/products?tag=新娘花禮';

  const aboutText = content.about_text || '我們是一家香港本地花藝工作室，致力以最純粹的花材創作細膩而優雅的花藝作品，每一束花皆傾注工匠精神。';
  const aboutLink = content.about_link || '/contact';

  function handleAddToCart(product: Product) {
    addToCart(product, 1);
    toast.success(`已將「${product.name}」加入購物車`);
  }

  return (
    <div className="flex flex-col">
      <PageMeta
        title="Royalspl Florist Hong Kong | 優雅花藝"
        description="Royalspl Florist Hong Kong — 香港高端鮮花網店，提供精選花藝、即日送花及訂閱花禮服務。"
      />

      {/* ─── Hero Section ─── */}
      <section className="relative w-full min-h-[80vh] flex items-end overflow-hidden bg-muted">
        <img
          src={heroImage}
          alt="Royalspl Florist Hong Kong — Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 底部漸層遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-[#1A1A1A]/20 to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pb-16 md:pb-24 md:px-8">
          <div
            className="max-w-2xl opacity-0 intersect:opacity-100 transition duration-1000"
          >
            <p className="font-label-en text-white/70 mb-4 text-xs">HONG KONG FLORAL ATELIER</p>
            <h1 className="font-serif-display text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight mb-6">
              {heroTitle}
            </h1>
            <p className="text-base md:text-lg text-white/80 mb-8 max-w-md leading-relaxed">
              {heroSubtitle}
            </p>
            <Button
              size="lg"
              asChild
              className="bg-white text-foreground hover:bg-white/90 rounded-none px-8 py-3 font-medium tracking-wide"
            >
              <Link to={heroLink}>
                探索花禮
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 臻選系列 非對稱三欄分類畫廊 ─── */}
      <section className="container mx-auto px-4 py-20 md:py-32 md:px-8">
        {/* Section Header */}
        <div className="mb-12 md:mb-16">
          <span className="font-label-en text-muted-foreground text-xs tracking-widest">THE COLLECTIONS</span>
          <span className="block font-serif-display text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight mt-2">
            臻選系列
          </span>
        </div>

        {/* 三欄錯落畫廊：左高 → 中下移 → 右高，對應參考圖版型 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">

          {/* ── 欄 1：法式自然風 ── */}
          <div className="flex flex-col gap-4 opacity-0 intersect:opacity-100 transition duration-700">
            <Link to={cat1Link} className="group block overflow-hidden bg-muted aspect-[3/4] w-full">
              <img
                src={cat1Image}
                alt="法式自然風"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>
            <div>
              <p className="font-label-en text-muted-foreground text-[11px] tracking-widest mb-1.5">
                FRENCH NATURAL STYLE
              </p>
              <h3 className="font-serif-display text-2xl text-foreground leading-tight">法式自然風</h3>
              <Link
                to={cat1Link}
                className="inline-block mt-3 text-xs text-muted-foreground border-b border-current pb-0.5 hover:text-foreground transition-colors"
              >
                瀏覽系列
              </Link>
            </div>
          </div>

          {/* ── 欄 2：日式永生花（向下偏移，對應參考圖中欄效果） ── */}
          <div className="flex flex-col gap-4 md:translate-y-16 opacity-0 intersect:opacity-100 transition duration-700 delay-150">
            <Link to={cat2Link} className="group block overflow-hidden bg-muted aspect-[4/5] w-full">
              <img
                src={cat2Image}
                alt="日式永生花"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>
            <div>
              <p className="font-label-en text-muted-foreground text-[11px] tracking-widest mb-1.5">
                JAPANESE PRESERVED FLOWER
              </p>
              <h3 className="font-serif-display text-2xl text-foreground leading-tight">日式永生花</h3>
              <Link
                to={cat2Link}
                className="inline-block mt-3 text-xs text-muted-foreground border-b border-current pb-0.5 hover:text-foreground transition-colors"
              >
                瀏覽系列
              </Link>
            </div>
          </div>

          {/* ── 欄 3：新娘花禮 ── */}
          <div className="flex flex-col gap-4 opacity-0 intersect:opacity-100 transition duration-700 delay-300">
            <Link to={cat3Link} className="group block overflow-hidden bg-muted aspect-[3/4] w-full">
              <img
                src={cat3Image}
                alt="新娘花禮"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>
            <div>
              <p className="font-label-en text-muted-foreground text-[11px] tracking-widest mb-1.5">
                BRIDAL FLORAL GIFT
              </p>
              <h3 className="font-serif-display text-2xl text-foreground leading-tight">新娘花禮</h3>
              <Link
                to={cat3Link}
                className="inline-block mt-3 text-xs text-muted-foreground border-b border-current pb-0.5 hover:text-foreground transition-colors"
              >
                瀏覽系列
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 精選花藝 2×3 Grid ─── */}
      <section className="container mx-auto px-4 py-20 md:pt-36 md:pb-32 md:px-8">
        {/* Section Header */}
        <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="font-label-en text-foreground text-xs">FEATURED WORKS</span>
            <span className="block font-serif-display text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight mt-2">
              精選花藝
            </span>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex items-center self-end text-muted-foreground hover:text-foreground rounded-none">
            <Link to="/products">
              查看全部
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] bg-muted animate-pulse" />
                <div className="h-4 w-2/3 bg-muted animate-pulse" />
                <div className="h-4 w-1/3 bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => (
              <div key={product.id} className="group flex flex-col opacity-0 intersect:opacity-100 transition duration-700">
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
                    <h3 className="text-sm font-medium text-foreground leading-snug hover:text-muted-foreground transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  {product.english_name && (
                    <p className="font-label-en text-muted-foreground text-xs">{product.english_name}</p>
                  )}
                  <p className="text-sm text-foreground mt-1">HK${Number(product.price).toLocaleString()}</p>

                  <button
                    onClick={() => handleAddToCart(product)}
                    className="mt-3 w-full border border-border text-xs font-medium tracking-wide py-2.5 text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    加入購物車
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground text-sm">
            暫無精選產品。
          </div>
        )}

        <div className="mt-10 md:hidden">
          <Button variant="outline" asChild className="w-full rounded-none">
            <Link to="/products">
              查看所有產品
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── 關於我們 ─── */}
      <section className="bg-card border-t border-border">
        <div className="container mx-auto px-4 py-20 md:py-28 md:px-8">
          {/* Section Header */}
          <div className="mb-12">
            <span className="font-label-en text-foreground text-xs">ABOUT US</span>
            <span className="block font-serif-display text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight mt-2">
              關於我們
            </span>
          </div>

          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6 opacity-0 intersect:opacity-100 transition duration-700">
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {aboutText}
              </p>
              <Button variant="ghost" asChild className="rounded-none border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors">
                <Link to={aboutLink}>
                  了解更多
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="aspect-[4/3] overflow-hidden bg-muted opacity-0 intersect:opacity-100 transition duration-700 delay-150">
              <img
                src={HERO_IMAGE}
                alt="關於 Royalspl Florist"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 演示帳號提示 */}
      <section className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-lg bg-muted/40 border border-border">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">管理員演示帳號 Admin Demo</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground">
                <span>帳號：<code className="font-mono text-primary select-all">admin@miaoda.com</code></span>
                <span>密碼：<code className="font-mono text-primary select-all">JOuzFJA$JanB4Gh0ERO&</code></span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 font-normal tracking-wide">
              <Link to="/login">
                進入管理後台
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

