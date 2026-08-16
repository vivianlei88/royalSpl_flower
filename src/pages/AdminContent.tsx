import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSiteContent, updateSiteContent } from '@/services/api';
import { toast } from 'sonner';

const defaultFields: Record<string, string> = {
  // Hero Banner
  hero_title: 'Royalspl Flower',
  hero_subtitle: '為每一個時刻精心打造的優雅花藝',
  hero_image: '',
  hero_link: '/products',

  // Category Collage
  category_party_title: '生日派對',
  category_party_image: '',
  category_party_link: '/products?category=生日派對',
  
  category_sameday_title: '即日送花',
  category_sameday_image: '',
  category_sameday_link: '/products?category=即日鮮花',
  
  category_japanese_title: '日式花禮',
  category_japanese_image: '',
  category_japanese_link: '/products?category=日式鮮花',

  // About Us
  about_title: '關於 Royalspl Flower',
  about_text: '我們是一家本地花藝工作室，致力於創作細膩而優雅的花藝作品。',
  about_image: '',
  about_link: '/contact',

  // Footer
  footer_slogan: 'Royalspl — Hong Kong Floral Atelier',
  footer_text: '每一束花皆為一件會呼吸的雕塑。',

  // Footer Navigation List 1
  footer_nav1_label1: '所有花藝',
  footer_nav1_link1: '/products',
  footer_nav1_label2: '節慶場合',
  footer_nav1_link2: '/festival-occasions',
  footer_nav1_label3: '訂閱花禮',
  footer_nav1_link3: '/products?category=訂閱花禮',

  // Footer Navigation List 2
  footer_nav2_label1: 'blog',
  footer_nav2_link1: '/blog',
  footer_nav2_label2: '常見問題',
  footer_nav2_link2: '/faq',
  footer_nav2_label3: '聯絡我們',
  footer_nav2_link3: '/contact',

  // Contact Info
  contact_address: '花園區布魯姆街 123 號',
  contact_hours: '週一至週六：09:00 - 19:00',
  contact_phone: '+852 1234 5678',
  contact_email: 'hello@royalsplflower.com',
};

export default function AdminContent() {
  const [content, setContent] = useState<Record<string, string>>(defaultFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getSiteContent();
      setContent({ ...defaultFields, ...data });
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSave() {
    setSaving(true);
    const results = await Promise.all(
      Object.entries(content).map(([key, value]) => updateSiteContent(key, value))
    );
    setSaving(false);

    if (results.every(Boolean)) {
      toast.success('網站內容已更新。');
    } else {
      toast.error('部分內容儲存失敗。');
    }
  }

  function updateField(key: string, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  const heroFields = [
    { key: 'hero_title', label: '首頁主標題', type: 'text' },
    { key: 'hero_subtitle', label: '首頁副標題', type: 'text' },
    { key: 'hero_image', label: '首頁主圖網址', type: 'text' },
    { key: 'hero_link', label: '引導按鈕連結', type: 'text' },
  ];

  const categoryFields = [
    { key: 'category_party_title', label: '區塊一標題 (生日派對)', type: 'text' },
    { key: 'category_party_image', label: '區塊一圖片網址', type: 'text' },
    { key: 'category_party_link', label: '區塊一跳轉連結', type: 'text' },
    { key: 'category_sameday_title', label: '區塊二標題 (即日送花)', type: 'text' },
    { key: 'category_sameday_image', label: '區塊二圖片網址', type: 'text' },
    { key: 'category_sameday_link', label: '區塊二跳轉連結', type: 'text' },
    { key: 'category_japanese_title', label: '區塊三標題 (日式花禮)', type: 'text' },
    { key: 'category_japanese_image', label: '區塊三圖片網址', type: 'text' },
    { key: 'category_japanese_link', label: '區塊三跳轉連結', type: 'text' },
  ];

  const aboutFields = [
    { key: 'about_title', label: '關於我們標題', type: 'text' },
    { key: 'about_text', label: '關於我們內容', type: 'textarea' },
    { key: 'about_image', label: '品牌配圖網址', type: 'text' },
    { key: 'about_link', label: '按鈕跳轉連結', type: 'text' },
  ];

  const footerFields = [
    { key: 'footer_slogan', label: '品牌標語 (英)', type: 'text' },
    { key: 'footer_text', label: '品牌標語 (中)', type: 'text' },
    { key: 'footer_nav1_label1', label: '導覽列一 - 項目 1 文字', type: 'text' },
    { key: 'footer_nav1_link1', label: '導覽列一 - 項目 1 連結', type: 'text' },
    { key: 'footer_nav1_label2', label: '導覽列一 - 項目 2 文字', type: 'text' },
    { key: 'footer_nav1_link2', label: '導覽列一 - 項目 2 連結', type: 'text' },
    { key: 'footer_nav1_label3', label: '導覽列一 - 項目 3 文字', type: 'text' },
    { key: 'footer_nav1_link3', label: '導覽列一 - 項目 3 連結', type: 'text' },
    { key: 'footer_nav2_label1', label: '導覽列二 - 項目 1 文字', type: 'text' },
    { key: 'footer_nav2_link1', label: '導覽列二 - 項目 1 連結', type: 'text' },
    { key: 'footer_nav2_label2', label: '導覽列二 - 項目 2 文字', type: 'text' },
    { key: 'footer_nav2_link2', label: '導覽列二 - 項目 2 連結', type: 'text' },
    { key: 'footer_nav2_label3', label: '導覽列二 - 項目 3 文字', type: 'text' },
    { key: 'footer_nav2_link3', label: '導覽列二 - 項目 3 連結', type: 'text' },
  ];

  const contactFields = [
    { key: 'contact_address', label: '地址', type: 'text' },
    { key: 'contact_hours', label: '營業時間', type: 'text' },
    { key: 'contact_phone', label: '電話', type: 'text' },
    { key: 'contact_email', label: '電子郵件', type: 'text' },
  ];

  if (loading) {
    return <div className="h-96 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">網站內容</h1>
        <p className="text-muted-foreground">更新網站內容與聯絡資訊</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">板塊一：Banner 大圖</h2>
          {heroFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={content[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">板塊二：類目展示 (不規則排版圖)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">板塊三：精選花藝</h2>
          <p className="text-sm text-muted-foreground">精選花藝產品請至「商品管理」頁面設定，勾選「設為精選」即可顯示在首頁的 2 行 3 列展示位。</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">板塊四：關於我們</h2>
          {aboutFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={4}
                />
              ) : (
                <Input
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">板塊五：頁尾設定 (Footer)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {footerFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={content[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">聯絡資訊</h2>
          {contactFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={content[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </div>
  );
}
