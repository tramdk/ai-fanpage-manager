import React, { useState, useCallback, useMemo, memo } from 'react';
import { toast } from 'sonner';
import { 
  Plus, Settings2, Play, GitMerge, Bot, Image as ImageIcon, FileText, 
  Send, Sparkles, X, ChevronRight, CheckCircle2, Clock, Calendar, 
  AlertCircle, Workflow, Zap, GripVertical, Server
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
  onPortMouseUp
}: { 
  node: NodeConfig; 
  onSelect: (node: NodeConfig) => void;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, id: string, type: 'left'|'right', x: number, y: number) => void;
  onPortMouseUp: (e: React.MouseEvent, id: string, type: 'left'|'right') => void;
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
      
      {/* Node Ports */}
      <div 
        onMouseUp={(e) => onPortMouseUp(e, node.id, 'left')}
        className="absolute top-1/2 -left-3 w-6 h-6 flex items-center justify-center -translate-y-1/2 z-20 cursor-crosshair group/port"
      >
        <div className="w-3 h-3 nm-flat rounded-full group-hover/port:bg-soft-blue transition-all"></div>
      </div>
      <div 
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPortMouseDown(e, node.id, 'right', node.x + 256 + 8, node.y + 40);
        }}
        className="absolute top-1/2 -right-3 w-6 h-6 flex items-center justify-center -translate-y-1/2 z-20 cursor-crosshair group/port"
      >
        <div className="w-3 h-3 nm-flat rounded-full group-hover/port:bg-soft-blue transition-all"></div>
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [drawingEdge, setDrawingEdge] = useState<{ sourceId: string, startX: number, startY: number, endX: number, endY: number } | null>(null);

  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        name: 'Campaign Flow #1',
        nodesData: JSON.stringify(nodes),
        edgesData: JSON.stringify(edges)
      });
      setWorkflowId(saved.id);
      toast.success('Strategy Synchronized!');
    } catch (err) {
      toast.error('Sync Failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  // --- CANVAS HANDLERS ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedNodeId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNodeId) return;

    const canvas = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - canvas.left - 128;
    const y = e.clientY - canvas.top - 40;

    setNodes(prev => prev.map(n => 
      n.id === draggedNodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n
    ));
    setDraggedNodeId(null);
  };

  // --- EDGE DRAWING HANDLERS ---
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, type: 'left'|'right', startX: number, startY: number) => {
    e.stopPropagation();
    if (type === 'right') {
      setDrawingEdge({ sourceId: nodeId, startX, startY, endX: startX, endY: startY });
    }
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, type: 'left'|'right') => {
    e.stopPropagation();
    if (type === 'left' && drawingEdge && drawingEdge.sourceId !== nodeId) {
      const newEdge: Edge = { id: `e${drawingEdge.sourceId}-${nodeId}`, source: drawingEdge.sourceId, target: nodeId };
      setEdges(prev => {
        if (prev.some(e => e.source === newEdge.source && e.target === newEdge.target)) return prev;
        return [...prev, newEdge];
      });
    }
    setDrawingEdge(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (drawingEdge) {
      const canvas = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - canvas.left;
      const y = e.clientY - canvas.top;
      setDrawingEdge(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
  };

  const addNode = (type: NodeType) => {
    const newNode: NodeConfig = {
      id: Date.now().toString(),
      type,
      title: NODE_TYPES[type].title,
      description: NODE_TYPES[type].description,
      status: 'idle',
      config: {},
      x: 300 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsPanelOpen(true);
  };

  const updateNodeConfig = (updates: any) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(n => 
      n.id === selectedNodeId ? { ...n, config: { ...n.config, ...updates } } : n
    ));
  };

  // SVG Lines connecting nodes
  const renderEdges = () => {
    return edges.map(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return null;

      const startX = source.x + 256 + 8;
      const startY = source.y + 40;
      const endX = target.x - 8;
      const endY = target.y + 40;
      const cpX = (startX + endX) / 2;

      return (
        <g key={edge.id} className="group" onDoubleClick={() => setEdges(prev => prev.filter(e => e.id !== edge.id))}>
          <path
            d={`M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="transparent"
            strokeWidth="24"
            className="cursor-pointer pointer-events-auto"
          />
          <path
            d={`M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-text-muted/20 transition-all group-hover:text-soft-blue group-hover:stroke-[4px] pointer-events-none"
          />
        </g>
      );
    });
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

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-app-bg rounded-[48px] nm-flat overflow-hidden relative font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-20 md:w-64 border-r border-white/10 flex flex-col z-20 transition-all bg-app-bg/50 backdrop-blur-md">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-10 border-b border-white/5">
          <Workflow className="text-soft-blue" size={24} />
          <span className="hidden md:inline-block ml-4 text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Strategy Nodes</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {(Object.entries(NODE_TYPES) as [NodeType, any][]).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="w-full flex items-center p-4 rounded-2xl nm-button group"
              >
                <div className={`p-2.5 rounded-xl nm-inset ${meta.defaultColor}`}>
                  <Icon size={18} />
                </div>
                <div className="hidden md:block text-left ml-4">
                  <div className="text-[10px] font-black text-text-primary uppercase tracking-widest">{meta.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

        {/* CENTER CANVAS */}
        <main className="flex-1 relative overflow-hidden bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px] cursor-grab active:cursor-grabbing">
          
          <div className="absolute top-8 left-8 z-30 flex items-center gap-4">
            <div className="nm-flat px-6 py-3.5 rounded-2xl flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Active Neural Flow</span>
            </div>
            <button 
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className="nm-button px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-soft-blue"
            >
              {isSaving ? 'Syncing...' : 'Save Strategy'}
            </button>
            <button 
              onClick={handleRunWorkflow}
              className="nm-button px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white bg-soft-blue/10 hover:text-soft-blue flex items-center gap-3"
            >
              <Play size={16} fill="currentColor" /> Deploy
            </button>
          </div>

        <div 
          className={`absolute inset-0 w-full h-full transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={() => setDrawingEdge(null)}
          onClick={() => { setSelectedNodeId(null); setIsPanelOpen(false); }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {renderEdges()}
            {drawingEdge && (
               <path
                  d={`M ${drawingEdge.startX} ${drawingEdge.startY} C ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.startY}, ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.endY}, ${drawingEdge.endX} ${drawingEdge.endY}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="6,6"
                  className="text-soft-blue/50"
               />
            )}
          </svg>

          {nodes.map(node => (
            <WorkflowNode 
              key={node.id} 
              node={node} 
              isSelected={node.id === selectedNodeId}
              onSelect={(n) => { setSelectedNodeId(n.id); setIsPanelOpen(true); }}
              onDragStart={handleDragStart}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
            />
          ))}
        </div>
      </main>

      {/* RIGHT PANEL */}
      {isPanelOpen && selectedNode && (
        <aside className="w-[420px] nm-panel-right backdrop-blur-xl flex flex-col z-20 animate-in slide-in-from-right-12 duration-500">
          <div className="h-20 flex items-center justify-between px-10 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Settings2 size={18} className="text-text-muted" />
              <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Protocol Config</span>
            </div>
            <button onClick={() => setIsPanelOpen(false)} className="w-10 h-10 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
            
            <div className="flex items-center gap-6">
               <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center nm-inset ${NODE_TYPES[selectedNode.type].defaultColor}`}>
                  {React.createElement(NODE_TYPES[selectedNode.type].icon, { size: 32 })}
               </div>
               <div>
                  <input 
                    type="text" 
                    value={selectedNode.title}
                    onChange={(e) => {
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n));
                    }}
                    className="bg-transparent text-lg font-black text-text-primary outline-none w-full border-b-2 border-transparent focus:border-soft-blue mb-1 transition-all uppercase tracking-tight"
                  />
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">{selectedNode.type} NODE</p>
               </div>
            </div>

            <div className="space-y-8">
               
               {selectedNode.type === 'trigger' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Deployment Schedule</label>
                    <input 
                      type="time" 
                      value={selectedNode.config.schedule || '09:00'}
                      onChange={(e) => updateNodeConfig({ schedule: e.target.value })}
                      className="nm-input font-black"
                    />
                 </div>
               )}

               {selectedNode.type === 'ai_text' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Neural Copy Prompt</label>
                    <textarea 
                      value={selectedNode.config.prompt || ''}
                      onChange={(e) => updateNodeConfig({ prompt: e.target.value })}
                      placeholder="Protocol instructions..."
                      className="nm-input min-h-[160px] font-bold py-6"
                    />
                 </div>
               )}

               {selectedNode.type === 'publish' && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Target Node (Page)</label>
                    <select 
                      value={selectedNode.config.pageId || ''}
                      onChange={(e) => updateNodeConfig({ pageId: e.target.value })}
                      className="nm-input font-black appearance-none"
                    >
                      <option value="">Select Protocol...</option>
                      <option value="page1">Nông Y AI Official</option>
                      <option value="page2">Tech News Hub</option>
                    </select>
                 </div>
               )}

               <div className="pt-10">
                 <button 
                  onClick={() => setNodes(prev => prev.filter(n => n.id !== selectedNode.id))}
                  className="w-full py-5 rounded-[24px] nm-button text-soft-pink font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:bg-soft-pink transition-all"
                 >
                   Purge Node
                 </button>
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
