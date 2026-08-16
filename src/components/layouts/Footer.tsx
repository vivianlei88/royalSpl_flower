import { Link } from 'react-router-dom';

interface FooterProps {
  siteContent: Record<string, string>;
}

export function Footer({ siteContent }: FooterProps) {
  const footerSlogan = siteContent.footer_slogan || 'RoyalSpl Florist Hong Kong';
  const footerText = siteContent.footer_text || '每一束花皆為一件會呼吸的雕塑。';

  const nav1 = [
    { label: siteContent.footer_nav1_label1 || '所有花藝', link: siteContent.footer_nav1_link1 || '/products' },
    { label: siteContent.footer_nav1_label2 || '節慶場合', link: siteContent.footer_nav1_link2 || '/festival-occasions' },
    { label: siteContent.footer_nav1_label3 || '訂閱花禮', link: siteContent.footer_nav1_link3 || '/products?category=subscriptions' },
  ];

  const nav2 = [
    { label: siteContent.footer_nav2_label1 || 'Blog', link: siteContent.footer_nav2_link1 || '/blog' },
    { label: siteContent.footer_nav2_label2 || '常見問題', link: siteContent.footer_nav2_link2 || '/faq' },
    { label: siteContent.footer_nav2_label3 || '聯絡我們', link: siteContent.footer_nav2_link3 || '/contact' },
  ];

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-2">
          {/* 品牌標語欄 */}
          <div className="space-y-4 max-w-xs">
            <p className="font-label-en text-muted-foreground text-xs mb-2">HONG KONG FLORAL ATELIER</p>
            <h3 className="font-serif-display text-2xl md:text-3xl text-foreground leading-snug">
              {footerSlogan}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{footerText}</p>
          </div>

          {/* 兩欄連結矩陣 */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-label-en text-foreground text-xs mb-6">產品</p>
              <ul className="space-y-4">
                {nav1.map((item, i) => (
                  <li key={i}>
                    <Link
                      to={item.link}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-label-en text-foreground text-xs mb-6">資訊</p>
              <ul className="space-y-4">
                {nav2.map((item, i) => (
                  <li key={i}>
                    <Link
                      to={item.link}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 底部版權 */}
        <div className="mt-16 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} RoyalSpl Florist Hong Kong. All rights reserved.</p>
          <Link to="/login" className="hover:text-foreground transition-colors">
            管理員登入
          </Link>
        </div>
      </div>
    </footer>
  );
}
