import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, totalAmount } = useCart();
  const navigate = useNavigate();

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const handleProceedToCheckout = () => {
    navigate('/checkout', {
      state: {
        senderInfo: {
          name: senderName.trim(),
          email: senderEmail.trim(),
          phone: senderPhone.trim()
        }
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <PageMeta title="購物車 | Royalspl Flower" description="查看您的 Royalspl Flower 購物車" />
      <h1 className="mb-8 text-3xl font-light tracking-tight text-foreground">購物車</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-6 text-lg text-muted-foreground">您的購物車是空的</p>
          <Button asChild variant="outline" className="px-8 font-normal tracking-wide">
            <Link to="/products">繼續購物</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-12 md:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-start gap-4 border-b border-border pb-6 sm:items-center sm:gap-6"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden bg-muted">
                  <img
                    src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1563241597-124ba657082f?auto=format&fit=crop&q=80'}
                    alt={item.product.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-medium text-foreground">
                      <Link to={`/product/${item.product.slug}`} className="hover:underline">
                        {item.product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      HK${item.product.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-sm border border-border">
                      <button
                        className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        aria-label="減少數量"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                      <button
                        className="p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        aria-label="增加數量"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors p-2"
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="移除商品"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">送花人聯絡資訊 Sender Info</h2>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="senderName">姓名 Name</Label>
                <Input 
                  id="senderName" 
                  value={senderName} 
                  onChange={(e) => setSenderName(e.target.value)} 
                  placeholder="聯絡人姓名 (選填)" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderEmail">Email</Label>
                <Input 
                  id="senderEmail" 
                  type="email"
                  value={senderEmail} 
                  onChange={(e) => setSenderEmail(e.target.value)} 
                  placeholder="電子郵件 (選填)" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderPhone">電話/WhatsApp</Label>
                <Input 
                  id="senderPhone" 
                  value={senderPhone} 
                  onChange={(e) => setSenderPhone(e.target.value)} 
                  placeholder="聯絡電話或 WhatsApp (選填)" 
                />
              </div>
            </div>

            <div className="my-6 border-t border-border" />

            <h2 className="text-lg font-medium text-foreground mb-4">訂單摘要 Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">小計</span>
                <span className="tabular-nums text-foreground">HK${totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">運費</span>
                <span className="text-muted-foreground">結帳時計算</span>
              </div>
              
              <div className="my-4 border-t border-border" />
              
              <div className="flex justify-between text-base font-medium">
                <span className="text-foreground">總計</span>
                <span className="tabular-nums text-foreground">HK${totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button 
              className="mt-6 w-full gap-2 font-medium tracking-wide"
              size="lg"
              onClick={handleProceedToCheckout}
            >
              前往結帳 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}