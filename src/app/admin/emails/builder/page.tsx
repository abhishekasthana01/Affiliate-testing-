'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Type, Image, Columns, MousePointerClick, Minus, ArrowUp, ArrowDown,
  Trash2, Plus, Eye, Code, Save, Copy, Undo2, Palette, Layout,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

// ─── Block Types ──────────────────────────────────────────
type BlockType = 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'spacer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, string>;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType; desc: string }[] = [
  { type: 'header', label: 'Header', icon: Type, desc: 'Title text' },
  { type: 'text', label: 'Text', icon: Type, desc: 'Paragraph' },
  { type: 'image', label: 'Image', icon: Image, desc: 'Image block' },
  { type: 'button', label: 'Button', icon: MousePointerClick, desc: 'CTA button' },
  { type: 'divider', label: 'Divider', icon: Minus, desc: 'Horizontal line' },
  { type: 'columns', label: '2 Columns', icon: Columns, desc: 'Side by side' },
  { type: 'spacer', label: 'Spacer', icon: Layout, desc: 'Vertical gap' },
];

const VARIABLES = [
  '{{name}}', '{{email}}', '{{code}}', '{{amount}}',
  '{{referralCode}}', '{{companyName}}', '{{dashboardUrl}}',
];

const DEFAULT_STYLES = {
  bgColor: '#ffffff', textColor: '#333333', accentColor: '#FF2069',
  fontFamily: 'Arial, sans-serif', headerBg: '#06303A',
};

function uid() { return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export default function EmailBuilderPage() {
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    { id: uid(), type: 'header', content: { text: 'Welcome to Beam!', align: 'center' } },
    { id: uid(), type: 'text', content: { text: 'Hi {{name}},\n\nThank you for joining our affiliate program.' } },
    { id: uid(), type: 'button', content: { text: 'Go to Dashboard', url: '{{dashboardUrl}}', align: 'center' } },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'code'>('edit');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  const addBlock = (type: BlockType) => {
    const defaults: Record<BlockType, Record<string, string>> = {
      header: { text: 'Heading', align: 'center' },
      text: { text: 'Enter your text here...' },
      image: { src: 'https://via.placeholder.com/600x200', alt: 'Image', width: '100%' },
      button: { text: 'Click Here', url: '#', align: 'center' },
      divider: { color: '#eeeeee' },
      columns: { left: 'Left column content', right: 'Right column content' },
      spacer: { height: '20' },
    };
    const newBlock: EmailBlock = { id: uid(), type, content: defaults[type] };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, content: Record<string, string>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const i = prev.findIndex(b => b.id === id);
      if ((dir === -1 && i === 0) || (dir === 1 && i === prev.length - 1)) return prev;
      const next = [...prev];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  };

  // ─── Generate HTML ──────────────────────────────────────
  const generateHTML = useCallback(() => {
    const s = styles;
    const blockHTML = blocks.map(b => {
      switch (b.type) {
        case 'header':
          return `<tr><td style="padding:24px 30px;background:${s.headerBg};text-align:${b.content.align||'center'}"><h1 style="margin:0;color:#fff;font-size:24px;font-family:${s.fontFamily}">${b.content.text}</h1></td></tr>`;
        case 'text':
          return `<tr><td style="padding:16px 30px;color:${s.textColor};font-size:15px;line-height:1.6;font-family:${s.fontFamily}">${(b.content.text||'').replace(/\n/g, '<br>')}</td></tr>`;
        case 'image':
          return `<tr><td style="padding:16px 30px;text-align:center"><img src="${b.content.src}" alt="${b.content.alt||''}" style="max-width:${b.content.width||'100%'};border-radius:8px" /></td></tr>`;
        case 'button':
          return `<tr><td style="padding:16px 30px;text-align:${b.content.align||'center'}"><a href="${b.content.url||'#'}" style="display:inline-block;padding:12px 28px;background:${s.accentColor};color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;font-family:${s.fontFamily}">${b.content.text}</a></td></tr>`;
        case 'divider':
          return `<tr><td style="padding:8px 30px"><hr style="border:0;border-top:1px solid ${b.content.color||'#eee'}" /></td></tr>`;
        case 'columns':
          return `<tr><td style="padding:16px 30px"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48%" style="vertical-align:top;font-size:14px;color:${s.textColor};font-family:${s.fontFamily}">${(b.content.left||'').replace(/\n/g,'<br>')}</td><td width="4%"></td><td width="48%" style="vertical-align:top;font-size:14px;color:${s.textColor};font-family:${s.fontFamily}">${(b.content.right||'').replace(/\n/g,'<br>')}</td></tr></table></td></tr>`;
        case 'spacer':
          return `<tr><td style="height:${b.content.height||20}px"></td></tr>`;
        default: return '';
      }
    }).join('\n');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:${s.fontFamily}"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 0"><table width="600" cellpadding="0" cellspacing="0" style="background:${s.bgColor};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">\n${blockHTML}\n<tr><td style="padding:20px 30px;text-align:center;font-size:12px;color:#999;font-family:${s.fontFamily}">© ${new Date().getFullYear()} Beam. All rights reserved.</td></tr></table></td></tr></table></body></html>`;
  }, [blocks, styles]);

  const handleSave = async () => {
    if (!templateName || !templateSubject) { alert('Name and subject are required'); return; }
    setSaving(true);
    try {
      const html = generateHTML();
      const vars = VARIABLES.filter(v => html.includes(v)).map(v => v.replace(/[{}]/g, ''));
      await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'NOTIFICATION', name: templateName, subject: templateSubject, body: html, variables: vars }),
      });
      alert('Template saved!');
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const copyHTML = () => { navigator.clipboard.writeText(generateHTML()); alert('HTML copied!'); };

  // ─── Block Editor Panel ─────────────────────────────────
  const renderBlockEditor = () => {
    if (!selectedBlock) return <p className="text-sm text-muted-foreground text-center py-8">Select a block to edit</p>;
    const c = selectedBlock.content;
    const update = (k: string, v: string) => updateBlock(selectedBlock.id, { ...c, [k]: v });

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{selectedBlock.type}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlock(selectedBlock.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
        {(selectedBlock.type === 'header' || selectedBlock.type === 'text') && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Content</Label>
              {selectedBlock.type === 'header' ? (
                <Input value={c.text} onChange={e => update('text', e.target.value)} />
              ) : (
                <Textarea value={c.text} onChange={e => update('text', e.target.value)} rows={4} className="text-sm" />
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground py-1">Variables:</span>
              {VARIABLES.map(v => (
                <Button key={v} variant="outline" size="sm" className="h-5 text-[9px] px-1.5 font-mono"
                  onClick={() => update('text', c.text + ' ' + v)}>{v}</Button>
              ))}
            </div>
          </>
        )}
        {selectedBlock.type === 'image' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Image URL</Label><Input value={c.src} onChange={e => update('src', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Alt Text</Label><Input value={c.alt} onChange={e => update('alt', e.target.value)} /></div>
          </>
        )}
        {selectedBlock.type === 'button' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Button Text</Label><Input value={c.text} onChange={e => update('text', e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Link URL</Label><Input value={c.url} onChange={e => update('url', e.target.value)} /></div>
          </>
        )}
        {selectedBlock.type === 'columns' && (
          <>
            <div className="space-y-1"><Label className="text-xs">Left Column</Label><Textarea value={c.left} onChange={e => update('left', e.target.value)} rows={3} className="text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Right Column</Label><Textarea value={c.right} onChange={e => update('right', e.target.value)} rows={3} className="text-sm" /></div>
          </>
        )}
        {selectedBlock.type === 'spacer' && (
          <div className="space-y-1"><Label className="text-xs">Height (px)</Label><Input type="number" value={c.height} onChange={e => update('height', e.target.value)} /></div>
        )}
        {(selectedBlock.type === 'header' || selectedBlock.type === 'button') && (
          <div className="space-y-1">
            <Label className="text-xs">Alignment</Label>
            <Select value={c.align || 'center'} onValueChange={v => update('align', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

  // ─── Block Preview (inline) ─────────────────────────────
  const renderBlockPreview = (block: EmailBlock) => {
    const c = block.content;
    switch (block.type) {
      case 'header': return <div className="bg-beam-charcoal-900 text-white p-4 rounded" style={{ textAlign: (c.align as any) || 'center' }}><h2 className="text-lg font-bold m-0">{c.text}</h2></div>;
      case 'text': return <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</p>;
      case 'image': return <div className="text-center"><img src={c.src} alt={c.alt} className="max-w-full rounded" style={{ maxHeight: 120 }} /></div>;
      case 'button': return <div style={{ textAlign: (c.align as any) || 'center' }}><span className="inline-block px-5 py-2 bg-beam-pink-500 text-white rounded text-sm font-semibold">{c.text}</span></div>;
      case 'divider': return <hr className="border-gray-200" />;
      case 'columns': return <div className="grid grid-cols-2 gap-3 text-sm"><div className="bg-gray-50 p-2 rounded">{c.left}</div><div className="bg-gray-50 p-2 rounded">{c.right}</div></div>;
      case 'spacer': return <div style={{ height: Number(c.height) || 20 }} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Template Builder</h1>
          <p className="text-muted-foreground text-sm">Visually design email templates with drag-and-drop blocks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyHTML}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy HTML</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Saving...' : 'Save Template'}</Button>
        </div>
      </div>

      {/* Template meta */}
      <Card>
        <CardContent className="flex gap-4 p-4">
          <div className="flex-1 space-y-1"><Label className="text-xs">Template Name</Label><Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Welcome Email" /></div>
          <div className="flex-1 space-y-1"><Label className="text-xs">Subject Line</Label><Input value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} placeholder="e.g. Welcome to Beam, {{name}}!" /></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Block palette */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Blocks</p>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed hover:border-beam-pink-300 hover:bg-beam-pink-50/50 transition-all text-left">
              <bt.icon className="h-4 w-4 text-muted-foreground" />
              <div><p className="text-xs font-medium">{bt.label}</p><p className="text-[10px] text-muted-foreground">{bt.desc}</p></div>
            </button>
          ))}
          <Separator className="my-3" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Styles</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><Label className="text-[10px] w-16">Accent</Label><input type="color" value={styles.accentColor} onChange={e => setStyles(s => ({...s, accentColor: e.target.value}))} className="h-6 w-6 rounded cursor-pointer" /></div>
            <div className="flex items-center gap-2"><Label className="text-[10px] w-16">Header</Label><input type="color" value={styles.headerBg} onChange={e => setStyles(s => ({...s, headerBg: e.target.value}))} className="h-6 w-6 rounded cursor-pointer" /></div>
            <div className="flex items-center gap-2"><Label className="text-[10px] w-16">Text</Label><input type="color" value={styles.textColor} onChange={e => setStyles(s => ({...s, textColor: e.target.value}))} className="h-6 w-6 rounded cursor-pointer" /></div>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Canvas</CardTitle>
              <div className="flex gap-1">
                {(['edit','preview','code'] as const).map(m => (
                  <Button key={m} variant={viewMode===m?'default':'ghost'} size="sm" className="h-7 text-xs" onClick={() => setViewMode(m)}>
                    {m==='edit' && <Layout className="h-3 w-3 mr-1" />}
                    {m==='preview' && <Eye className="h-3 w-3 mr-1" />}
                    {m==='code' && <Code className="h-3 w-3 mr-1" />}
                    {m.charAt(0).toUpperCase()+m.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'edit' && (
                <div className="space-y-2 min-h-[400px]">
                  {blocks.length === 0 && <p className="text-center text-sm text-muted-foreground py-16">Click a block type on the left to start building</p>}
                  <AnimatePresence>
                    {blocks.map((block, i) => (
                      <motion.div key={block.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                        className={`group relative border rounded-lg p-3 cursor-pointer transition-all ${selectedId===block.id ? 'border-beam-pink-500 ring-1 ring-beam-pink-200 bg-beam-pink-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                        onClick={() => setSelectedId(block.id)}>
                        {renderBlockPreview(block)}
                        <div className="absolute -right-1 top-1 hidden group-hover:flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();moveBlock(block.id,-1)}} disabled={i===0}><ArrowUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();moveBlock(block.id,1)}} disabled={i===blocks.length-1}><ArrowDown className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();removeBlock(block.id)}}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              {viewMode === 'preview' && (
                <div className="bg-gray-100 rounded-lg p-4"><div className="max-w-[600px] mx-auto bg-white rounded-lg shadow overflow-hidden" dangerouslySetInnerHTML={{ __html: generateHTML() }} /></div>
              )}
              {viewMode === 'code' && (
                <Textarea value={generateHTML()} readOnly rows={20} className="font-mono text-xs" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Properties */}
        <div className="lg:col-span-3">
          <Card className="sticky top-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Properties</CardTitle></CardHeader>
            <CardContent>{renderBlockEditor()}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
