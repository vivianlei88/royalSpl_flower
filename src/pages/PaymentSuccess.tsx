import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import PageMeta from '@/components/common/PageMeta';
// @ts-ignore
import { supabase } from '@/db/supabase';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) return;
      try {
        // ✅ 調用 Cloudflare Worker /stripe/verify（密鑰在 Worker 環境變數）
        const { verifyStripePayment } = await import('@/lib/workerApi');
        const response = await verifyStripePayment(sessionId);
        
        if (response.code !== 'SUCCESS') {
          console.error('Payment verification failed:', response.message);
          return;
        }

        if (response.data?.verified) {
          clearCart();
        }
      } catch (err) {
        console.error('Verify payment failed:', err);
      }
    }

    verifyPayment();
  }, [sessionId, clearCart]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <PageMeta title="付款結果 | Royalspl Flower" description="訂單付款狀態" />
      
      {sessionId ? (
        <div className="text-center space-y-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="text-2xl font-medium tracking-tight">付款成功！</h1>
          <p className="text-muted-foreground">
            感謝您的購買。您的訂單已成功建立並完成付款，我們將盡快為您安排出貨。
          </p>
          <div className="pt-6 flex justify-center gap-4">
            <Button onClick={() => navigate('/member')} variant="outline" className="font-normal">
              查看訂單
            </Button>
            <Button onClick={() => navigate('/')} className="font-normal">
              返回首頁
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <XCircle className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-medium tracking-tight text-destructive">付款失敗或已取消</h1>
          <p className="text-muted-foreground">
            您的付款尚未完成。請返回購物車重新嘗試結帳。
          </p>
          <div className="pt-6 flex justify-center gap-4">
            <Button onClick={() => navigate('/cart')} variant="outline" className="font-normal">
              返回購物車
            </Button>
            <Button onClick={() => navigate('/contact')} className="font-normal">
              聯絡客服
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}