import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, MoreHorizontal, ChevronDown, Settings, Plus, X, ArrowUpCircle, Gift, Star, Filter
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminLoyalty() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">酬賓計劃</h1>
          <Badge variant="outline" className="text-gray-600 border-gray-200 bg-white font-normal px-2 py-0">作用中</Badge>
          <span className="text-muted-foreground text-sm ml-2">為賺取的點數提供獎勵，激勵顧客再次光顧。 <a href="#" className="text-blue-600 hover:underline">了解更多</a></span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full bg-white text-blue-600 border-gray-200" type="button" onClick={() => {}}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="rounded-full bg-white text-blue-600 border-gray-200 font-medium" type="button" onClick={() => {}}>
            <Settings className="mr-2 h-4 w-4" /> 管理計劃
          </Button>
          <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white border-0 px-6 font-medium" type="button" onClick={() => {}}>
            <Plus className="mr-1 h-4 w-4" /> 給予點數
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Banner 1 */}
        <Card className="shadow-sm border border-gray-200 rounded-xl relative overflow-hidden bg-white">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:bg-gray-100 rounded-full z-10" type="button" onClick={() => {}}><X className="h-4 w-4" /></Button>
          <div className="absolute top-0 left-0 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 tracking-wider">必不可少</div>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2 mt-4">寄送自動電子郵件</h3>
            <p className="text-sm text-gray-500 mb-6">鼓勵顧客多下更多訂單並兌換點數。</p>
            <div className="flex items-center gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium h-9 px-5" type="button" onClick={() => {}}>管理電子郵件</Button>
              <Button variant="outline" className="border-gray-200 text-blue-600 hover:bg-blue-50 rounded-full font-medium h-9 px-5" type="button" onClick={() => {}}>瞭解更多</Button>
            </div>
            
            <div className="absolute right-0 bottom-4 w-24 h-24 pointer-events-none">
              <div className="relative w-full h-full">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 40 L50 60 L80 40" stroke="#a0c4ff" strokeWidth="4" strokeLinejoin="round" />
                  <path d="M20 40 V70 H80 V40" fill="#e0f2fe" />
                  <path d="M50 60 L20 70 M50 60 L80 70" stroke="#a0c4ff" strokeWidth="2" />
                  <circle cx="50" cy="35" r="15" fill="#facc15" />
                  <path d="M50 25 L50 45 M40 35 L60 35 M43 28 L57 42 M43 42 L57 28" stroke="#ca8a04" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banner 2 */}
        <Card className="shadow-sm border border-gray-200 rounded-xl relative overflow-hidden bg-white">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:bg-gray-100 rounded-full z-10" type="button" onClick={() => {}}><X className="h-4 w-4" /></Button>
          <CardContent className="p-6 relative">
            <h3 className="font-bold text-lg text-gray-900 mb-2">第 10 位忠實顧客出現啦!</h3>
            <p className="text-sm text-gray-500 mb-6 pr-20">歡迎為 Wix 酬賓計劃評分，分享您的體驗。</p>
            <div className="flex items-center gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium h-9 px-5" type="button" onClick={() => {}}>留下評價</Button>
            </div>
            
            <div className="absolute right-4 bottom-4 w-20 h-24 pointer-events-none">
              <div className="relative w-full h-full">
                <div className="absolute top-0 right-0 w-24 h-12 bg-blue-100 rounded-lg flex items-center justify-center -translate-y-4 translate-x-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-blue-600 text-blue-600" />)}
                  </div>
                  <div className="absolute bottom-[-6px] left-10 w-3 h-3 bg-blue-100 rotate-45"></div>
                </div>
                <div className="absolute bottom-0 right-4 w-12 h-12 bg-yellow-400 rounded-t-full"></div>
                <div className="absolute bottom-12 right-6 w-8 h-8 bg-gray-800 rounded-full"></div>
                <div className="absolute bottom-10 right-2 w-2 h-4 bg-orange-300 rounded-full rotate-12"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banner 3 */}
        <Card className="shadow-sm border border-gray-200 rounded-xl relative overflow-hidden bg-white">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2">在計畫中新增等級</h3>
            <p className="text-sm text-gray-500 mb-6">顧客的忠誠度越高，其可享有的獎勵就越優厚。</p>
            <div className="flex items-center gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium h-9 px-5" type="button" onClick={() => {}}>設立等級</Button>
              <Button variant="outline" className="border-gray-200 text-blue-600 hover:bg-blue-50 rounded-full font-medium h-9 px-5" type="button" onClick={() => {}}>瞭解更多</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">計劃概覽</h2>
          <Button variant="outline" className="border-gray-200 hover:bg-gray-50 rounded-full font-normal h-9" type="button" onClick={() => {}}>管理計劃</Button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-sm text-gray-500 mb-2">計劃類型</p>
            <p className="font-bold text-gray-900">非等級式</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">點數圖示與名稱</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center text-gray-400 text-xs font-bold">★</div>
              <p className="font-bold text-gray-900">點數</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">點數有效期間</p>
            <p className="font-bold text-gray-900">永不過期</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">電子郵件</p>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0 font-normal px-2 py-0">1/3 已啟用</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">點數資料</h2>
        </div>
        <div className="py-8 px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 text-center gap-y-8">
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">53,727</p>
            <p className="text-sm text-gray-500">已提供的點數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">-</p>
            <p className="text-sm text-gray-500">已兌換的點數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">53,727</p>
            <p className="text-sm text-gray-500">未兌換的點數</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">顧客</h2>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0 rounded-full font-normal">59</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-gray-200 text-blue-600 hover:bg-blue-50 bg-white" type="button" onClick={() => {}}>
              <ArrowUpCircle className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
              <Input type="search" placeholder="搜尋..." className="h-9 w-56 pl-9 rounded-full border-gray-200 focus-visible:ring-blue-600" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50 bg-white" type="button" onClick={() => {}}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-transparent border-b border-gray-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-gray-900 py-3 h-10 px-4">顧客</TableHead>
              <TableHead className="font-bold text-gray-900 py-3 h-10 px-4">目前擁有點數</TableHead>
              <TableHead className="font-bold text-gray-900 py-3 h-10 px-4">歷史點數總和</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-b border-gray-100">
              <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                尚未有顧客點數紀錄
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}