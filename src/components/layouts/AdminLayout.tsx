import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { MessageSquare, FileText, LayoutDashboard, Menu, X, LogOut, ChevronDown, ChevronUp, Layers, Box, Settings, Code, Globe, Megaphone, Star, Flower2, Package, Users, Gift, LayoutTemplate, Search, Share2, Mail, MapPin, Facebook, MonitorSmartphone, Tags, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import AdminAIAssistant from '@/components/admin/AdminAIAssistant';

const adminLinks = [
  { name: '儀表板', path: '/admin', icon: LayoutDashboard },
  { name: '網站編輯器 (Builder)', path: '/admin/builder', icon: MonitorSmartphone },
  { 
    name: '顧客與潛在顧客', 
    icon: Users, 
    subLinks: [
      { name: '聯絡人', path: '/admin/contacts', icon: Users },
      { name: '前台模板與主題設定', path: '/admin/forms', icon: LayoutTemplate },
      { name: '酬賓計畫', path: '/admin/loyalty', icon: Gift },
    ]
  },
  { 
    name: '行銷 (Wix)', 
    icon: Megaphone, 
    subLinks: [
      { name: 'SEO與GEO', path: '/admin/wix/seo', icon: Search },
      { name: 'Google廣告', path: '/admin/wix/google-ads', icon: Globe },
      { name: 'Facebook與Instagram廣告', path: '/admin/wix/social-ads', icon: Facebook },
      { name: '電子郵件行銷', path: '/admin/wix/email', icon: Mail },
      { name: '社交媒體行銷', path: '/admin/wix/social', icon: Share2 },
      { name: '推薦計劃', path: '/admin/wix/referral', icon: Users },
      { name: 'Google商家檔案', path: '/admin/wix/google-business', icon: MapPin },
    ]
  },
  { 
    name: '目錄', 
    icon: Layers, 
    subLinks: [
      { name: '商店產品', path: '/admin/products', icon: Package },
      { name: '庫存', path: '/admin/inventory', icon: Box },
      { name: '類別', path: '/admin/categories', icon: Layers },
      { name: '加購配件', path: '/admin/addons', icon: Package },
      { name: '交叉標籤', path: '/admin/tags', icon: Tags },
    ]
  },
  { name: '訂單管理', path: '/admin/orders', icon: MessageSquare },
  { name: '物流配送', path: '/admin/delivery', icon: Box },
  { name: '評價審核', path: '/admin/reviews', icon: Star },
  { name: '網站內容', path: '/admin/content', icon: FileText },
  { 
    name: '設定', 
    icon: Settings, 
    subLinks: [
      { name: '網站模板', path: '/admin/settings/templates', icon: LayoutTemplate },
      { name: '自訂程式碼', path: '/admin/settings/custom-code', icon: Code },
      { name: 'Headless 設定', path: '/admin/settings/headless', icon: Globe },
      { name: '行銷整合', path: '/admin/settings/marketing', icon: Megaphone },
    ]
  },
  { name: 'AI 助手設定', path: '/admin/ai-settings', icon: Sparkles },
];

function NavLinks({ setMobileOpen }: { setMobileOpen?: (v: boolean) => void }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '目錄': true,
    '顧客與潛在顧客': true
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (!adminLinks || !Array.isArray(adminLinks)) {
    return null;
  }

  return (
    <ul className="space-y-1 px-3">
      {adminLinks.map((link) => {
        if (link.subLinks) {
          const isOpen = openMenus[link.name];
          const isAnyChildActive = link.subLinks.some(sub => location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`));
          
          return (
            <li key={link.name} className="space-y-1">
              <button
                onClick={() => toggleMenu(link.name)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isAnyChildActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {isOpen && (
                <ul className="pl-6 space-y-1">
                  {link.subLinks.map(subLink => {
                    const isActive = location.pathname === subLink.path || location.pathname.startsWith(`${subLink.path}/`);
              return (
                <li key={subLink.path}>
                  <Link
                    to={subLink.path}
                    onClick={() => setMobileOpen?.(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {subLink.name}
                  </Link>
                </li>
              );
            })}
          </ul>
              )}
            </li>
          );
        }

        const Icon = link.icon;
        const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
        return (
          <li key={link.path}>
            <Link
              to={link.path!}
              onClick={() => setMobileOpen?.(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
          <Flower2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">Royalspl 後台</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <NavLinks />
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 px-3 text-sm text-muted-foreground truncate">
            {profile?.email || user.email}
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Flower2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Royalspl 後台</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-semibold text-foreground">後台</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="py-4 px-3">
              <NavLinks setMobileOpen={setMobileOpen} />
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                登出
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <AdminAIAssistant />
    </div>
  );
}
