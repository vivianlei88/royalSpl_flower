import { useEffect, useState, useRef, useMemo } from 'react';
import { Check, Download, Upload, Calendar as CalendarIcon, Edit, Eye, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import OrderReceiptModal from '@/components/OrderReceiptModal';
import { getOrders, updateOrderStatus, updateOrderDetails, getOrderLogs, deleteOrder, deleteOrders } from '@/services/api';
import type { Order, OrderLog } from '@/types/types';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const statusOptions = [
  { value: 'pending', label: '待付款' },
  { value: 'processing', label: '處理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering and Selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  
  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<Partial<Order>>({});
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogLoading, setIsLogLoading] = useState(false);
  // 即時通知 badge：未讀新訂單/付款數
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 訂閱 orders 表 INSERT（新訂單）+ UPDATE（付款狀態變更）
    const ordersSubscription = supabase
      .channel("admin:orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setUnreadCount((c) => c + 1);
          toast.success(`🌸 收到新訂單！`, {
            description: `${newOrder.customer_name}  ·  HK$${Number(newOrder.total_amount).toLocaleString()}`,
            duration: 6000,
            action: {
              label: "查看",
              onClick: () => setUnreadCount(0),
            },
          });
          // 直接插入到列表頂部，避免重新 fetch
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          const old = payload.old as Partial<Order>;
          // 付款狀態從 unpaid → paid 時提示
          if (old.payment_status !== "paid" && updated.payment_status === "paid") {
            setUnreadCount((c) => c + 1);
            toast.success(`✅ 付款已確認`, {
              description: `${updated.customer_name}  ·  HK$${Number(updated.total_amount).toLocaleString()}`,
              duration: 6000,
            });
          }
          // 就地更新訂單狀態，不需要重新 fetch
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getOrders();
    setOrders(data);
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: string) {
    const success = await updateOrderStatus(id, status);
    if (success) {
      setOrders(orders.map(o => o.id === id ? { ...o, status } as Order : o));
      toast.success('訂單狀態已更新');
    } else {
      toast.error('狀態更新失敗');
    }
  }

  async function handlePaymentStatusChange(id: string, paymentStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, payment_status: paymentStatus } as Order : o));
      toast.success('付款狀態已更新');
    } else {
      toast.error('付款狀態更新失敗');
    }
  }

  const exportCSV = () => {
    if (orders.length === 0) {
      toast.error('沒有可匯出的訂單資料');
      return;
    }

    const csvData = orders.map(order => ({
      '訂單編號': order.id,
      '客戶名稱': order.customer_name,
      '客戶電話': order.customer_phone,
      '客戶信箱': order.customer_email,
      '總金額 (HK$)': order.total_amount,
      '付款狀態': order.payment_status === 'paid' ? '已付款' : '未付款',
      '訂單狀態': order.status,
      'Stripe 交易序號': order.stripe_payment_id || '',
      '送貨日期': order.delivery_date || '',
      '送貨時段': order.delivery_time_slot || '',
      '指定時間': (order as any).specific_time || '',
      '送貨地區': order.delivery_area || '',
      '運費與附加費': order.final_shipping_fee || 0,
      '心意卡內容': (order as any).card_message || '',
      '備註': (order as any).remarks || '',
      '建立時間': new Date(order.created_at).toLocaleString('zh-HK')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('訂單已匯出');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let updatedCount = 0;
          let failedCount = 0;

          const reverseStatusMap: Record<string, string> = {
            '待付款': 'pending',
            '處理中': 'processing',
            '已完成': 'completed',
            '已取消': 'cancelled',
            'pending': 'pending',
            'processing': 'processing',
            'completed': 'completed',
            'cancelled': 'cancelled'
          };

          toast.loading('正在批次更新訂單狀態...', { id: 'csv-import' });

          const updatePromises = rows.map(async (row) => {
            const id = row['原始 ID (勿刪)'] || row['訂單編號'];
            const rawStatus = row['訂單狀態'];
            if (!id || !rawStatus) return null;
            
            const status = reverseStatusMap[rawStatus] || rawStatus;
            
            // Check if status is changed
            const existingOrder = orders.find(o => o.id === id);
            if (existingOrder && existingOrder.status !== status) {
              const success = await updateOrderStatus(id, status);
              if (success) {
                updatedCount++;
                return { id, status };
              } else {
                failedCount++;
              }
            }
            return null;
          });

          const updates = (await Promise.all(updatePromises)).filter(Boolean) as {id: string, status: string}[];

          if (updatedCount > 0) {
            setOrders(prev => prev.map(o => {
              const update = updates.find(u => u.id === o.id);
              return update ? { ...o, status: update.status } as Order : o;
            }));
            toast.success(`成功更新 ${updatedCount} 筆訂單狀態`, { id: 'csv-import' });
          } else if (failedCount === 0) {
            toast.success('沒有需要更新的訂單狀態（狀態皆為最新）', { id: 'csv-import' });
          }

          if (failedCount > 0) {
            toast.error(`完成，但有 ${failedCount} 筆訂單更新失敗`, { id: 'csv-import' });
          }
        } catch (err: any) {
          toast.error(`處理 CSV 時發生錯誤: ${err.message}`, { id: 'csv-import' });
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error) => {
        toast.error(`匯入失敗: ${error.message}`);
      }
    });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Date filter
      if (dateRange.from) {
        const orderDate = new Date(order.created_at);
        if (dateRange.to) {
          if (!isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) {
            return false;
          }
        } else {
          if (orderDate < startOfDay(dateRange.from)) {
            return false;
          }
        }
      }
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      // Payment filter
      if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) return false;
      return true;
    });
  }, [orders, dateRange, statusFilter, paymentFilter]);

  // 統計數字
  const orderStats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    unpaid: orders.filter(o => o.payment_status !== 'paid').length,
  }), [orders]);

  const toggleOrderSelection = (id: string) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedOrderIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleEditClick = async (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email || '',
      delivery_date: order.delivery_date || '',
      delivery_time_slot: order.delivery_time_slot || '',
      delivery_area: order.delivery_area || '',
      final_shipping_fee: order.final_shipping_fee,
    });
    setIsEditModalOpen(true);
    
    // Load logs
    setIsLogLoading(true);
    const logs = await getOrderLogs(order.id);
    setOrderLogs(logs);
    setIsLogLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    const success = await updateOrderDetails(editingOrder.id, editForm, editingOrder);
    if (success) {
      toast.success('訂單資料已更新');
      setOrders(orders.map(o => o.id === editingOrder.id ? { ...o, ...editForm } as Order : o));
      setIsEditModalOpen(false);
    } else {
      toast.error('更新訂單失敗');
    }
  };
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除這筆訂單嗎？此操作無法還原。')) {
      const success = await deleteOrder(id);
      if (success) {
        setOrders(orders.filter(o => o.id !== id));
        toast.success('訂單已刪除');
        if (selectedOrderIds.has(id)) {
          const newSelection = new Set(selectedOrderIds);
          newSelection.delete(id);
          setSelectedOrderIds(newSelection);
        }
      } else {
        toast.error('刪除訂單失敗');
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedOrderIds.size === 0) return;
    if (window.confirm(`確定要刪除選取的 ${selectedOrderIds.size} 筆訂單嗎？此操作無法還原。`)) {
      const ids = Array.from(selectedOrderIds);
      const success = await deleteOrders(ids);
      if (success) {
        setOrders(orders.filter(o => !selectedOrderIds.has(o.id)));
        setSelectedOrderIds(new Set());
        toast.success(`成功刪除 ${ids.length} 筆訂單`);
      } else {
        toast.error('批次刪除失敗');
      }
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">訂單管理</h1>
            <p className="text-muted-foreground">管理客戶訂單與付款狀態</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => setUnreadCount(0)}
              className="relative flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {unreadCount} 則新通知
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "PPP", { locale: zhTW })} -{" "}
                      {format(dateRange.to, "PPP", { locale: zhTW })}
                    </>
                  ) : (
                    format(dateRange.from, "PPP", { locale: zhTW })
                  )
                ) : (
                  <span>選擇日期範圍</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportCSV}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            匯入 CSV
          </Button>
          <Button onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            匯出 CSV
          </Button>
          {selectedOrderIds.size > 0 && (
            <Button variant="destructive" onClick={handleBatchDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              批次刪除 ({selectedOrderIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '全部訂單', value: orderStats.total, color: 'text-foreground', filter: () => { setStatusFilter('all'); setPaymentFilter('all'); } },
          { label: '待付款', value: orderStats.pending, color: 'text-yellow-600', filter: () => { setStatusFilter('pending'); setPaymentFilter('all'); } },
          { label: '處理中', value: orderStats.processing, color: 'text-blue-600', filter: () => { setStatusFilter('processing'); setPaymentFilter('all'); } },
          { label: '已完成', value: orderStats.completed, color: 'text-emerald-600', filter: () => { setStatusFilter('completed'); setPaymentFilter('all'); } },
          { label: '已付款', value: orderStats.paid, color: 'text-emerald-600', filter: () => { setStatusFilter('all'); setPaymentFilter('paid'); } },
        ].map(({ label, value, color, filter }) => (
          <button
            key={label}
            onClick={filter}
            className="bg-card border border-border rounded-lg p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          </button>
        ))}
      </div>

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-lg px-4 py-3">
        <span className="text-sm text-muted-foreground shrink-0">篩選：</span>
        {/* 訂單狀態篩選 */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="訂單狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="pending">待付款</SelectItem>
            <SelectItem value="processing">處理中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
        {/* 付款狀態篩選 */}
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="付款狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部付款</SelectItem>
            <SelectItem value="paid">已付款</SelectItem>
            <SelectItem value="pending">未付款</SelectItem>
          </SelectContent>
        </Select>
        {/* 清除篩選 */}
        {(statusFilter !== 'all' || paymentFilter !== 'all' || dateRange.from) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setStatusFilter('all'); setPaymentFilter('all'); setDateRange({ from: undefined, to: undefined }); }}
          >
            清除篩選
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground shrink-0">
          顯示 {filteredOrders.length} / {orders.length} 筆
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox 
                      checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleAllSelection}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">訂單編號</TableHead>
                  <TableHead className="whitespace-nowrap">客戶</TableHead>
                  <TableHead className="whitespace-nowrap">產品</TableHead>
                  <TableHead className="whitespace-nowrap">總計 (HK$)</TableHead>
                  <TableHead className="whitespace-nowrap">付款狀態</TableHead>
                  <TableHead className="whitespace-nowrap">Stripe 交易序號</TableHead>
                  <TableHead className="whitespace-nowrap">日期</TableHead>
                  <TableHead className="whitespace-nowrap">訂單狀態</TableHead>
                  <TableHead className="whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className={`cursor-pointer ${selectedOrderIds.has(order.id) ? "bg-muted/50" : "hover:bg-muted/50"}`}
                      onClick={() => handleEditClick(order)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-foreground">
                        {order.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {order.customer_name}<br/>
                        <span className="text-xs text-gray-400">{order.customer_phone}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-1 max-w-[200px]">
                            {order.items.map((item) => (
                              <div key={item.id} className="truncate" title={item.product?.name}>
                                {item.product?.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground font-medium">
                        HK${Number(order.total_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={order.payment_status || 'pending'}
                          onValueChange={(val) => handlePaymentStatusChange(order.id, val)}
                        >
                          <SelectTrigger className={`w-28 text-xs h-7 ${
                            order.payment_status === 'paid'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : 'border-yellow-300 text-yellow-700 bg-yellow-50'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">未付款</SelectItem>
                            <SelectItem value="paid">已付款</SelectItem>
                            <SelectItem value="refunded">已退款</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs font-mono">
                        {order.stripe_payment_id || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('zh-HK')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(order)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(order.id, e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      暫無訂單。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* Edit Order Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row justify-between items-center pr-8">
            <div>
              <DialogTitle>編輯訂單：{editingOrder?.id.substring(0, 8).toUpperCase()}</DialogTitle>
              <DialogDescription>
                您可以修改訂單資料，所有的變更都將被記錄在日誌中。
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsReceiptModalOpen(true)}>
              <Printer className="w-4 h-4 mr-2" />
              查看收據
            </Button>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column - Edit Form */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">基本資料</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>收件人姓名</Label>
                  <Input 
                    value={editForm.customer_name || ''} 
                    onChange={e => setEditForm({...editForm, customer_name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>收件人電話</Label>
                  <Input 
                    value={editForm.customer_phone || ''} 
                    onChange={e => setEditForm({...editForm, customer_phone: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>收件人信箱</Label>
                <Input 
                  value={editForm.customer_email || ''} 
                  onChange={e => setEditForm({...editForm, customer_email: e.target.value})} 
                />
              </div>
              
              <h3 className="font-semibold text-lg border-b pb-2 mt-6">訂購商品</h3>
              <div className="space-y-2 bg-muted/20 p-4 rounded-md">
                {editingOrder?.items && editingOrder.items.length > 0 ? (
                  editingOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.product?.sku_code || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p>x{item.quantity}</p>
                        <p className="font-medium text-primary">HK${Number(item.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">無商品資料</p>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-semibold mt-2">
                  <span>總計</span>
                  <span className="text-primary text-lg">HK${Number(editingOrder?.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <h3 className="font-semibold text-lg border-b pb-2 mt-6">配送資料</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>送貨日期</Label>
                  <Input 
                    type="date"
                    value={editForm.delivery_date || ''} 
                    onChange={e => setEditForm({...editForm, delivery_date: e.target.value})} 
                  />
      <OrderReceiptModal 
        isOpen={isReceiptModalOpen} 
        onOpenChange={setIsReceiptModalOpen} 
        order={editingOrder} 
      />
                </div>
                <div className="space-y-2">
                  <Label>送貨時段</Label>
                  <Input 
                    value={editForm.delivery_time_slot || ''} 
                    onChange={e => setEditForm({...editForm, delivery_time_slot: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>送貨地區</Label>
                <Input 
                  value={editForm.delivery_area || ''} 
                  onChange={e => setEditForm({...editForm, delivery_area: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>運費 (HK$)</Label>
                <Input 
                  type="number"
                  value={editForm.final_shipping_fee || 0} 
                  onChange={e => setEditForm({...editForm, final_shipping_fee: Number(e.target.value)})} 
                />
              </div>
              
              <h3 className="font-semibold text-lg border-b pb-2 mt-6">備註與訊息</h3>
              <div className="space-y-2">
                <Label>心意卡內容</Label>
                <Textarea 
                  value={(editForm as any).card_message || ''} 
                  onChange={e => setEditForm({...editForm, card_message: e.target.value} as any)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>備註</Label>
                <Textarea 
                  value={(editForm as any).remarks || ''} 
                  onChange={e => setEditForm({...editForm, remarks: e.target.value} as any)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            
            {/* Right Column - Logs */}
            <div className="space-y-4 flex flex-col h-[calc(100vh-280px)]">
              <h3 className="font-semibold text-lg border-b pb-2">變更紀錄</h3>
              <div className="bg-muted/30 rounded-md p-4 flex-1 overflow-y-auto space-y-4">
                {isLogLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">載入紀錄中...</p>
                ) : orderLogs.length > 0 ? (
                  orderLogs.map((log) => (
                    <div key={log.id} className="bg-background border rounded-md p-3 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-primary">{log.admin_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('zh-HK')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(log.changes).map(([key, change]: [string, any]) => (
                          <div key={key} className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-1">
                            <span className="text-muted-foreground">{key}:</span>
                            {typeof change === 'object' && change !== null && 'old' in change ? (
                              <span className="break-all">
                                <span className="line-through text-red-500 mr-2">{String(change.old || '空')}</span>
                                ➔ <span className="text-emerald-600 ml-2">{String(change.new || '空')}</span>
                              </span>
                            ) : (
                              <span>{String(change)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">尚無變更紀錄</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>取消</Button>
            <Button onClick={handleSaveEdit}>儲存變更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
