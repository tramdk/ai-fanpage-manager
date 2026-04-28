import React, { useState, useCallback, useMemo, memo } from 'react';
import { toast } from 'sonner';
import { 
  Plus, Settings2, Play, GitMerge, Bot, Image as ImageIcon, FileText, 
  Send, Sparkles, X, ChevronRight, CheckCircle2, Clock, Calendar, 
  AlertCircle, Workflow, Zap, GripVertical, Server, History as HistoryIcon,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { ApiService } from '../../api';

// --- TYPES ---
type NodeType = 'trigger' | 'ai_text' | 'ai_image' | 'human_approval' | 'publish' | 'delay';

interface NodeConfig {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  icon: any;
  status: 'idle' | 'running' | 'success' | 'failed';
  config: Record<string, any>;
  x: number;
  y: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

const NODE_TYPES: Record<NodeType, { title: string; description: string; icon: any; defaultColor: string }> = {
  trigger: { title: 'Campaign Trigger', description: 'Starts the workflow', icon: Zap, defaultColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  ai_text: { title: 'AI Copywriter', description: 'Generates post caption', icon: FileText, defaultColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
  ai_image: { title: 'AI Image Studio', description: 'Generates creative assets', icon: ImageIcon, defaultColor: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/30' },
  human_approval: { title: 'Human Review', description: 'Pause for approval', icon: CheckCircle2, defaultColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  publish: { title: 'Facebook Publisher', description: 'Pushes to Fanpage', icon: Send, defaultColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  delay: { title: 'Time Delay', description: 'Wait before next step', icon: Clock, defaultColor: 'text-text-secondary bg-accent-bg border-card-border' },
};

// --- DRAG & DROP NODE COMPONENT ---
const WorkflowNode = memo(({ 
  node, 
  onSelect, 
  isSelected,
  onDragStart,
  onPortMouseDown,
  onPortMouseUp,
  isActiveSource
}: { 
  node: NodeConfig; 
  onSelect: (node: NodeConfig) => void;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, id: string, type: 'left'|'right', x: number, y: number) => void;
  onPortMouseUp: (e: React.MouseEvent, id: string, type: 'left'|'right') => void;
  isActiveSource: boolean;
}) => {
  const meta = NODE_TYPES[node.type];
  const Icon = meta.icon;

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      onClick={(e) => { e.stopPropagation(); onSelect(node); }}
      className={`absolute w-64 rounded-3xl transition-all cursor-move group p-1
        ${isSelected ? 'nm-flat ring-2 ring-soft-blue/20' : 'nm-flat hover:scale-[1.02]'}
        overflow-hidden z-10
      `}
      style={{ left: node.x, top: node.y }}
    >
      <div className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 nm-inset ${meta.defaultColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-black text-text-primary uppercase tracking-widest truncate">{node.title}</h4>
          <p className="text-[9px] text-text-muted font-bold truncate mt-0.5">{node.description}</p>
        </div>
      </div>
      
      {/* Node Ports - Enhanced for Touch */}
      <div 
        onMouseUp={(e) => onPortMouseUp(e, node.id, 'left')}
        className="absolute top-1/2 -left-4 w-8 h-10 flex items-center justify-center -translate-y-1/2 z-30 cursor-crosshair group/port"
      >
        <div className="w-4 h-4 nm-flat rounded-full group-hover/port:bg-soft-blue transition-all border border-white/5"></div>
      </div>
      <div 
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPortMouseDown(e, node.id, 'right', node.x + 256 + 8, node.y + 40);
        }}
        onMouseUp={(e) => onPortMouseUp(e, node.id, 'right')}
        className="absolute top-1/2 -right-4 w-8 h-10 flex items-center justify-center -translate-y-1/2 z-30 cursor-crosshair group/port"
      >
        <div className={`w-4 h-4 nm-flat rounded-full transition-all border border-white/5
          ${isActiveSource ? 'bg-soft-blue ring-4 ring-soft-blue/20 animate-pulse' : 'group-hover/port:bg-soft-blue'}
        `}></div>
      </div>
      
      {/* Status indicator */}
      {node.status === 'running' && (
        <div className="absolute bottom-0 left-0 h-1 bg-soft-blue animate-pulse w-full"></div>
      )}
    </div>
  );
});

export const StrategyWorkflowView: React.FC<{ api: ApiService }> = ({ api }) => {
  const [nodes, setNodes] = useState<NodeConfig[]>([
    { id: '1', type: 'trigger', title: 'Start Campaign', description: 'Daily at 09:00 AM', status: 'idle', config: { schedule: '09:00' }, x: 100, y: 150 },
    { id: '2', type: 'ai_text', title: 'Generate Copy', description: 'GPT-4 Marketing prompt', status: 'idle', config: { prompt: '' }, x: 450, y: 150 },
    { id: '3', type: 'publish', title: 'Post to Facebook', description: 'Push to selected Fanpage', status: 'idle', config: { pageId: '' }, x: 800, y: 150 },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [drawingEdge, setDrawingEdge] = useState<{ sourceId: string, startX: number, startY: number, endX: number, endY: number } | null>(null);

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState<'visual' | 'sequence'>(window.innerWidth < 1024 ? 'sequence' : 'visual');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Load workflow from database
  React.useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const workflows = await api.workflows.list();
        if (workflows && workflows.length > 0) {
          const wf = workflows[0];
          setWorkflowId(wf.id);
          setNodes(JSON.parse(wf.nodesData || '[]'));
          setEdges(JSON.parse(wf.edgesData || '[]'));
        }
      } catch (err) {
        console.warn('Failed to load workflows', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadWorkflow();
  }, [api]);

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      const saved = await api.workflows.save({
        id: workflowId || undefined,
        name: 'Primary Strategy Protocol',
        nodesData: JSON.stringify(nodes),
        edgesData: JSON.stringify(edges)
      });
      if (saved.id) setWorkflowId(saved.id);
      toast.success('Neural strategy synchronized');
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunWorkflow = async () => {
    if (!workflowId) {
        toast.error('Save strategy before execution.');
        return;
    }
    setNodes(prev => prev.map(n => ({ ...n, status: 'running' })));
    try {
      await api.workflows.execute(workflowId);
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, status: 'success' })));
      }, 2000);
    } catch (err: any) {
      setNodes(prev => prev.map(n => ({ ...n, status: 'failed' })));
      toast.error(err.message || 'Execution failed.');
    }
  };

  const addNode = (type: NodeType) => {
    const newNode: NodeConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: NODE_TYPES[type].title,
      description: NODE_TYPES[type].description,
      status: 'idle',
      config: {},
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsPanelOpen(true);
  };

  const updateNodeConfig = (newConfig: any) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, config: { ...n.config, ...newConfig } } : n));
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newNodes = [...nodes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newNodes.length) return;
    [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
    setNodes(newNodes);
    toast.info(`Step shifted ${direction}`);
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  // Canvas Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNodeId(id);
    e.dataTransfer.setData('nodeId', id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - 128;
    const y = e.clientY - rect.top - 40;
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y } : n));
    setDraggedNodeId(null);
  };

  const handlePortMouseDown = (e: React.MouseEvent, id: string, type: 'left'|'right', x: number, y: number) => {
    e.stopPropagation();
    if (type === 'right') {
      setDrawingEdge({ sourceId: id, startX: x, startY: y, endX: x, endY: y });
      setActiveSourceId(id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (drawingEdge) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDrawingEdge(prev => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
    }
  };

  const handlePortMouseUp = (e: React.MouseEvent, id: string, type: 'left'|'right') => {
    e.stopPropagation();
    if (drawingEdge && type === 'left' && drawingEdge.sourceId !== id) {
      const newEdge: Edge = { id: `e${drawingEdge.sourceId}-${id}`, source: drawingEdge.sourceId, target: id };
      setEdges(prev => prev.some(e => e.source === newEdge.source && e.target === newEdge.target) ? prev : [...prev, newEdge]);
      setActiveSourceId(null);
    } else if (activeSourceId && type === 'left' && activeSourceId !== id) {
      const newEdge: Edge = { id: `e${activeSourceId}-${id}`, source: activeSourceId, target: id };
      setEdges(prev => prev.some(e => e.source === newEdge.source && e.target === newEdge.target) ? prev : [...prev, newEdge]);
      setActiveSourceId(null);
      toast.success('Neural Link Established');
    }
    setDrawingEdge(null);
  };

  const renderEdges = () => {
    return edges.map(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return null;
      const startX = source.x + 256 + 8;
      const startY = source.y + 40;
      const endX = target.x - 8;
      const endY = target.y + 40;
      return (
        <path
          key={edge.id}
          d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-soft-blue/30"
          onDoubleClick={() => setEdges(prev => prev.filter(e => e.id !== edge.id))}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-app-bg h-full overflow-hidden relative">
      <aside className="lg:w-72 w-full lg:h-full h-auto nm-sidebar flex lg:flex-col flex-row z-20 overflow-hidden shrink-0">
        <div className="lg:h-20 h-16 flex items-center lg:px-10 px-6 border-b lg:border-white/5 border-transparent shrink-0">
          <Workflow className="text-soft-blue lg:block hidden" size={24} />
          <span className="lg:ml-4 text-[10px] font-black text-text-primary uppercase tracking-[0.2em] whitespace-nowrap">Strategy Nodes</span>
        </div>
        <div className="flex-1 overflow-x-auto lg:overflow-y-auto p-3 lg:p-6 flex lg:flex-col flex-row gap-3 lg:gap-4 custom-scrollbar lg:items-stretch items-center">
          {(Object.entries(NODE_TYPES) as [NodeType, any][]).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={type} onClick={() => addNode(type)} className="flex items-center lg:p-4 p-2.5 rounded-2xl nm-button group shrink-0 lg:w-full min-w-[50px]">
                <div className={`lg:p-2.5 p-2 rounded-xl nm-inset ${meta.defaultColor}`}>
                  <Icon className="lg:w-[18px] lg:h-[18px] w-4 h-4" />
                </div>
                <div className="hidden md:block lg:ml-4 ml-3 text-left truncate">
                  <div className="text-[10px] font-black text-text-primary uppercase tracking-widest truncate">{meta.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-16 sm:h-24 flex items-center justify-between lg:px-10 px-4 border-b border-white/5 z-10 bg-app-bg/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 nm-flat flex items-center justify-center text-soft-blue shrink-0">
              <Zap size={20} className="sm:w-7 sm:h-7" />
            </div>
            <div className="hidden sm:block truncate">
              <h2 className="text-xs sm:text-xl font-black text-text-primary uppercase tracking-tight truncate">Strategy Architect</h2>
              <p className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5 opacity-60 truncate">Neural Flow Engine v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setMobileViewMode(prev => prev === 'visual' ? 'sequence' : 'visual')} className="lg:hidden nm-button w-10 h-10 sm:w-auto sm:px-6 sm:h-14 flex items-center justify-center gap-3 text-soft-blue transition-all active:scale-95">
              {mobileViewMode === 'visual' ? <HistoryIcon size={18} /> : <Workflow size={18} />}
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">{mobileViewMode === 'visual' ? 'Sequence' : 'Visual Map'}</span>
            </button>
            <button onClick={handleSaveWorkflow} disabled={isSaving} className="nm-button w-10 h-10 sm:w-auto sm:px-6 sm:h-14 flex items-center justify-center gap-3 text-text-muted hover:text-soft-blue transition-all active:scale-95">
              <Bot size={18} className={isSaving ? 'animate-spin' : ''} />
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button onClick={handleRunWorkflow} className="nm-button w-10 h-10 sm:w-auto sm:px-6 sm:h-14 flex items-center justify-center gap-3 text-white bg-soft-blue/10 hover:text-soft-blue transition-all active:scale-95">
              <Play size={16} className="fill-soft-blue" />
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">Deploy</span>
            </button>
          </div>
        </header>

        <div className={`flex-1 relative overflow-auto custom-scrollbar ${isLoading ? 'opacity-50 pointer-events-none' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onMouseMove={handleCanvasMouseMove} onMouseUp={() => setDrawingEdge(null)} onClick={() => { setSelectedNodeId(null); setIsPanelOpen(false); setActiveSourceId(null); }}>
          {mobileViewMode === 'visual' ? (
            <div className="min-w-[1200px] min-h-[800px] w-full h-full relative bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {renderEdges()}
                {drawingEdge && (
                   <path d={`M ${drawingEdge.startX} ${drawingEdge.startY} C ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.startY}, ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.endY}, ${drawingEdge.endX} ${drawingEdge.endY}`} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6,6" className="text-soft-blue/50" />
                )}
              </svg>
              {nodes.map(node => (
                <WorkflowNode key={node.id} node={node} isSelected={node.id === selectedNodeId} isActiveSource={node.id === activeSourceId} onSelect={(n) => { setSelectedNodeId(n.id); setIsPanelOpen(true); }} onDragStart={handleDragStart} onPortMouseDown={handlePortMouseDown} onPortMouseUp={handlePortMouseUp} />
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-8 max-w-xl mx-auto">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-1.5 h-12 bg-soft-blue rounded-full"></div>
                  <div>
                    <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Sequence Logic</h3>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Linear Strategy Protocol</p>
                  </div>
               </div>
               <div className="space-y-6 relative">
                  <div className="absolute left-7 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-text-muted/10 z-0"></div>
                  {nodes.map((node, idx) => {
                     const meta = NODE_TYPES[node.type];
                     const Icon = meta.icon;
                     return (
                       <div key={node.id} onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); setIsPanelOpen(true); }} className={`relative z-10 nm-flat p-5 rounded-[32px] flex items-center gap-5 transition-all ${selectedNodeId === node.id ? 'ring-2 ring-soft-blue/50' : ''}`}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 nm-inset ${meta.defaultColor}`}>
                             <Icon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-soft-blue nm-inset px-2 py-0.5 rounded-full uppercase tracking-tighter">Step {idx + 1}</span>
                                <h4 className="text-[11px] font-black text-text-primary uppercase tracking-tight truncate">{node.title}</h4>
                             </div>
                             <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">{node.type} protocol</p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                             <button onClick={(e) => { e.stopPropagation(); moveNode(idx, 'up'); }} disabled={idx === 0} className="w-8 h-8 nm-button flex items-center justify-center text-text-muted disabled:opacity-20"><ArrowUp size={14} /></button>
                             <button onClick={(e) => { e.stopPropagation(); moveNode(idx, 'down'); }} disabled={idx === nodes.length - 1} className="w-8 h-8 nm-button flex items-center justify-center text-text-muted disabled:opacity-20"><ArrowDown size={14} /></button>
                          </div>
                       </div>
                     );
                  })}
               </div>
            </div>
          )}
        </div>
      </main>

      {isPanelOpen && selectedNode && (
        <aside className="nm-panel-right backdrop-blur-2xl flex flex-col z-[150] fixed inset-0 lg:relative lg:inset-auto lg:w-[420px] lg:h-full animate-in slide-in-from-right-full duration-500">
          <div className="h-20 flex items-center justify-between px-6 sm:px-10 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <Settings2 size={18} className="text-text-muted" />
              <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Protocol Config</span>
            </div>
            <button onClick={() => setIsPanelOpen(false)} className="w-10 h-10 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar">
            <div className="flex items-center gap-6">
               <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center nm-inset ${NODE_TYPES[selectedNode.type].defaultColor}`}>
                  {(() => { const Icon = NODE_TYPES[selectedNode.type].icon; return <Icon size={24} />; })()}
               </div>
               <div className="flex-1 min-w-0">
                  <input type="text" value={selectedNode.title} onChange={(e) => setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n))} className="bg-transparent text-lg font-black text-text-primary outline-none w-full border-b-2 border-transparent focus:border-soft-blue mb-1 transition-all uppercase tracking-tight" />
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">{selectedNode.type} NODE</p>
               </div>
            </div>
            <div className="space-y-8">
               {selectedNode.type === 'trigger' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Deployment Schedule</label>
                    <input type="time" value={selectedNode.config.schedule || '09:00'} onChange={(e) => updateNodeConfig({ schedule: e.target.value })} className="nm-input font-black" />
                 </div>
               )}
               {selectedNode.type === 'ai_text' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Neural Copy Prompt</label>
                    <textarea value={selectedNode.config.prompt || ''} onChange={(e) => updateNodeConfig({ prompt: e.target.value })} placeholder="Protocol instructions..." className="nm-input min-h-[160px] font-bold py-6 text-sm" />
                 </div>
               )}
               {selectedNode.type === 'publish' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Target Node (Page)</label>
                    <select value={selectedNode.config.pageId || ''} onChange={(e) => updateNodeConfig({ pageId: e.target.value })} className="nm-input font-black appearance-none">
                      <option value="">Select Protocol...</option>
                      <option value="page1">Nông Y AI Official</option>
                      <option value="page2">Tech News Hub</option>
                    </select>
                 </div>
               )}
               <div className="pt-10">
                 <button onClick={() => { setNodes(prev => prev.filter(n => n.id !== selectedNode.id)); setIsPanelOpen(false); }} className="w-full py-5 rounded-[24px] nm-button text-soft-pink font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:bg-soft-pink transition-all">Purge Node</button>
               </div>
            </div>
          </div>
        </aside>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  );
};

export default StrategyWorkflowView;
