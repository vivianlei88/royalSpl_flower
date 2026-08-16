import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// @ts-ignore
import { supabase } from '@/db/supabase';
import PageMeta from '@/components/common/PageMeta';
import { toast } from 'sonner';

export default function Checkout() {
  const { items, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const senderInfo = (location.state as any)?.senderInfo || { name: '', email: '', phone: '' };

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('HK_ISLAND');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('full_day');
  const [specificTime, setSpecificTime] = useState('');
  
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  
  // 新增：心意卡與注意事項
  const [cardMessage, setCardMessage] = useState('');
  const [remarks, setRemarks] = useState('');

  // 計算邏輯
  const hasPreOrder = items.some(i => i.product.inventory_type === 'pre_order');
  
  // 附加費計算
  let timeSurcharge = 0;
  if (timeSlot === 'full_day' && totalAmount < 500) timeSurcharge = 90;
  else if (timeSlot === 'specific_hour') timeSurcharge = 150;
  else if (timeSlot === 'night') timeSurcharge = 250;
  else if (timeSlot === 'express') timeSurcharge = 200;

  let areaSurcharge = 0;
  if (deliveryArea === 'TUEN_MUN') areaSurcharge = 100;
  else if (deliveryArea === 'SOUTH_ISLAND') areaSurcharge = 150;
  else if (deliveryArea === 'PEAK_SAIKUNG') areaSurcharge = 200;
  else if (deliveryArea === 'REMOTE_ISLAND') areaSurcharge = 300;

  const finalShippingFee = Math.max(timeSurcharge, areaSurcharge);
  const finalTotal = totalAmount + finalShippingFee;

  useEffect(() => {
    if (items.length === 0) {
      toast.error('購物車是空的');
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (timeSlot === 'specific_hour' && !specificTime) {
      toast.error('請選擇指定的時間');
      return;
    }
    if (timeSlot === 'night' && !specificTime) {
      toast.error('請選擇夜晚派送時間');
      return;
    }

    if (!user) {
      toast.error('請先登入後再結帳');
      navigate(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }

    setLoading(true);
    try {
      // ✅ 調用 Cloudflare Worker /stripe/checkout（密鑰在 Worker 環境變數）
      const { createStripeCheckout } = await import('@/lib/workerApi');
      const response = await createStripeCheckout({
        items: items.map(item => ({
          name: item.product?.name || '商品',
          price: Number(item.product?.price ?? 0),
          quantity: item.quantity,
          product_id: item.product_id,
        })),
        customer_name: recipientName || senderInfo.name || user.email?.split('@')[0] || 'Member',
        customer_phone: recipientPhone || senderInfo.phone || '00000000',
        customer_email: senderInfo.email || user.email || '',
        delivery_date: deliveryDate,
        delivery_time_slot: timeSlot,
        delivery_area: deliveryArea,
        time_surcharge: timeSurcharge,
        area_surcharge: areaSurcharge,
        final_shipping_fee: finalShippingFee,
        total_amount: finalTotal,
        card_message: cardMessage,
        remarks: remarks,
        specific_time: specificTime
      });

      if (response.code !== 'SUCCESS' || !response.data) {
        throw new Error(response.message || '無法取得結帳網址');
      }

      const { url } = response.data;
      if (url) {
        // 使用 _top 跳出 iframe 沙箱，確保跨域跳轉生效
        window.open(url, '_top');
      } else {
        throw new Error('無法取得結帳網址');
      }
    } catch (err) {
      console.error(err);
      toast.error('建立結帳發生錯誤，請確認設定是否完整');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <PageMeta title="結帳 | Royalspl Flower" description="完成您的 Royalspl Flower 訂單" />
      <h1 className="mb-8 text-3xl font-light tracking-tight text-foreground">安全結帳 Secure Checkout</h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
        {/* 左側：配送與聯絡資訊 */}
        <form id="checkout-form" onSubmit={handleCheckout} className="space-y-10">
          
          {/* 訂單備註與心意卡 */}
          <section className="space-y-6 border-b border-border pb-10">
            <h2 className="text-xl font-medium">心意卡與備註 Gift Card & Remarks</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardMessage">心意卡內容 Card Message</Label>
                <Textarea 
                  id="cardMessage" 
                  value={cardMessage} 
                  onChange={e => setCardMessage(e.target.value)} 
                  placeholder="請輸入心意卡內容（選填）..." 
                  className="bg-background min-h-24 resize-y" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">注意事項 Remarks</Label>
                <Textarea 
                  id="remarks" 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)} 
                  placeholder="請輸入特別注意事項，例如：請先電話聯絡（選填）..." 
                  className="bg-background min-h-24 resize-y" 
                />
              </div>
            </div>
          </section>

          {/* 收花人資訊 */}
          <section className="space-y-6 border-b border-border pb-10">
            <h2 className="text-xl font-medium">收花人資訊 Recipient Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipientName">姓名 Name <span className="text-destructive">*</span></Label>
                <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} required className="bg-background" placeholder="請輸入收花人姓名" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientPhone">聯絡電話 Phone <span className="text-destructive">*</span></Label>
                <Input id="recipientPhone" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required className="bg-background" placeholder="請輸入收花人聯絡電話" />
              </div>
            </div>
          </section>

          {/* 配送資訊 */}
          <section className="space-y-6 border-b border-border pb-10">
            <h2 className="text-xl font-medium">配送資訊 Delivery Info</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">詳細地址 Address</Label>
                <div className="relative">
                  <Textarea 
                    id="address" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    required 
                    placeholder="請輸入中英文地址..." 
                    className="bg-background pr-24 min-h-[5rem] resize-y" 
                    rows={3}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-2 h-7 px-2 text-xs"
                    onClick={() => {
                      if(!address) {
                        toast.error('請先輸入地址');
                        return;
                      }
                      toast.info('正在分析區域...');
                      setTimeout(() => {
                        const addr = address.toLowerCase();
                        const isIsland = addr.includes('大嶼山') || addr.includes('愉景灣') || addr.includes('離島') || addr.includes('lantau') || addr.includes('discovery bay') || addr.includes('airport');
                        const isPeak = addr.includes('山頂') || addr.includes('清水灣') || addr.includes('大潭') || addr.includes('peak') || addr.includes('clear water bay') || addr.includes('tai tam');
                        const isSouth = addr.includes('西貢') || addr.includes('半山') || addr.includes('南區') || addr.includes('sai kung') || addr.includes('mid-levels') || addr.includes('southern');
                        const isTuenMun = addr.includes('屯門') || addr.includes('深井') || addr.includes('tuen mun') || addr.includes('sham tseng');
                        
                        let detectedArea = 'HK_ISLAND';
                        if(isIsland) detectedArea = 'REMOTE_ISLAND';
                        else if(isPeak) detectedArea = 'PEAK_SAIKUNG';
                        else if(isSouth) detectedArea = 'SOUTH_ISLAND';
                        else if(isTuenMun) detectedArea = 'TUEN_MUN';
                        
                        setDeliveryArea(detectedArea);
                        toast.success('已自動偵測您的配送地址並帶入分區，請確認。');
                      }, 500);
                    }}
                  >
                    自動偵測
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  (點擊自動偵測，透過關鍵字判斷分區)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deliveryArea">配送分區 Delivery Area</Label>
                  <Select value={deliveryArea} onValueChange={setDeliveryArea}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="選擇分區" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HK_ISLAND">市區屋苑/商廈/港九龍鐵路沿線 (滿$500免加費)</SelectItem>
                      <SelectItem value="TUEN_MUN">屯門近郊 (+$100)</SelectItem>
                      <SelectItem value="SOUTH_ISLAND">西貢市中心/港島半山/南區 (+$150)</SelectItem>
                      <SelectItem value="PEAK_SAIKUNG">山頂/大潭/西貢清水灣/山區 (+$200)</SelectItem>
                      <SelectItem value="REMOTE_ISLAND">離島/大嶼山/機場/偏遠 (+$300)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">配送日期 Delivery Date</Label>
                  <Input 
                    id="deliveryDate" 
                    type="date" 
                    value={deliveryDate} 
                    onChange={e => setDeliveryDate(e.target.value)} 
                    required 
                    min={hasPreOrder ? new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="bg-background" 
                  />
                  {hasPreOrder && (
                    <p className="text-xs text-muted-foreground text-orange-600/80">包含預購商品，最快配送日為5天後</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">派送時段 Time Slot</Label>
                  <Select value={timeSlot} onValueChange={(val) => {
                    setTimeSlot(val);
                    if (val !== 'specific_hour' && val !== 'night') setSpecificTime('');
                  }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="選擇時段" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_day">全日派送 10:00–18:00</SelectItem>
                      <SelectItem value="specific_hour">指定單一小時窗口 (+$150)</SelectItem>
                      <SelectItem value="night">夜晚派送 20:00–22:00 (+$250)</SelectItem>
                      <SelectItem value="express">即日加急派送 (+$200)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {timeSlot === 'specific_hour' && (
                  <div className="space-y-2 rounded-md bg-muted/50 p-4 border border-border">
                    <Label>選擇送達時間</Label>
                    <div className="flex flex-wrap gap-2">
                      {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSpecificTime(t)}
                          className={`px-3 py-1.5 text-sm border transition-colors ${
                            specificTime === t 
                              ? 'border-[#967462] bg-[#967462] text-white font-medium' 
                              : 'border-[#e0deda] bg-transparent text-foreground hover:bg-[#e0deda]/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {specificTime && (
                      <div className="pt-2 text-sm text-muted-foreground mt-2">
                        送貨時段 : {specificTime}-{String(parseInt(specificTime.split(':')[0]) + 1).padStart(2, '0')}:00
                      </div>
                    )}
                  </div>
                )}

                {timeSlot === 'night' && (
                  <div className="space-y-2 rounded-md bg-muted/50 p-4 border border-border">
                    <Label>選擇送達時間</Label>
                    <div className="flex flex-wrap gap-2">
                      {['20:00', '21:00', '22:00'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSpecificTime(t)}
                          className={`px-3 py-1.5 text-sm border transition-colors ${
                            specificTime === t 
                              ? 'border-[#967462] bg-[#967462] text-white font-medium' 
                              : 'border-[#e0deda] bg-transparent text-foreground hover:bg-[#e0deda]/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {specificTime && (
                      <div className="pt-2 text-sm text-muted-foreground mt-2">
                        送貨時段 : {specificTime}-{String(parseInt(specificTime.split(':')[0]) + 1).padStart(2, '0')}:00
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

        </form>

        {/* 右側：訂單摘要 */}
        <div className="h-fit rounded-lg border border-border bg-card p-6 sticky top-24">
          <h2 className="text-lg font-medium text-foreground mb-4">訂單摘要 Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            {items.map(item => (
              <div key={item.product.id} className="flex gap-4">
                <div className="h-16 w-16 shrink-0 bg-muted overflow-hidden">
                  <img src={item.product.images?.[0]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <div className="text-sm font-medium">HK${(item.product.price * item.quantity).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-sm border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">小計 Subtotal</span>
              <span className="tabular-nums">HK${totalAmount.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-muted-foreground">
              <span>時段附加費 Time Surcharge</span>
              <span className="tabular-nums">HK${timeSurcharge.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-muted-foreground">
              <span>地區附加費 Area Surcharge</span>
              <span className="tabular-nums">HK${areaSurcharge.toLocaleString()}</span>
            </div>

            <div className="bg-muted/50 p-3 my-2 rounded text-xs text-muted-foreground leading-relaxed">
              系統自動比對派送時段附加費及地區遠距附加費，僅收取金額較高一項，不重複疊加收費。
              <br/>
              <span className="opacity-80">The system compares the time surcharge and remote area surcharge, only the higher amount will be charged, no double fees.</span>
            </div>

            <div className="flex justify-between font-medium">
              <span>最終配送費 Final Shipping</span>
              <span className="tabular-nums">HK${finalShippingFee.toLocaleString()}</span>
            </div>
            
            <div className="my-4 border-t border-border" />
            
            <div className="flex justify-between text-lg font-medium">
              <span className="text-foreground">總計 Total</span>
              <span className="tabular-nums text-foreground">HK${finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <Button 
            type="submit" 
            form="checkout-form"
            className="mt-6 w-full font-medium tracking-wide h-12"
            disabled={loading}
          >
            {loading ? '處理中 Processing...' : '前往付款 Proceed to Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}