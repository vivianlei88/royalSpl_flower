import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Star, Clock } from 'lucide-react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageMeta from '@/components/common/PageMeta';

export default function MemberDashboard() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMemberData() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    }

    fetchMemberData();
  }, [user]);

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      <PageMeta title="會員中心 | Royalspl Flower" description="管理您的訂單與積分" />
      
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-foreground">會員中心</h1>
          <p className="mt-2 text-muted-foreground">歡迎回來，{user?.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              目前積分 Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{profile?.points_balance || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">積分可於下次結帳時折抵現金</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              可用優惠券 Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">0</div>
            <p className="text-xs text-muted-foreground mt-1">目前無可用優惠券</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              歷史訂單 Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{orders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">累計購買筆數</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>我的訂單紀錄</CardTitle>
          <CardDescription>查看您近期的購物明細與配送狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              您目前還沒有任何訂單紀錄
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-medium">訂單 #{order.id.slice(0, 8)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString()} · {order.status === 'completed' ? '已付款 (Paid)' : order.status === 'pending' ? '待付款 (Pending)' : order.status}
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 text-right flex flex-col justify-between">
                    <div className="font-medium text-lg">HK${order.total_amount.toLocaleString()}</div>
                    {order.status === 'pending' && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.href='/checkout'}>
                        繼續付款
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}