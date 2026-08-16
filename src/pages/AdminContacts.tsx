import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Mail, UserPlus, Filter, Search, Download, 
  MoreHorizontal, ChevronDown, CheckSquare, Clock, FileText, Upload
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { toast } from 'sonner';

// Dummy data
const initialContacts = [
  { id: 1, name: '林小明', email: 'lin.xiaoming@example.com', phone: '0912345678', lastActive: '2023-10-25', orders: 3, tags: ['VIP'] },
  { id: 2, name: '陳美玲', email: 'chen.meiling@example.com', phone: '0987654321', lastActive: '2023-10-24', orders: 1, tags: ['新客戶'] },
  { id: 3, name: '王大志', email: 'wang.dazhi@example.com', phone: '0933221100', lastActive: '2023-10-20', orders: 0, tags: [] },
  { id: 4, name: '李佳蓉', email: 'li.jiarong@example.com', phone: '0955667788', lastActive: '2023-10-15', orders: 5, tags: ['常客'] },
];

export default function AdminContacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = contacts.map(c => ({
      ...c,
      tags: c.tags.join(';')
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_export.csv';
    link.click();
    toast.success('匯出成功');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newContacts = results.data.map((row: any, index) => ({
            id: Date.now() + index,
            name: row.name || 'Unknown',
            email: row.email || '',
            phone: row.phone || '',
            lastActive: row.lastActive || new Date().toISOString().split('T')[0],
            orders: parseInt(row.orders) || 0,
            tags: row.tags ? row.tags.split(';') : []
          }));
          
          setContacts(prev => [...newContacts, ...prev]);
          toast.success(`成功匯入 ${newContacts.length} 筆聯絡人資料`);
        } catch (error) {
          toast.error('匯入資料格式有誤');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        toast.error(`匯入失敗: ${error.message}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">聯絡人</h1>
          <p className="text-muted-foreground text-sm">管理並追蹤顧客、潛在顧客和網站會員。 <a href="#" className="text-blue-600 hover:underline">瞭解更多</a></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full bg-white text-blue-600 border-gray-200">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>管理自訂欄位</DropdownMenuItem>
              <DropdownMenuItem>管理標籤</DropdownMenuItem>
              <DropdownMenuItem>任務與提醒</DropdownMenuItem>
              <DropdownMenuItem>工作流程</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>網站會員設定</DropdownMenuItem>
              <DropdownMenuItem>測試網站流程</DropdownMenuItem>
              <DropdownMenuItem>隱私權和資料保護</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="rounded-full bg-white text-blue-600 border-gray-200" type="button" onClick={() => {}}>管理分段</Button>
          <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white border-0" type="button" onClick={() => {}}>建立新項目 <ChevronDown className="ml-2 h-4 w-4" /></Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">55 位網站會員</span>
          <Button variant="link" className="h-auto p-0 text-blue-600 ml-auto font-normal" type="button" onClick={() => {}}>查看並管理 &gt;</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">概覽</h2>
          
          <div className="flex items-center gap-3 text-sm mb-4">
            <Button variant="outline" size="sm" className="rounded-full h-8 px-4 border-gray-200 font-medium" type="button" onClick={() => {}}>擴大聯絡人清單</Button>
            <Button size="sm" className="rounded-full h-8 px-4 bg-gray-900 text-white hover:bg-gray-800 font-medium" type="button" onClick={() => {}}>追蹤並吸引受眾</Button>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            使用分段、標籤和表格檢視，將聯絡人整理為不同受眾。 <a href="#" className="text-blue-600 hover:underline">了解更多</a>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 */}
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 px-4 pt-4">
                <CardTitle className="text-[15px] font-bold text-gray-900">電子郵件訂閱者</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-600 -mr-2" type="button" onClick={() => {}}><MoreHorizontal className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-gray-900">33</div>
                <div className="flex items-center mt-6 text-sm text-gray-500">
                  <Table className="mr-2 h-4 w-4" /> 表格檢視
                </div>
              </CardContent>
            </Card>
            
            {/* Card 2 */}
            <Card className="shadow-none border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 px-4 pt-4">
                <CardTitle className="text-[15px] font-bold text-gray-900">立即訂購 T 恤</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-600 -mr-2" type="button" onClick={() => {}}><MoreHorizontal className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="flex items-center mt-6 text-sm text-gray-500">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  標籤
                </div>
              </CardContent>
            </Card>

            {/* Empty Space for Grid alignment like the image */}
            <div className="hidden lg:block"></div>

            {/* Card 3 */}
            <Card className="shadow-none border border-gray-200 bg-gray-50/30">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 px-4 pt-4">
                <CardTitle className="text-[15px] font-bold text-gray-900">第一次預訂的時段</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-600 -mr-2" type="button" onClick={() => {}}><MoreHorizontal className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-6 h-8 px-4 border-0" type="button" onClick={() => {}}>
                  <div className="mr-2 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center relative"><div className="w-1.5 h-1.5 bg-white rounded-full absolute -right-0.5 -bottom-0.5"></div></div>
                  建立分段
                </Button>
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="shadow-none border border-gray-200 bg-gray-50/30">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 px-4 pt-4">
                <CardTitle className="text-[15px] font-bold text-gray-900">近期沒有時段</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 rounded-full hover:bg-blue-50 hover:text-blue-600 -mr-2" type="button" onClick={() => {}}><MoreHorizontal className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-6 h-8 px-4 border-0" type="button" onClick={() => {}}>
                  <div className="mr-2 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center relative"><div className="w-1.5 h-1.5 bg-white rounded-full absolute -right-0.5 -bottom-0.5"></div></div>
                  建立分段
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-white">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" className="font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 px-3 py-1.5 h-auto text-sm" type="button" onClick={() => {}}>所有聯絡人 (264) <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-blue-600" /></Button>
              <Button variant="ghost" className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 px-3 py-1.5 h-auto text-sm font-normal" type="button" onClick={() => {}}>管理檢視 <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-blue-600" /></Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-3 border-gray-200 text-blue-600 font-normal hover:bg-blue-50 hover:text-blue-700 rounded-full" type="button" onClick={() => {}}>
                <Filter className="mr-2 h-3.5 w-3.5" /> 篩選條件
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-gray-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-full" type="button" onClick={() => {}}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3C4.67157 3 4 3.67157 4 4.5C4 5.32843 4.67157 6 5.5 6C6.32843 6 7 5.32843 7 4.5C7 3.67157 6.32843 3 5.5 3ZM3 5C3.01671 5 3.03323 4.99918 3.04952 4.99758C3.28022 6.1399 4.28967 7 5.5 7C6.71033 7 7.71978 6.1399 7.95048 4.99758C7.96677 4.99918 7.98329 5 8 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H8C7.98329 4 7.96677 4.00082 7.95048 4.00242C7.71978 2.86009 6.71033 2 5.5 2C4.28967 2 3.28022 2.86009 3.04952 4.00242C3.03323 4.00082 3.01671 4 3 4H1.5C1.22386 4 1 4.22386 1 4.5C1 4.77614 1.22386 5 1.5 5H3ZM11.9505 10.9976C11.7198 12.1399 10.7103 13 9.5 13C8.28967 13 7.28022 12.1399 7.04952 10.9976C7.03323 10.9992 7.01671 11 7 11H1.5C1.22386 11 1 10.7761 1 10.5C1 10.2239 1.22386 10 1.5 10H7C7.01671 10 7.03323 10.0008 7.04952 10.0024C7.28022 8.8601 8.28967 8 9.5 8C10.7103 8 11.7198 8.8601 11.9505 10.0024C11.9668 10.0008 11.9833 10 12 10H13.5C13.7761 10 14 10.2239 14 10.5C14 10.7761 13.7761 11 13.5 11H12C11.9833 11 11.9668 10.9992 11.9505 10.9976ZM9.5 9C8.67157 9 8 9.67157 8 10.5C8 11.3284 8.67157 12 9.5 12C10.3284 12 11 11.3284 11 10.5C11 9.67157 10.3284 9 9.5 9Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
                <Input type="search" placeholder="搜尋..." className="h-9 w-64 pl-9 rounded-full border-gray-200 focus-visible:ring-blue-600" />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 border-gray-200 text-blue-600 font-normal hover:bg-blue-50 hover:text-blue-700 rounded-full" type="button">
                    匯入 / 匯出 <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> 匯入聯絡人
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> 匯出聯絡人
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImport}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 hover:bg-transparent">
                  <TableHead className="w-12 px-4"><Checkbox className="border-gray-300" /></TableHead>
                  <TableHead className="text-gray-500 font-normal h-10 px-4">名稱</TableHead>
                  <TableHead className="text-gray-500 font-normal h-10 px-4">電子郵件</TableHead>
                  <TableHead className="text-gray-500 font-normal h-10 px-4">電話</TableHead>
                  <TableHead className="text-gray-500 font-normal h-10 px-4">最後活動時間</TableHead>
                  <TableHead className="text-gray-500 font-normal h-10 px-4">標籤</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="border-b border-gray-100 hover:bg-gray-50/50 group">
                    <TableCell className="px-4"><Checkbox className="border-gray-300 group-hover:border-blue-500 transition-colors" /></TableCell>
                    <TableCell className="font-bold text-gray-900 px-4 py-3">{contact.name}</TableCell>
                    <TableCell className="text-gray-600 px-4">{contact.email}</TableCell>
                    <TableCell className="text-gray-600 px-4">{contact.phone}</TableCell>
                    <TableCell className="text-gray-600 px-4">{contact.lastActive}</TableCell>
                    <TableCell className="px-4">
                      {contact.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-sm border border-gray-200 px-2 py-0.5 text-xs font-normal text-gray-700 mr-1 bg-white shadow-sm">
                          <svg className="mr-1 h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                          {tag}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}