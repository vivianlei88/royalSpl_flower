import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Smartphone, Save, Globe, Type, Image as ImageIcon, MousePointerClick, AlignLeft, Layers, Component, ArrowLeft, Trash2 } from 'lucide-react';
import { Rnd } from '@/components/common/RndWrapper';
import { v4 as uuidv4 } from 'uuid';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getSiteContent } from '@/services/api';

interface Layout {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Block {
  id: string;
  type: string;
  content: string;
  desktop: Layout;
  mobile: Layout;
  style: Record<string, string>;
}

const TEMPLATE_CONFIGS: Record<string, { bg: string, blocks: Block[] }> = {
  minimal: {
    bg: '#ffffff',
    blocks: [
      { id: 't1', type: 'text', content: 'RoyalSpl 簡約現代', desktop: {x: 50, y: 50, w: 400, h: 60}, mobile: {x: 20, y: 20, w: 300, h: 50}, style: {fontSize: '36px', fontWeight: 'bold', color: '#1e293b'} },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=2000&auto=format&fit=crop', desktop: {x: 50, y: 130, w: 800, h: 400}, mobile: {x: 0, y: 80, w: 375, h: 250}, style: {objectFit: 'cover', borderRadius: '8px'} }
    ]
  },
  elegant: {
    bg: '#fff1f2',
    blocks: [
      { id: 't1', type: 'text', content: 'RoyalSpl 優雅古典', desktop: {x: 50, y: 50, w: 400, h: 60}, mobile: {x: 20, y: 20, w: 300, h: 50}, style: {fontSize: '36px', fontWeight: 'serif', color: '#881337'} },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=2000&auto=format&fit=crop', desktop: {x: 50, y: 130, w: 800, h: 400}, mobile: {x: 0, y: 80, w: 375, h: 250}, style: {objectFit: 'cover', borderRadius: '16px'} }
    ]
  },
  vibrant: {
    bg: '#fffbeb',
    blocks: [
      { id: 't1', type: 'text', content: 'RoyalSpl 活潑繽紛', desktop: {x: 50, y: 50, w: 400, h: 60}, mobile: {x: 20, y: 20, w: 300, h: 50}, style: {fontSize: '36px', fontWeight: '900', color: '#d97706'} },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?q=80&w=2000&auto=format&fit=crop', desktop: {x: 50, y: 130, w: 800, h: 400}, mobile: {x: 0, y: 80, w: 375, h: 250}, style: {objectFit: 'cover', borderRadius: '24px'} }
    ]
  },
  dark: {
    bg: '#0f172a',
    blocks: [
      { id: 't1', type: 'text', content: 'RoyalSpl 深色尊爵', desktop: {x: 50, y: 50, w: 400, h: 60}, mobile: {x: 20, y: 20, w: 300, h: 50}, style: {fontSize: '36px', fontWeight: 'bold', color: '#f8fafc'} },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1508611440059-8ed6220817c1?q=80&w=2000&auto=format&fit=crop', desktop: {x: 50, y: 130, w: 800, h: 400}, mobile: {x: 0, y: 80, w: 375, h: 250}, style: {objectFit: 'cover', borderRadius: '4px'} },
      { id: 'b1', type: 'button', content: '探索系列', desktop: {x: 50, y: 560, w: 150, h: 50}, mobile: {x: 20, y: 350, w: 150, h: 45}, style: {backgroundColor: '#e2e8f0', color: '#0f172a', borderRadius: '4px'} }
    ]
  },
  nature: {
    bg: '#ecfdf5',
    blocks: [
      { id: 't1', type: 'text', content: 'RoyalSpl 自然清新', desktop: {x: 50, y: 50, w: 400, h: 60}, mobile: {x: 20, y: 20, w: 300, h: 50}, style: {fontSize: '36px', fontWeight: 'normal', color: '#065f46'} },
      { id: 'i1', type: 'image', content: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?q=80&w=2000&auto=format&fit=crop', desktop: {x: 50, y: 130, w: 800, h: 400}, mobile: {x: 0, y: 80, w: 375, h: 250}, style: {objectFit: 'cover', borderRadius: '100px'} }
    ]
  }
};

const TEMPLATE_NAMES: Record<string, string> = {
  minimal: '簡約現代',
  elegant: '優雅古典',
  vibrant: '活潑繽紛',
  dark: '深色尊爵',
  nature: '自然清新'
};

export default function AdminBuilder() {
  const [searchParams] = useSearchParams();
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [templateName, setTemplateName] = useState('minimal');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTemplate() {
      let tId = searchParams.get('template');
      if (!tId) {
        const content = await getSiteContent();
        tId = content.active_template || 'minimal';
      }
      setTemplateName(tId as string);
      const config = TEMPLATE_CONFIGS[tId as string] || TEMPLATE_CONFIGS.minimal;
      
      // clone blocks to avoid mutating constants
      setBlocks(JSON.parse(JSON.stringify(config.blocks)));
      setCanvasBg(config.bg);
    }
    loadTemplate();
  }, [searchParams]);

  const selectedBlock = blocks.find(b => b.id === selectedId);

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: uuidv4(),
      type,
      content: type === 'text' ? '請輸入文字' : type === 'button' ? '點擊按鈕' : 'https://placehold.co/600x400/eee/999?text=Image',
      desktop: { x: 100, y: 100, w: type === 'text' ? 200 : 300, h: type === 'text' ? 50 : type === 'button' ? 40 : 200 },
      mobile: { x: 20, y: 100, w: type === 'text' ? 150 : 250, h: type === 'text' ? 40 : type === 'button' ? 40 : 150 },
      style: {
        fontSize: '16px',
        color: type === 'button' ? '#fff' : '#333',
        backgroundColor: type === 'button' ? '#000' : 'transparent',
      }
    };
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlockLayout = (id: string, layout: Partial<Layout>) => {
    setBlocks(blocks.map(b => {
      if (b.id !== id) return b;
      return {
        ...b,
        [device]: { ...b[device], ...layout }
      };
    }));
  };

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockStyle = (id: string, key: string, value: string) => {
    setBlocks(blocks.map(b => {
      if (b.id !== id) return b;
      return { ...b, style: { ...b.style, [key]: value } };
    }));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handlePublish = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1500));
    toast.success(`模板 ${templateName} 已成功發布至 Cloudflare Pages!`);
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success('草稿已儲存');
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/admin/settings/templates" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="font-semibold flex items-center gap-2">
            <Component className="h-5 w-5 text-primary" />
            <span>視覺化編輯器 - 編輯中: {TEMPLATE_NAMES[templateName] || templateName.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
          <Button 
            variant={device === 'desktop' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8"
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="h-4 w-4 mr-2" /> 桌面端
          </Button>
          <Button 
            variant={device === 'mobile' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8"
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="h-4 w-4 mr-2" /> 行動端
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> 儲存草稿
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={saving}>
            <Globe className="h-4 w-4 mr-2" /> 發布上線
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Components */}
        <div className="w-64 border-r border-border bg-card flex flex-col shrink-0 z-10 relative shadow-sm">
          <div className="p-4 border-b border-border font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" /> 添加元素
          </div>
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">基礎組件</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => addBlock('text')}>
                  <Type className="h-5 w-5" /> 文字
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => addBlock('image')}>
                  <ImageIcon className="h-5 w-5" /> 圖片
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => addBlock('button')}>
                  <MousePointerClick className="h-5 w-5" /> 按鈕
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => addBlock('nav')}>
                  <AlignLeft className="h-5 w-5" /> 選單
                </Button>
              </div>
            </div>
            
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 mt-2">進階花店模組</div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => addBlock('floral-card')}>
                  🌸 花卉產品卡片
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => addBlock('banner')}>
                  🖼️ 首頁輪播 Banner
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => addBlock('faq')}>
                  ❓ 常見問題 FAQ
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => addBlock('footer')}>
                  🦶 頁尾 Footer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-100 overflow-auto relative p-8 flex justify-center items-start" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)', backgroundSize: '20px 20px' }}>
          <div 
            ref={canvasRef}
            className="shadow-xl relative overflow-hidden transition-all duration-300 ring-1 ring-border"
            style={{ 
              backgroundColor: canvasBg,
              width: device === 'desktop' ? '1200px' : '375px', 
              height: '1500px',
              transform: device === 'mobile' ? 'scale(1)' : 'scale(0.85)',
              transformOrigin: 'top center'
            }}
            onClick={() => setSelectedId(null)}
          >
            {blocks.map(block => {
              const layout = block[device];
              return (
                <Rnd
                  key={block.id}
                  size={{ width: layout.w, height: layout.h }}
                  position={{ x: layout.x, y: layout.y }}
                  onDragStop={(_e: any, d: any) => updateBlockLayout(block.id, { x: d.x, y: d.y })}
                  onResizeStop={(_e: any, _direction: any, ref: any, _delta: any, position: any) => {
                    updateBlockLayout(block.id, {
                      w: parseInt(ref.style.width),
                      h: parseInt(ref.style.height),
                      ...position,
                    });
                  }}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    setSelectedId(block.id);
                  }}
                  className={`group ${selectedId === block.id ? 'ring-2 ring-blue-500 z-20' : 'hover:ring-1 hover:ring-blue-300 z-10'}`}
                  bounds="parent"
                >
                  <div className="w-full h-full relative" style={block.style}>
                    {block.type === 'text' && (
                      <div className="w-full h-full p-2 outline-none break-words" style={{ ...block.style }}>{block.content}</div>
                    )}
                    {block.type === 'image' && (
                      <img src={block.content} alt="" className="w-full h-full pointer-events-none" style={{ objectFit: block.style.objectFit as any || 'cover', borderRadius: block.style.borderRadius }} />
                    )}
                    {block.type === 'button' && (
                      <button className="w-full h-full flex items-center justify-center font-medium" style={{ backgroundColor: block.style.backgroundColor, color: block.style.color, borderRadius: block.style.borderRadius || '4px' }}>
                        {block.content}
                      </button>
                    )}
                    {['floral-card', 'banner', 'faq', 'footer', 'nav'].includes(block.type) && (
                      <div className="w-full h-full flex items-center justify-center bg-white/80 border border-slate-300 text-slate-600 font-medium rounded-md shadow-sm">
                        [{block.type}] 模組佔位符
                      </div>
                    )}
                    
                    {selectedId === block.id && (
                      <div className="absolute -top-8 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow flex gap-2">
                        {block.type}
                        <button onClick={(e: any) => { e.stopPropagation(); removeBlock(block.id); }} className="hover:text-red-200">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 z-10 shadow-sm">
          <div className="p-4 border-b border-border font-medium flex items-center justify-between">
            <span>屬性設定</span>
            {selectedId && <Button variant="ghost" size="sm" onClick={() => removeBlock(selectedId)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
          </div>
          
          <div className="p-4 space-y-6 overflow-y-auto h-full">
            {!selectedBlock ? (
              <div className="text-center text-muted-foreground text-sm mt-10">
                <MousePointerClick className="h-8 w-8 mx-auto mb-2 opacity-50" />
                請點擊畫布中的元素進行編輯
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">內容 ({selectedBlock.type})</h3>
                  
                  {['text', 'button'].includes(selectedBlock.type) && (
                    <div className="space-y-2">
                      <Label>顯示文字</Label>
                      <Input 
                        value={selectedBlock.content} 
                        onChange={(e) => updateBlockContent(selectedBlock.id, e.target.value)} 
                      />
                    </div>
                  )}
                  
                  {selectedBlock.type === 'image' && (
                    <div className="space-y-2">
                      <Label>圖片網址</Label>
                      <Input 
                        value={selectedBlock.content} 
                        onChange={(e) => updateBlockContent(selectedBlock.id, e.target.value)} 
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">樣式設計</h3>
                  
                  {['text', 'button'].includes(selectedBlock.type) && (
                    <>
                      <div className="space-y-2">
                        <Label>字體大小</Label>
                        <Input 
                          value={selectedBlock.style.fontSize || ''} 
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'fontSize', e.target.value)} 
                          placeholder="例如: 16px"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>文字顏色</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color"
                            className="w-12 p-1 h-9 cursor-pointer"
                            value={selectedBlock.style.color || '#000000'} 
                            onChange={(e) => updateBlockStyle(selectedBlock.id, 'color', e.target.value)} 
                          />
                          <Input 
                            value={selectedBlock.style.color || ''} 
                            onChange={(e) => updateBlockStyle(selectedBlock.id, 'color', e.target.value)} 
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {selectedBlock.type === 'button' && (
                    <div className="space-y-2">
                      <Label>背景顏色</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color"
                          className="w-12 p-1 h-9 cursor-pointer"
                          value={selectedBlock.style.backgroundColor || '#000000'} 
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'backgroundColor', e.target.value)} 
                        />
                        <Input 
                          value={selectedBlock.style.backgroundColor || ''} 
                          onChange={(e) => updateBlockStyle(selectedBlock.id, 'backgroundColor', e.target.value)} 
                        />
                      </div>
                    </div>
                  )}
                  
                  {['image', 'button'].includes(selectedBlock.type) && (
                    <div className="space-y-2">
                      <Label>圓角 (Border Radius)</Label>
                      <Input 
                        value={selectedBlock.style.borderRadius || ''} 
                        onChange={(e) => updateBlockStyle(selectedBlock.id, 'borderRadius', e.target.value)} 
                        placeholder="例如: 8px"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">尺寸與位置 ({device})</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>X 座標</Label>
                      <Input 
                        type="number" 
                        value={selectedBlock[device].x} 
                        onChange={(e) => updateBlockLayout(selectedBlock.id, { x: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Y 座標</Label>
                      <Input 
                        type="number" 
                        value={selectedBlock[device].y} 
                        onChange={(e) => updateBlockLayout(selectedBlock.id, { y: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>寬度 (W)</Label>
                      <Input 
                        type="number" 
                        value={selectedBlock[device].w} 
                        onChange={(e) => updateBlockLayout(selectedBlock.id, { w: parseInt(e.target.value) || 10 })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>高度 (H)</Label>
                      <Input 
                        type="number" 
                        value={selectedBlock[device].h} 
                        onChange={(e) => updateBlockLayout(selectedBlock.id, { h: parseInt(e.target.value) || 10 })} 
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
