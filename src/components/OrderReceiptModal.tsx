import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Order } from '@/types/types';

interface OrderReceiptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export default function OrderReceiptModal({ isOpen, onOpenChange, order }: OrderReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = `
        <html>
          <head>
            <title>Receipt - ${order.id}</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { padding: 40px; font-family: sans-serif; }
                .receipt-container { max-width: 800px; margin: 0 auto; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              ${printContents}
            </div>
          </body>
        </html>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React bindings
    }
  };

  const orderDate = new Date(order.created_at);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between no-print border-b pb-4">
          <div>
            <DialogTitle>收據預覽</DialogTitle>
            <DialogDescription>
              您可以預覽或列印這張訂單的收據。
            </DialogDescription>
          </div>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            列印收據
          </Button>
        </DialogHeader>

        <div className="p-8 bg-white text-black" ref={printRef} style={{ minHeight: '800px' }}>
          {/* Header Section */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-bold mb-8">收據</h1>
              <div className="text-sm space-y-1">
                <p>發出日期：{orderDate.getFullYear()}年{orderDate.getMonth() + 1}月{orderDate.getDate()}日</p>
                <p>訂單編號 {order.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
            
            <div className="text-right text-sm space-y-1">
              <h2 className="text-lg font-bold mb-4">香港花店</h2>
              <p>RoyalSpl Flower</p>
              <br />
              <p>香港</p>
              <p>2-16 2-16, Wo Liu Hang St, Fo Tan, 香港</p>
              <p>香港</p>
              <p>royalsplshop@gmail.com</p>
              <p>+852 44346496</p>
            </div>
          </div>

          {/* Customer Section */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">顧客詳細資訊</h3>
            <div className="text-sm space-y-1">
              <p>{order.customer_name}</p>
              <p>{order.delivery_area}</p>
              <p>{order.customer_email}</p>
              <p>{order.customer_phone}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm mb-12">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="pb-2 font-bold w-3/5">項目</th>
                <th className="pb-2 font-bold w-1/5 text-center">數量</th>
                <th className="pb-2 font-bold w-1/5 text-right">價格</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-4 align-top">
                    <p className="font-medium">{item.product?.name}</p>
                    <div className="text-gray-600 mt-1 whitespace-pre-wrap">
                      <p>Size: 標準</p>
                      {(order as any).card_message && (
                        <p className="mt-2">心意卡內容（💡48小時內送貨訂單不退不換不更改送貨日期）:<br/>{(order as any).card_message}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 align-top text-center">{item.quantity}</td>
                  <td className="py-4 align-top text-right">HK${Number(item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-end mb-12">
            <div className="w-1/3 text-sm">
              <div className="flex justify-between py-1">
                <span>小計</span>
                <span>HK${Number(order.total_amount - order.final_shipping_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>運費</span>
                <span>HK${Number(order.final_shipping_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>稅金</span>
                <span>HK$0.00</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-black mt-2 font-bold text-base">
                <span>總計</span>
                <span>HK${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="mt-16">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">付款詳細資訊</h3>
            <div className="text-sm">
              <div className="flex w-1/2">
                <span className="w-1/3">{orderDate.getFullYear()}/${orderDate.getMonth() + 1}/${orderDate.getDate()}</span>
                <span className="w-1/3">{order.stripe_payment_id ? 'Stripe' : '未指定'}</span>
                <span className="w-1/3 text-right">HK${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
             <div className="flex justify-between w-1/3 text-sm font-bold border-t-2 border-black pt-2">
                <span>付款總額</span>
                <span>HK${Number(order.total_amount).toFixed(2)}</span>
             </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}