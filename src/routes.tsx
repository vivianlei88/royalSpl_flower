import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import FestivalOccasions from './pages/FestivalOccasions';
import Contact from './pages/Contact';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminContent from './pages/AdminContent';
import AdminCategories from './pages/AdminCategories';
import AdminInventory from './pages/AdminInventory';
import AdminTags from './pages/AdminTags';
import AdminSettingsCustomCode from './pages/AdminSettingsCustomCode';
import AdminSettingsHeadless from './pages/AdminSettingsHeadless';
import AdminSettingsMarketing from './pages/AdminSettingsMarketing';
import AdminSettingsTemplates from './pages/AdminSettingsTemplates';
import AdminWixMarketing from './pages/wix/AdminWixMarketing';
import AdminBuilder from './pages/builder/AdminBuilder';
import AdminDelivery from './pages/AdminDelivery';
import AdminReviews from './pages/AdminReviews';
import AdminContacts from './pages/AdminContacts';
import AdminForms from './pages/AdminForms';
import AdminLoyalty from './pages/AdminLoyalty';
import AdminAddons from './pages/AdminAddons';
import AdminAISettings from './pages/AdminAISettings';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import MemberDashboard from './pages/MemberDashboard';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '首頁',
    path: '/',
    element: <Home />,
    public: true,
  },
  {
    name: 'Product',
    path: '/products',
    element: <Products />,
    public: true,
  },
  {
    name: 'Product Detail',
    path: '/product/:slug',
    element: <ProductDetail />,
    public: true,
  },
  {
    name: '節慶場合',
    path: '/festival-occasions',
    element: <FestivalOccasions />,
    public: true,
  },
  {
    name: '聯絡我們',
    path: '/contact',
    element: <Contact />,
    public: true,
  },
  {
    name: '購物車',
    path: '/cart',
    element: <Cart />,
    public: true,
  },
  {
    name: '結帳',
    path: '/checkout',
    element: <Checkout />,
    public: true,
  },
  {
    name: '付款成功',
    path: '/payment-success',
    element: <PaymentSuccess />,
    public: true,
  },
  {
    name: '會員中心',
    path: '/member',
    element: <MemberDashboard />,
    public: false,
  },
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    public: true,
  },
  {
    name: '頁面不存在',
    path: '/404',
    element: <NotFound />,
    public: true,
  },
  {
    name: '管理Dashboard',
    path: '/admin',
    element: <AdminDashboard />,
    public: false,
  },
  {
    name: '物流配送',
    path: '/admin/delivery',
    element: <AdminDelivery />,
    public: false,
  },
  {
    name: '評價管理',
    path: '/admin/reviews',
    element: <AdminReviews />,
    public: false,
  },
  {
    name: '聯絡人',
    path: '/admin/contacts',
    element: <AdminContacts />,
    public: false,
  },
  {
    name: '表單與提交內容',
    path: '/admin/forms',
    element: <AdminForms />,
    public: false,
  },
  {
    name: '酬賓計畫',
    path: '/admin/loyalty',
    element: <AdminLoyalty />,
    public: false,
  },
  {
    name: 'Products',
    path: '/admin/products',
    element: <AdminProducts />,
    public: false,
  },
  {
    name: 'Orders',
    path: '/admin/orders',
    element: <AdminOrders />,
    public: false,
  },
  {
    name: 'SiteContent',
    path: '/admin/content',
    element: <AdminContent />,
    public: false,
  },
  {
    name: 'Categories',
    path: '/admin/categories',
    element: <AdminCategories />,
    public: false,
  },
  {
    name: '交叉標籤',
    path: '/admin/tags',
    element: <AdminTags />,
    public: false,
  },
  {
    name: 'Addons',
    path: '/admin/addons',
    element: <AdminAddons />,
    public: false,
  },
  {
    name: 'Inventory',
    path: '/admin/inventory',
    element: <AdminInventory />,
    public: false,
  },
  {
    name: 'Settings Custom Code',
    path: '/admin/settings/custom-code',
    element: <AdminSettingsCustomCode />,
    public: false,
  },
  {
    name: 'Settings Headless',
    path: '/admin/settings/headless',
    element: <AdminSettingsHeadless />,
    public: false,
  },
  {
    name: 'Settings Marketing',
    path: '/admin/settings/marketing',
    element: <AdminSettingsMarketing />,
    public: false,
  },
  {
    name: 'Settings Templates',
    path: '/admin/settings/templates',
    element: <AdminSettingsTemplates />,
    public: false,
  },
  {
    name: 'Wix SEO & GEO',
    path: '/admin/wix/seo',
    element: <AdminWixMarketing module="seo" />,
    public: false,
  },
  {
    name: 'Wix Google Ads',
    path: '/admin/wix/google-ads',
    element: <AdminWixMarketing module="google-ads" />,
    public: false,
  },
  {
    name: 'Wix Social Ads',
    path: '/admin/wix/social-ads',
    element: <AdminWixMarketing module="social-ads" />,
    public: false,
  },
  {
    name: 'Wix Email Marketing',
    path: '/admin/wix/email',
    element: <AdminWixMarketing module="email" />,
    public: false,
  },
  {
    name: 'Wix Social Media',
    path: '/admin/wix/social',
    element: <AdminWixMarketing module="social" />,
    public: false,
  },
  {
    name: 'Wix Referral Program',
    path: '/admin/wix/referral',
    element: <AdminWixMarketing module="referral" />,
    public: false,
  },
  {
    name: 'Wix Google Business',
    path: '/admin/wix/google-business',
    element: <AdminWixMarketing module="google-business" />,
    public: false,
  },
  {
    name: 'Website Builder',
    path: '/admin/builder',
    element: <AdminBuilder />,
    public: false,
  },
  {
    name: 'AI 助手設定',
    path: '/admin/ai-settings',
    element: <AdminAISettings />,
    public: false,
  },
];
