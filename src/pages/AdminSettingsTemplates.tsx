import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Image as ImageIcon, Type, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { getSiteContent, updateSiteContent } from '@/services/api';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    id: 'minimal',
    name: '簡約現代 (目前)',
    description: '以留白與清晰的資訊層級為主，設計極度克制，適合呈現高質感花藝產品。',
    color: 'bg-slate-100',
    borderColor: 'border-slate-200'
  },
  {
    id: 'elegant',
    name: '優雅古典',
    description: '使用襯線字體與柔和色彩，營造浪漫且經典的花藝品牌形象。',
    color: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
  {
    id: 'vibrant',
    name: '活潑繽紛',
    description: '充滿活力的色彩搭配，適合主打節慶、派對與歡樂氛圍的花店。',
    color: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  {
    id: 'dark',
    name: '深色尊爵',
    description: '深色主題為主，凸顯鮮花的色彩對比，帶來神秘與頂級的感受。',
    color: 'bg-slate-900 text-white',
    borderColor: 'border-slate-700'
  },
  {
    id: 'nature',
    name: '自然清新',
    description: '大地色系與綠色植物元素，強調環保、有機與自然的美感。',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  }
];

export default function AdminSettingsTemplates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState('minimal');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Template specific content state
  const [templateContent, setTemplateContent] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const content = await getSiteContent();
    setActiveTemplate(content.active_template || 'minimal');
    setTemplateContent(content);
    setLoading(false);
  }

  async function handleApplyTemplate(id: string) {
    setSaving(true);
    const success = await updateSiteContent('active_template', id);
    if (success) {
      setActiveTemplate(id);
      toast.success('網站模板已更新，正在進入編輯器...');
      navigate(`/admin/builder?template=${id}`);
    } else {
      toast.error('更新失敗');
    }
    setSaving(false);
  }

  function openEdit(id: string) {
    setEditingTemplate(id);
    setDialogOpen(true);
  }

  async function handleSaveContent() {
    if (!editingTemplate) return;
    setSaving(true);
    
    // Save the edited content for this specific template
    // In a real implementation, we would save multiple keys
    const titleKey = `template_${editingTemplate}_title`;
    const descKey = `template_${editingTemplate}_desc`;
    const imageKey = `template_${editingTemplate}_image`;
    
    await updateSiteContent(titleKey, templateContent[titleKey] || '');
    await updateSiteContent(descKey, templateContent[descKey] || '');
    await updateSiteContent(imageKey, templateContent[imageKey] || '');
    
    toast.success('模板內容已更新');
    setDialogOpen(false);
    setSaving(false);
  }

  const currentEditName = TEMPLATES.find(t => t.id === editingTemplate)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">網站模板</h1>
        <p className="text-muted-foreground text-sm mt-1">管理網站外觀，在不同主題之間切換，並自訂各模板的文字與圖片內容。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATES.map((template) => {
          const isActive = activeTemplate === template.id;
          return (
            <div 
              key={template.id} 
              className={`relative rounded-xl border-2 transition-all overflow-hidden flex flex-col h-full ${
                isActive ? 'border-primary shadow-md' : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {/* Preview Area Mock */}
              <div className={`h-40 w-full flex items-center justify-center p-6 ${template.color} border-b ${template.borderColor}`}>
                <LayoutTemplate className={`h-12 w-12 ${template.id === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
              </div>
              
              {isActive && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="h-3 w-3" /> 使用中
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-foreground">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">{template.description}</p>
                
                <div className="flex gap-3 mt-auto">
                  <Button 
                    variant={isActive ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => isActive ? navigate(`/admin/builder?template=${template.id}`) : handleApplyTemplate(template.id)}
                    disabled={saving && !isActive}
                  >
                    {isActive ? '進入編輯器' : '套用模板'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => openEdit(template.id)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    編輯內容
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯內容 - {currentEditName}</DialogTitle>
            <DialogDescription>
              自訂此模板的專屬圖片與文字內容，這些設定僅在套用此模板時生效。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2 border-b pb-2"><Type className="h-4 w-4" /> 文字內容</h4>
              
              <div className="space-y-2">
                <Label>首頁主標題</Label>
                <Input 
                  placeholder="例如：歡迎來到 Royalspl 花藝" 
                  value={templateContent[`template_${editingTemplate}_title`] || ''}
                  onChange={(e) => setTemplateContent({...templateContent, [`template_${editingTemplate}_title`]: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>首頁副標題 / 描述</Label>
                <Textarea 
                  placeholder="為生活增添一抹自然的色彩..." 
                  className="resize-none"
                  value={templateContent[`template_${editingTemplate}_desc`] || ''}
                  onChange={(e) => setTemplateContent({...templateContent, [`template_${editingTemplate}_desc`]: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2 border-b pb-2"><ImageIcon className="h-4 w-4" /> 圖片素材</h4>
              
              <div className="space-y-2">
                <Label>主視覺 Banner 圖片 URL</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/banner.jpg" 
                    value={templateContent[`template_${editingTemplate}_image`] || ''}
                    onChange={(e) => setTemplateContent({...templateContent, [`template_${editingTemplate}_image`]: e.target.value})}
                  />
                  <Button variant="outline" onClick={() => toast('請輸入圖片網址或使用外部工具上傳。')}>上傳</Button>
                </div>
                {templateContent[`template_${editingTemplate}_image`] && (
                  <div className="mt-2 rounded-md overflow-hidden h-32 border border-border">
                    <img src={templateContent[`template_${editingTemplate}_image`]} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveContent} disabled={saving}>
              {saving ? '儲存中...' : '儲存變更'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
