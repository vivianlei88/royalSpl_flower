import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Star, CheckCircle, XCircle } from 'lucide-react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, profile:profiles(email), product:products(name, sku_code)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('讀取評價失敗');
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  }

  async function toggleApproval(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('product_reviews')
      .update({ is_approved: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('狀態更新失敗');
    } else {
      toast.success('狀態已更新');
      fetchReviews();
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('確定要刪除這筆評價嗎？')) return;
    
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('刪除失敗');
    } else {
      toast.success('評價已刪除');
      fetchReviews();
    }
  }

  if (loading) return <div className="p-8">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">產品評價管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>顧客評價列表</CardTitle>
          <CardDescription>審核並管理顯示於前台產品頁面的顧客評價</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-[2fr_1fr_4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 p-4 font-medium text-sm">
              <div className="">商品 / 顧客</div>
              <div className="">評分</div>
              <div className="">評價內容</div>
              <div className="">前台產品頁</div>
              <div className="">首頁顯示</div>
              <div className="text-right">操作</div>
            </div>
            
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">目前沒有評價</div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="grid grid-cols-[2fr_1fr_4fr_1fr_1fr_1fr] gap-4 border-b p-4 text-sm items-center">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{review.product?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{review.profile?.email}</div>
                  </div>
                  
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  
                  <div className="text-muted-foreground line-clamp-2 min-w-0">
                    {review.comment || '-'}
                  </div>
                  
                  <div className="">
                    <Switch 
                      checked={review.is_approved} 
                      onCheckedChange={() => toggleApproval(review.id, review.is_approved)}
                    />
                  </div>
                  
                  <div className="">
                    <Switch 
                      checked={review.show_on_home || false} 
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('product_reviews')
                          .update({ show_on_home: !review.show_on_home })
                          .eq('id', review.id);
                        if (error) {
                          toast.error('更新失敗');
                        } else {
                          toast.success('更新成功');
                          fetchReviews();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="text-right">
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteReview(review.id)}>
                      刪除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}