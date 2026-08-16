import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllProducts, getInquiries, getContactSubmissions, getCloudflareAnalytics } from '@/services/api';
import type { Product, Inquiry, ContactSubmission } from '@/types/types';
import { Package, MessageSquare, Mail, Activity, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [cfData, setCfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [productsData, inquiriesData, submissionsData, cfAnalytics] = await Promise.all([
        getAllProducts(),
        getInquiries(),
        getContactSubmissions(),
        getCloudflareAnalytics()
      ]);
      setProducts(productsData);
      setInquiries(inquiriesData);
      setSubmissions(submissionsData);
      setCfData(cfAnalytics);
      setLoading(false);
    }
    loadData();
  }, []);

  // Compute total requests from Cloudflare if available
  const totalRequests = cfData?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.reduce(
    (sum: number, day: any) => sum + (day.sum?.requests || 0), 0
  ) || 0;

  const stats = [
    { label: '產品總數', value: products.length, icon: Package },
    { label: '詢價', value: inquiries.length, icon: MessageSquare },
    { label: '全域 API 訪問量 (7天)', value: totalRequests, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">管理儀表板</h1>
        <p className="text-muted-foreground">店鋪概覽</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border bg-card h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">最近詢價</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : inquiries.length > 0 ? (
              <ul className="space-y-3">
                {inquiries.slice(0, 5).map((inquiry) => (
                  <li key={inquiry.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{inquiry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inquiry.items && inquiry.items.length > 0 
                          ? `${inquiry.items[0].product?.name} 等 ${inquiry.items.length} 項`
                          : '一般詢價'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(inquiry.created_at).toLocaleDateString('zh-HK')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">暫無詢價。</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">最近訊息</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : submissions.length > 0 ? (
              <ul className="space-y-3">
                {submissions.slice(0, 5).map((submission) => (
                  <li key={submission.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{submission.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{submission.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.created_at).toLocaleDateString('zh-HK')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">暫無訊息。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
