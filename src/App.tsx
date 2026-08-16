import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import AIChatWidget from '@/components/common/AIChatWidget';
import { Toaster } from '@/components/ui/sonner';

import { routes } from './routes';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { AdminLayout } from '@/components/layouts/AdminLayout';

import { Contact, PenTool, Gift } from 'lucide-react';

const adminRoutePaths = ['/admin', '/admin/products', '/admin/orders', '/admin/content', '/admin/categories', '/admin/inventory', '/admin/settings', '/admin/contacts', '/admin/forms', '/admin/loyalty', '/admin/reviews', '/admin/delivery'];
import { CartProvider } from './contexts/CartContext';

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = adminRoutePaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const isLoginRoute = location.pathname === '/login';

  return (
    <>
      <IntersectObserver />
      <AIChatWidget />
      <Routes>
        {routes.map((route, index) => {
          const element = isAdminRoute && !route.public
            ? <AdminLayout>{route.element}</AdminLayout>
            : route.public && !isLoginRoute
              ? <PublicLayout>{route.element}</PublicLayout>
              : route.element;

          return (
            <Route
              key={index}
              path={route.path}
              element={element}
            />
          );
        })}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
