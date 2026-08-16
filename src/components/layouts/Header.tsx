import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getCategories } from '@/services/api';
import { Category } from '@/types/types';

/* 全屏導航抽屜靜態導航結構 */
const staticNav = [
  {
    zh: '所有花藝',
    en: 'THE COLLECTION',
    href: '/products',
    children: [],
  },
  {
    zh: '節慶場合',
    en: 'OCCASIONS',
    href: '/festival-occasions',
    children: [
      {
        group: '節慶場合',
        items: [
          { name: '情人節', slug: 'valentines-day' },
          { name: '母親節', slug: 'mothers-day' },
          { name: '中秋節', slug: 'mid-autumn' },
          { name: '清明節', slug: 'ching-ming' },
          { name: '畢業季', slug: 'graduation' },
          { name: '端午', slug: 'dragon-boat' },
          { name: '聖誕', slug: 'christmas' },
        ],
      },
      {
        group: '生活場景',
        items: [
          { name: '生日', slug: 'birthday' },
          { name: '週年', slug: 'anniversary' },
          { name: '婚禮', slug: 'wedding' },
          { name: '彌月', slug: 'baby-shower' },
          { name: '探病', slug: 'get-well' },
          { name: '帛事', slug: 'condolence' },
          { name: '開張', slug: 'opening' },
          { name: '喬遷', slug: 'housewarming' },
          { name: '商務送禮', slug: 'corporate-gift' },
          { name: '企業周年', slug: 'corporate-anniversary' },
        ],
      },
    ],
  },
  {
    zh: '花材種類',
    en: 'FLOWER TYPES',
    href: '/products?category=flower-types',
    children: [
      {
        group: '花材',
        items: [
          { name: '玫瑰', slug: 'roses' },
          { name: '鬱金香', slug: 'tulips' },
          { name: '芍藥（牡丹）', slug: 'peonies' },
          { name: '荷花', slug: 'lotus' },
          { name: '進口鮮花', slug: 'imported-flowers' },
        ],
      },
    ],
  },
  {
    zh: '訂閱花禮',
    en: 'SUBSCRIPTIONS',
    href: '/products?category=subscriptions',
    children: [],
  },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { user, profile, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  // 登入連結攜帶當前路徑，登入後跳回原頁
  const loginHref = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  /* 打開全屏菜單時禁止頁面捲動 */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  function closeMenu() {
    setMenuOpen(false);
    setExpandedIdx(null);
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          {/* 左側：MENU 漢堡 */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors"
            aria-label="開啟選單"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-label-en text-xs hidden sm:block">MENU</span>
          </button>

          {/* 中間：品牌 Logo */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-center"
          >
            <span className="text-sm font-semibold tracking-[0.12em] text-foreground uppercase whitespace-nowrap hidden md:block">
              RoyalSpl Florist Hong Kong
            </span>
            <span className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase md:hidden">
              RoyalSpl
            </span>
          </Link>

          {/* 右側：會員 + 購物車 */}
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to={isAdmin ? '/admin' : '/member'}
                className="text-foreground hover:text-muted-foreground transition-colors"
                aria-label={isAdmin ? '後台' : '會員中心'}
              >
                <User className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            ) : (
              <Link
                to={loginHref}
                className="text-foreground hover:text-muted-foreground transition-colors"
                aria-label="登入"
              >
                <User className="h-5 w-5" strokeWidth={1.5} />
              </Link>
            )}

            <Link
              to="/cart"
              className="relative text-foreground hover:text-muted-foreground transition-colors"
              aria-label="購物車"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-bold text-background">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* 全屏導航抽屜 */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-200">
          {/* 抽屜 Header */}
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8 border-b border-border">
            <Link to="/" onClick={closeMenu} className="text-sm font-semibold tracking-[0.12em] text-foreground uppercase">
              RoyalSpl Florist Hong Kong
            </Link>
            <button
              onClick={closeMenu}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="關閉選單"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* 導航列表 */}
          <div className="container mx-auto px-6 md:px-16 py-12 md:py-20">
            <div className="flex flex-col divide-y divide-border max-w-4xl">
              {staticNav.map((item, idx) => (
                <div key={idx}>
                  {item.children.length > 0 ? (
                    /* 有子項目：可展開 */
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      className="w-full flex items-baseline gap-6 text-left py-8 group"
                    >
                      <span className="font-serif-display text-4xl md:text-6xl lg:text-7xl text-foreground group-hover:text-muted-foreground transition-colors leading-none">
                        {item.zh}
                      </span>
                      <span className="font-label-en text-muted-foreground hidden sm:block">
                        {item.en}
                      </span>
                    </button>
                  ) : (
                    /* 無子項目：直接跳轉 */
                    <Link
                      to={item.href}
                      onClick={closeMenu}
                      className="flex items-baseline gap-6 py-8 group"
                    >
                      <span className="font-serif-display text-4xl md:text-6xl lg:text-7xl text-foreground group-hover:text-muted-foreground transition-colors leading-none">
                        {item.zh}
                      </span>
                      <span className="font-label-en text-muted-foreground hidden sm:block">
                        {item.en}
                      </span>
                    </Link>
                  )}

                  {/* 展開子分類 */}
                  {item.children.length > 0 && expandedIdx === idx && (
                    <div className="pb-8 pl-2 md:pl-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl">
                        {item.children.map((group, gi) => (
                          <div key={gi}>
                            <p className="font-label-en text-muted-foreground mb-4 text-xs">{group.group}</p>
                            <div className="flex flex-col gap-3">
                              {group.items.map((sub) => (
                                <Link
                                  key={sub.slug}
                                  to={`/products?category=${sub.slug}`}
                                  onClick={closeMenu}
                                  className="text-base text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 底部帳戶連結 */}
            <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-6 text-sm text-muted-foreground">
              {user ? (
                <>
                  <Link to={isAdmin ? '/admin' : '/member'} onClick={closeMenu} className="hover:text-foreground transition-colors">
                    {isAdmin ? '後台管理' : '會員中心'}
                  </Link>
                  <button onClick={() => { handleLogout(); closeMenu(); }} className="hover:text-foreground transition-colors">
                    登出
                  </button>
                </>
              ) : (
                <Link to={loginHref} onClick={closeMenu} className="hover:text-foreground transition-colors">
                  登入 / 註冊
                </Link>
              )}
              <Link to="/contact" onClick={closeMenu} className="hover:text-foreground transition-colors">聯絡我們</Link>
              <Link to="/faq" onClick={closeMenu} className="hover:text-foreground transition-colors">常見問題</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const navLinks = [
  { name: '首頁', path: '/' },
  { name: '聯絡我們', path: '/contact' },
];

