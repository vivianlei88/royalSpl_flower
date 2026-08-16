import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getInventory, updateInventory } from '@/services/api';
// @ts-ignore
import type { Inventory } from '@/types/types';
import { toast } from 'sonner';

export default function AdminInventory() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [stock, setStock] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getInventory();
    setInventory(data);
    setLoading(false);
  }

  function openEdit(item: Inventory) {
    setEditingItem(item);
    setStock(String(item.stock_quantity));
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!editingItem) return;

    const stockQty = parseInt(stock, 10);
    if (isNaN(stockQty) || stockQty < 0) {
      toast.error('請輸入有效的庫存數量。');
      return;
    }

    const success = await updateInventory(editingItem.product_id, stockQty);

    if (success) {
      toast.success('庫存已更新。');
      setDialogOpen(false);
      loadData();
    } else {
      toast.error('庫存更新失敗。');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">庫存管理</h1>
        <p className="text-muted-foreground">管理商店產品庫存</p>
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
                  <TableHead className="whitespace-nowrap">產品 SKU</TableHead>
                  <TableHead className="whitespace-nowrap">產品名稱</TableHead>
                  <TableHead className="whitespace-nowrap">目前庫存</TableHead>
                  <TableHead className="whitespace-nowrap">更新時間</TableHead>
                  <TableHead className="whitespace-nowrap">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length > 0 ? (
                  inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {item.product?.sku_code || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium text-foreground">
                        {item.product?.name || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.stock_quantity > 10 ? 'bg-green-100 text-green-800' :
                          item.stock_quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.stock_quantity} 件
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(item.updated_at).toLocaleString('zh-HK')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">編輯庫存</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      暫無庫存資料。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>編輯庫存</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">正在編輯：</p>
                <p className="font-medium text-foreground">{editingItem.product?.name}</p>
                {editingItem.product?.sku_code && (
                  <p className="text-sm font-mono text-muted-foreground">{editingItem.product.sku_code}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">庫存數量</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">更新庫存</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}