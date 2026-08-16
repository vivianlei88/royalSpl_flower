import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

interface DeliveryHoliday {
  id: string;
  holiday_date: string;
  description: string | null;
}

export default function AdminDelivery() {
  const [holidays, setHolidays] = useState<DeliveryHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  async function fetchHolidays() {
    const { data, error } = await supabase
      .from('delivery_holidays')
      .select('*')
      .order('holiday_date', { ascending: true });
      
    if (error) {
      toast.error('讀取休假日失敗');
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  }

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;

    const { error } = await supabase
      .from('delivery_holidays')
      .insert({ holiday_date: newDate, description: newDesc });

    if (error) {
      toast.error('新增失敗：' + error.message);
    } else {
      toast.success('已新增休假日');
      setNewDate('');
      setNewDesc('');
      fetchHolidays();
    }
  }

  async function deleteHoliday(id: string) {
    const { error } = await supabase.from('delivery_holidays').delete().eq('id', id);
    if (error) {
      toast.error('刪除失敗');
    } else {
      toast.success('已刪除');
      fetchHolidays();
    }
  }

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight">物流配送管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>全店休假日設定 (休假日將無法於前台選擇)</CardTitle>
          <CardDescription>設定不提供配送服務的日期</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addHoliday} className="flex items-end gap-4 mb-8">
            <div className="space-y-2 flex-1">
              <Label htmlFor="date">日期</Label>
              <Input 
                id="date" 
                type="date" 
                value={newDate} 
                onChange={(e) => setNewDate(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="desc">說明 (選填)</Label>
              <Input 
                id="desc" 
                placeholder="例如：農曆新年" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)} 
              />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" /> 新增
            </Button>
          </form>

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 p-4 font-medium text-sm">
              <div className="col-span-4">日期</div>
              <div className="col-span-6">說明</div>
              <div className="col-span-2 text-right">操作</div>
            </div>
            {holidays.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">無休假日紀錄</div>
            ) : (
              holidays.map(h => (
                <div key={h.id} className="grid grid-cols-12 gap-4 border-b p-4 text-sm items-center">
                  <div className="col-span-4">{h.holiday_date}</div>
                  <div className="col-span-6">{h.description || '-'}</div>
                  <div className="col-span-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => deleteHoliday(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>分區與時段收費規則 (敬請期待)</CardTitle>
          <CardDescription>管理各地區與時段的附加費設定</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">規則配置介面建置中，目前套用系統預設收費規則。</p>
        </CardContent>
      </Card>
    </div>
  );
}