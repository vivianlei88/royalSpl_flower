import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSiteContent, getProducts, getPublishedHomepageConfig } from '@/services/api';
import type { Product } from '@/types/types';
import PageMeta from '@/components/common/PageMeta';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';

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
  // 動態分類（臻選系列三欄）
  const { mainCategories, loading: catLoading } = useCategories();
  // 已發布首頁 JSON 配置
  const [heroConfig, setHeroConfig] = useState<{
    title: string; subtitle: string; ctaText: string; ctaLink: string;
    image: string; titleAlign: 'left'|'center'|'right';
    overlayOpacity: number; titleColor: string; subtitleColor: string;
    ctaColor: string; ctaBg: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const [siteContent, products, publishedConfig] = await Promise.all([
        getSiteContent(),
        getProducts({ featured: true }),
        getPublishedHomepageConfig(),
      ]);
      setContent(siteContent);
      setFeaturedProducts(products);

      // 從已發布 JSON config 提取 Hero 資料
      if (publishedConfig?.config?.sections) {
        const hero = publishedConfig.config.sections.find((s: any) => s.type === 'hero');
        if (hero?.data) {
          const d = hero.data;
          setHeroConfig({
            title: d.title || 'Royalspl Florist Hong Kong',
            subtitle: d.subtitle || '每一束花皆為一件會呼吸的雕塑。',
            ctaText: d.ctaText || '探索花藝',
            ctaLink: d.ctaLink || '/products',
            image: d.images?.[0]?.url || HERO_IMAGE,
            titleAlign: d.titleAlign || 'left',
            overlayOpacity: d.overlayOpacity ?? 0.35,
            titleColor: d.titleColor || '#ffffff',
            subtitleColor: d.subtitleColor || '#ffffffcc',
            ctaColor: d.ctaColor || '#ffffff',
            ctaBg: d.ctaBg || '#000000',
          });
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Hero 資料：優先 JSON config，fallback site_content 舊欄位
  const heroTitle    = heroConfig?.title    ?? content.hero_title    ?? 'Royalspl Florist Hong Kong';
  const heroSubtitle = heroConfig?.subtitle ?? content.hero_subtitle ?? '每一束花皆為一件會呼吸的雕塑。';
  const heroImage    = heroConfig?.image    ?? content.hero_image    ?? HERO_IMAGE;
  const heroLink     = heroConfig?.ctaLink  ?? content.hero_link     ?? '/products';
  const heroCtaText  = heroConfig?.ctaText  ?? '探索花藝';
  const heroAlign    = heroConfig?.titleAlign ?? 'left';
  const heroOverlay  = heroConfig?.overlayOpacity ?? 0.35;
  const heroTitleColor    = heroConfig?.titleColor    ?? '#ffffff';
  const heroSubtitleColor = heroConfig?.subtitleColor ?? '#ffffffcc';
  const heroCtaColor      = heroConfig?.ctaColor      ?? '#ffffff';
  const heroCtaBg         = heroConfig?.ctaBg         ?? '#000000';

  // 臻選系列 — 動態取前3個有圖片的頂層分類，回退靜態值
  const catsWithImage = mainCategories.filter((c) => c.image_url);
  const displayCats = catsWithImage.length >= 3
    ? catsWithImage.slice(0, 3)
    : mainCategories.slice(0, 3);

  // Fallback 靜態值（API 失敗或分類不足時使用）
  const fallbackCats = [
    { name: '法式自然風', nameEn: 'FRENCH NATURAL STYLE', image: content.col_french_image || FRENCH_IMAGE, link: content.col_french_link || '/products?tag=法式自然風' },
    { name: '日式永生花', nameEn: 'JAPANESE PRESERVED FLOWER', image: content.col_preserved_image || PRESERVED_IMAGE, link: content.col_preserved_link || '/products?tag=日式永生花' },
    { name: '新娘花禮', nameEn: 'BRIDAL FLORAL GIFT', image: content.col_bridal_image || BRIDAL_IMAGE, link: content.col_bridal_link || '/products?tag=新娘花禮' },
  ];

  const threeCols = !catLoading && displayCats.length >= 3
    ? displayCats.map((c) => ({
        name: c.name,
        nameEn: c.name.toUpperCase(),
        image: c.image_url || FRENCH_IMAGE,
        link: `/products?category=${c.slug}`,
      }))
    : fallbackCats;

  const aboutText = content.about_text || '我們是一家香港本地花藝工作室，致力以最純粹的花材創作細膩而優雅的花藝作品，每一束花皆傾注工匠精神。';
  const aboutLink = content.about_link || '/contact';

  const heroAlignClass = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }[heroAlign];

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

      {/* ─── Hero Section（動態讀取已發布 JSON config）─── */}
      <section className="relative w-full min-h-[80vh] flex items-end overflow-hidden bg-muted">
        <img
          src={heroImage}
          alt="Royalspl Florist Hong Kong — Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* 可調遮罩濃度 */}
        <div className="absolute inset-0 bg-black" style={{ opacity: heroOverlay }} />

        <div className={`relative z-10 container mx-auto px-4 pb-16 md:pb-24 md:px-8 flex flex-col ${heroAlignClass}`}>
          <div className="max-w-2xl opacity-0 intersect:opacity-100 transition duration-1000">
            <p className="font-label-en text-xs mb-4" style={{ color: heroSubtitleColor, opacity: 0.8 }}>HONG KONG FLORAL ATELIER</p>
            <h1 className="font-serif-display text-4xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight mb-6" style={{ color: heroTitleColor }}>
              {heroTitle}
            </h1>
            <p className="text-base md:text-lg mb-8 max-w-md leading-relaxed" style={{ color: heroSubtitleColor }}>
              {heroSubtitle}
            </p>
            <Button
              size="lg"
              asChild
              className="rounded-none px-8 py-3 font-medium tracking-wide"
              style={{ backgroundColor: heroCtaBg, color: heroCtaColor }}
            >
              <Link to={heroLink}>
                {heroCtaText}
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

        {/* 三欄錯落畫廊：左高 → 中下移 → 右高 */}
        {catLoading ? (
          /* Skeleton 骨架屏 */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex flex-col gap-4 ${i === 1 ? 'md:translate-y-16' : ''}`}>
                <div className={`bg-muted animate-pulse w-full ${i === 1 ? 'aspect-[4/5]' : 'aspect-[3/4]'}`} />
                <div className="space-y-2">
                  <div className="h-3 w-1/2 bg-muted animate-pulse" />
                  <div className="h-6 w-2/3 bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
            {threeCols.map((col, i) => (
              <div
                key={col.link}
                className={`flex flex-col gap-4 opacity-0 intersect:opacity-100 transition duration-700 ${
                  i === 1 ? 'md:translate-y-16 delay-150' : i === 2 ? 'delay-300' : ''
                }`}
              >
                <Link to={col.link} className={`group block overflow-hidden bg-muted w-full ${i === 1 ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
                  <img
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>
                <div>
                  <p className="font-label-en text-muted-foreground text-[11px] tracking-widest mb-1.5">
                    {col.nameEn}
                  </p>
                  <h3 className="font-serif-display text-2xl text-foreground leading-tight">{col.name}</h3>
                  <Link
                    to={col.link}
                    className="inline-block mt-3 text-xs text-muted-foreground border-b border-current pb-0.5 hover:text-foreground transition-colors"
                  >
                    瀏覽系列
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
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

