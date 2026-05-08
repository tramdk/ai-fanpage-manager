import React, { useState, useCallback, useMemo, memo } from 'react';
import { useLanguage } from '../../LanguageContext';
// VERSION: 3.1.0 - Fixed Missing Imports
import { toast } from 'sonner';
import { 
  Zap, Plus, Save, Play, Trash2, X, ChevronRight, 
  Settings2, Bot, Layers, CheckCircle2, FileText, 
  Video, Send, History as HistoryIcon, Workflow,
  PlusCircle, Database, Calendar, Trash, Copy, Scissors,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { ApiService } from '../../api';

// --- TYPES ---
type NodeType = 'trigger' | 'ai_text' | 'ai_video' | 'human_approval' | 'publish';

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

const NODE_TYPES: Record<NodeType, { title: string; description: string; icon: any; defaultColor: string; outputs: string[]; inputs: string[] }> = {
  trigger: { title: 'Start Campaign', description: 'Schedule strategy execution', icon: Calendar, defaultColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30', outputs: ['any'], inputs: [] },
  ai_text: { title: 'AI Copywriter', description: 'Generate viral post content', icon: FileText, defaultColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30', outputs: ['text'], inputs: ['any'] },
  ai_video: { title: 'AI Video Creator', description: 'Generate high-quality video', icon: Video, defaultColor: 'text-orange-500 bg-orange-500/10 border-orange-500/30', outputs: ['video'], inputs: ['text', 'any'] },
  human_approval: { title: 'Human Review', description: 'Approval before publishing', icon: CheckCircle2, defaultColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30', outputs: ['text', 'video'], inputs: ['text', 'video'] },
  publish: { title: 'Facebook Publisher', description: 'Push content to Fanpage', icon: Send, defaultColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', outputs: [], inputs: ['text', 'video'] },
};

// --- DRAG & DROP NODE COMPONENT ---
const WorkflowNode = memo(({ 
  node, 
  onSelect, 
  isSelected,
  onDragStart,
  onPortMouseDown,
  onPortMouseUp,
  isActiveSource,
  fanpages = []
}: { 
  node: NodeConfig; 
  onSelect: (node: NodeConfig) => void;
  isSelected: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onPortMouseDown: (id: string, portType: 'in' | 'out', e: React.MouseEvent) => void;
  onPortMouseUp: (id: string, portType: 'in' | 'out', e: React.MouseEvent) => void;
  isActiveSource: boolean;
  fanpages?: any[];
}) => {
  const meta = NODE_TYPES[node.type];
  const Icon = meta.icon;

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      onClick={(e) => { e.stopPropagation(); onSelect(node); }}
      data-node-id={node.id}
      className={`absolute w-64 rounded-3xl transition-all cursor-move group p-1 pointer-events-auto
        ${isSelected ? 'nm-flat ring-2 ring-soft-blue/20' : 'nm-flat hover:scale-[1.02]'}
        overflow-hidden z-20
      `}
      style={{ left: node.x, top: node.y }}
    >
      <div className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center nm-inset pointer-events-none ${meta.defaultColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <h4 className="text-[11px] font-black text-text-primary uppercase tracking-tight truncate">{node.title}</h4>
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest truncate">{node.description}</p>
        </div>
      </div>
      
      {/* Configuration Details Display */}
      <div className="px-4 pb-4 space-y-2">
        {node.type === 'trigger' && (node.config.topic || node.config.time) && (
          <div className="flex flex-wrap gap-2">
            {node.config.topic && <span className="nm-inset px-2 py-0.5 rounded-lg text-[8px] font-black text-soft-blue uppercase">{node.config.topic}</span>}
            {node.config.time && <span className="nm-inset px-2 py-0.5 rounded-lg text-[8px] font-black text-text-muted uppercase">{node.config.time}</span>}
          </div>
        )}
        
        {(node.type === 'ai_text' || node.type === 'ai_video') && node.config.topic && (
          <div className="flex flex-wrap gap-2">
            <span className="nm-inset px-2 py-0.5 rounded-lg text-[8px] font-black text-indigo-500 uppercase">{node.config.topic}</span>
          </div>
        )}

        {node.type === 'publish' && node.config.pageId && (
          <div className="flex flex-wrap gap-2">
            <span className="nm-inset px-2 py-0.5 rounded-lg text-[8px] font-black text-emerald-500 uppercase">
              {fanpages.find(f => f.pageId === node.config.pageId)?.name || 'Fanpage Selected'}
            </span>
          </div>
        )}
      </div>

      {/* Node Ports - Enhanced for Touch */}
      <div 
        onMouseUp={(e) => onPortMouseUp(node.id, 'in', e)}
        className="absolute top-1/2 -left-4 w-8 h-10 flex items-center justify-center -translate-y-1/2 z-30 cursor-crosshair group/port"
      >
        <div className="w-4 h-4 nm-flat rounded-full group-hover/port:bg-soft-blue transition-all border border-white/5"></div>
      </div>
      <div 
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPortMouseDown(node.id, 'out', e);
        }}
        onMouseUp={(e) => onPortMouseUp(node.id, 'out', e)}
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

export const StrategyWorkflowView: React.FC<{ api: ApiService; fanpages: any[] }> = ({ api, fanpages }) => {
  const { t } = useLanguage();
  const [nodes, setNodes] = useState<NodeConfig[]>([
    { id: '1', type: 'trigger', title: 'Chiến dịch mới', description: 'Cấu hình lịch chạy', status: 'idle', config: { topic: '', time: '09:00', runCount: 1 }, x: 100, y: 150 },
    { id: '2', type: 'ai_text', title: 'Soạn thảo nội dung', description: 'AI viết bài tự động', status: 'idle', config: { tone: 'professional and elegant', keywords: '', instructions: '' }, x: 450, y: 150 },
    { id: '3', type: 'publish', title: 'Đăng Facebook', description: 'Đưa bài viết lên Fanpage', status: 'idle', config: { pageId: '', method: 'direct' }, x: 800, y: 150 },
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'node' | 'edge' | 'canvas', targetId?: string } | null>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [bgmPresets, setBgmPresets] = useState<any[]>([]);
  const [videoTemplates, setVideoTemplates] = useState<any[]>([]);
  const [ttsProviders, setTtsProviders] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  // Load initial data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [workflowsRes, topicsRes, videoOptions] = await Promise.all([
          api.workflows.list(),
          api.topics.list().catch(() => []),
          api.ai.getVideoOptions().catch(() => ({ voices: [], bgm: [], templates: [], providers: [] }))
        ]);
        
        setWorkflows(workflowsRes || []);
        if (workflowsRes && workflowsRes.length > 0) {
          // Default: load latest (first in list usually)
          const wf = workflowsRes[0];
          setWorkflowId(wf.id);
          setNodes(JSON.parse(wf.nodesData || '[]'));
          setEdges(JSON.parse(wf.edgesData || '[]'));
        } else {
          // If no workflows, start blank
          setWorkflowId(null);
          setNodes([]);
          setEdges([]);
        }
        setTopics(topicsRes);
        setVoices(videoOptions.voices || []);
        setBgmPresets(videoOptions.bgm || []);
        setVideoTemplates(videoOptions.templates || []);
        setTtsProviders(videoOptions.providers || ['edge', 'azure', 'google', 'openai', 'gemini', 'ohfree']);
      } catch (err) {
        console.warn('Failed to load initial data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [api]);

  const handleNewWorkflow = () => {
    setWorkflowId(null);
    setNodes([
      { id: '1', type: 'trigger', title: 'Chiến dịch mới', description: 'Cấu hình lịch chạy', status: 'idle', config: { topic: '', time: '09:00', runCount: 1 }, x: 100, y: 150 },
      { id: '2', type: 'ai_text', title: 'Soạn thảo nội dung', description: 'AI viết bài tự động', status: 'idle', config: { tone: 'professional and elegant', keywords: '', instructions: '' }, x: 450, y: 150 },
      { id: '3', type: 'publish', title: 'Đăng Facebook', description: 'Đưa bài viết lên Fanpage', status: 'idle', config: { pageId: '', method: 'direct' }, x: 800, y: 150 },
    ]);
    setEdges([
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ]);
    setSelectedNodeId(null);
    setIsPanelOpen(false);
    toast.info('Bắt đầu thiết kế Workflow mới');
  };

  const loadWorkflow = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    setWorkflowId(wf.id);
    setNodes(JSON.parse(wf.nodesData || '[]'));
    setEdges(JSON.parse(wf.edgesData || '[]'));
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  };

  const handleExecute = async () => {
    setIsSaving(true);
    try {
      // 1. Always save the current state first to ensure backend has latest config
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const publishNodes = nodes.filter(n => n.type === 'publish');
      
      if (!triggerNode || !triggerNode.config.topic) {
        toast.error('Vui lòng cấu hình Chủ đề trong Node Trigger!');
        setIsSaving(false);
        return;
      }

      const hasValidPublish = publishNodes.some(n => n.config.pageId);
      if (!hasValidPublish) {
        toast.error('Vui lòng chọn ít nhất một Fanpage trong các Node Publish!');
        setIsSaving(false);
        return;
      }

      const saved = await api.workflows.save({
        id: workflowId || undefined,
        name: triggerNode?.config.topic || 'Primary Strategy Protocol',
        nodesData: JSON.stringify(nodes),
        edgesData: JSON.stringify(edges),
      });

      const currentWfId = saved.id;
      setWorkflowId(currentWfId);

      // 2. Check if a campaign exists for this workflow
      const allSchedules = await api.schedules.list();
      const existingSchedule = allSchedules.find((s: any) => s.workflowId === currentWfId);

      if (triggerNode && triggerNode.config.topic && triggerNode.config.pageId) {
        const runCount = Number(triggerNode.config.runCount) || 1;
        if (!existingSchedule) {
          // Create new campaign
          await api.schedules.create({
            topic: triggerNode.config.topic,
            time: triggerNode.config.time || '10:00',
            fanpageId: triggerNode.config.pageId,
            runCount: runCount,
            workflowId: currentWfId,
            status: 'active'
          });
          toast.success(`Campaign created with ${runCount} total posts!`);
        } else {
          // Update existing campaign with latest workflow config
          await api.schedules.update(existingSchedule.id, {
            topic: triggerNode.config.topic,
            time: triggerNode.config.time || '10:00',
            fanpageId: triggerNode.config.pageId,
            runCount: runCount,
            status: 'active'
          });
          toast.success(`Campaign updated to ${runCount} total posts!`);
        }
      }

      // 3. Execute the workflow
      const payload = triggerNode ? triggerNode.config : {};
      const res = await api.workflows.execute(currentWfId, payload);
      
      if (res.success) {
        toast.success('Strategy đang được thực thi!');
        setNodes(prev => prev.map(n => ({ ...n, status: 'running' })));
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const triggerNode = nodes.find(n => n.type === 'trigger');
      const saved = await api.workflows.save({
        id: workflowId || undefined,
        name: triggerNode?.config.topic || 'Primary Strategy Protocol',
        nodesData: JSON.stringify(nodes),
        edgesData: JSON.stringify(edges)
      });
      
      if (saved && saved.id) {
        setWorkflowId(saved.id);
        toast.success('Workflow saved successfully');
      }
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
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

  const handlePortMouseDown = (id: string, type: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'out') {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      setDrawingEdge({ sourceId: id, startX: node.x + 256 + 8, startY: node.y + 40, endX: node.x + 256 + 8, endY: node.y + 40 });
      setActiveSourceId(id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (drawingEdge) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDrawingEdge(prev => prev ? { ...prev, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null);
    }
  };

  const handlePortMouseUp = (id: string, type: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    const sourceId = drawingEdge?.sourceId || activeSourceId;
    
    if (sourceId && type === 'in' && sourceId !== id) {
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === id);
      
      if (sourceNode && targetNode) {
        const sourceMeta = NODE_TYPES[sourceNode.type];
        const targetMeta = NODE_TYPES[targetNode.type];
        
        // Validation Logic
        const isCompatible = targetMeta.inputs.some(input => 
          sourceMeta.outputs.includes(input) || sourceMeta.outputs.includes('any') || input === 'any'
        );

        if (!isCompatible) {
          toast.error(`Incompatible Logic: ${sourceMeta.title} cannot feed into ${targetMeta.title}`, {
            description: `Expected input: ${targetMeta.inputs.join(', ')}`,
          });
          setDrawingEdge(null);
          setActiveSourceId(null);
          return;
        }

        const newEdge: Edge = { id: `e${sourceId}-${id}`, source: sourceId, target: id };
        setEdges(prev => prev.some(e => e.source === newEdge.source && e.target === newEdge.target) ? prev : [...prev, newEdge]);
        setActiveSourceId(null);
        toast.success('Neural Link Established');
      }
    }
    setDrawingEdge(null);
  };

  const handleNodeContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeId(id);
    setIsPanelOpen(true);
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', targetId: id });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', targetId: edgeId });
  };

  const duplicateNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newNode = { ...node, id: Math.random().toString(36).substr(2, 9), x: node.x + 40, y: node.y + 40, status: 'idle' as const };
    setNodes(prev => [...prev, newNode]);
    setContextMenu(null);
    toast.success('Node Duplicated');
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    setContextMenu(null);
    toast.info('Node Purged');
  };

  const deleteEdge = (id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    setContextMenu(null);
    toast.info('Link Dissolved');
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
      const isActive = selectedEdgeId === edge.id;
      return (
        <g key={edge.id}>
          {/* Transparent hit area for easier right-clicking */}
          <path
            d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="transparent"
            strokeWidth="15"
            className="pointer-events-auto cursor-pointer"
            onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
          />
          <path
            d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={isActive ? "5" : "3"}
            className={`transition-all duration-300 pointer-events-none ${isActive ? 'text-soft-blue opacity-100' : 'text-soft-blue/30 hover:text-soft-blue/60'}`}
          />
        </g>
      );
    });
  };

  const handleCanvasClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setIsPanelOpen(false);
    setActiveSourceId(null);
    setContextMenu(null);
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
        <header className="h-20 lg:h-28 flex items-center justify-between lg:px-10 px-4 border-b border-white/5 z-10 bg-app-bg/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            <div className="flex items-center gap-4 hidden sm:flex">
              <div className="w-12 h-12 nm-flat flex items-center justify-center text-soft-blue shrink-0">
                <Zap size={24} />
              </div>
              <div className="truncate">
                <h2 className="text-lg font-black text-text-primary uppercase tracking-tight truncate">Strategy Architect</h2>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5 opacity-60">Neural Flow v2.0</p>
              </div>
            </div>

            <div className="w-px h-10 bg-white/5 hidden lg:block"></div>

            <div className="flex items-center gap-3">
               <select 
                 value={workflowId || ''} 
                 onChange={(e) => loadWorkflow(e.target.value)}
                 className="nm-input h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest min-w-[160px] lg:min-w-[240px] appearance-none cursor-pointer"
               >
                 <option value="" disabled>{workflows.length > 0 ? 'Chọn Workflow...' : 'Chưa có Workflow'}</option>
                 {workflows.map(wf => (
                   <option key={wf.id} value={wf.id}>{wf.name}</option>
                 ))}
               </select>
               <button 
                 onClick={handleNewWorkflow}
                 className="w-12 h-12 nm-button flex items-center justify-center text-soft-blue hover:text-white transition-all group shrink-0"
                 title="Thêm Workflow mới"
               >
                 <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
               </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setMobileViewMode(prev => prev === 'visual' ? 'sequence' : 'visual')} className="lg:hidden nm-button w-12 h-12 flex items-center justify-center text-soft-blue">
              {mobileViewMode === 'visual' ? <HistoryIcon size={18} /> : <Workflow size={18} />}
            </button>
            <button 
              onClick={handleExecute}
              disabled={isSaving || nodes.length === 0}
              className="nm-button h-12 px-6 flex items-center gap-3 text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-all group shrink-0"
            >
              <Play size={18} className="group-hover:scale-110 transition-transform fill-emerald-500/20" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Run Strategy</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="nm-button h-12 px-6 flex items-center gap-3 text-soft-blue hover:text-white disabled:opacity-50 transition-all group shrink-0"
            >
              <Save size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
          </div>
        </header>

        <div className={`flex-1 relative overflow-auto custom-scrollbar ${isLoading ? 'opacity-50 pointer-events-none' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onMouseMove={handleCanvasMouseMove} onMouseUp={() => setDrawingEdge(null)} onContextMenu={handleCanvasContextMenu} onClick={handleCanvasClick}>
          {mobileViewMode === 'visual' ? (
            <div className="min-w-[1200px] min-h-[800px] w-full h-full relative bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {renderEdges()}
                {drawingEdge && (
                   <path d={`M ${drawingEdge.startX} ${drawingEdge.startY} C ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.startY}, ${(drawingEdge.startX + drawingEdge.endX) / 2} ${drawingEdge.endY}, ${drawingEdge.endX} ${drawingEdge.endY}`} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6,6" className="text-soft-blue/50" />
                )}
              </svg>

              <div 
                className="relative z-20 w-full h-full pointer-events-none"
                onContextMenu={(e) => {
                  const nodeElement = (e.target as HTMLElement).closest('[data-node-id]');
                  if (nodeElement) {
                    const id = nodeElement.getAttribute('data-node-id')!;
                    handleNodeContextMenu(e, id);
                  }
                }}
              >
                {nodes.map(node => (
                  <WorkflowNode 
                    key={node.id} 
                    node={node} 
                    isSelected={node.id === selectedNodeId} 
                    isActiveSource={node.id === activeSourceId} 
                    onSelect={(n) => { setSelectedNodeId(n.id); setIsPanelOpen(true); }} 
                    onDragStart={handleDragStart} 
                    onPortMouseDown={handlePortMouseDown} 
                    onPortMouseUp={handlePortMouseUp} 
                    fanpages={fanpages}
                  />
                ))}
              </div>
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
                             <div className="flex flex-wrap gap-2 mt-2">
                                <p className="text-[9px] text-text-muted font-black uppercase tracking-widest">{node.type}</p>
                                {node.type === 'trigger' && (
                                  <>
                                    {node.config.topic && <span className="text-[8px] font-black text-soft-blue uppercase bg-soft-blue/5 px-2 py-0.5 rounded-lg border border-soft-blue/10">{node.config.topic}</span>}
                                    {node.config.time && <span className="text-[8px] font-black text-text-muted uppercase bg-white/5 px-2 py-0.5 rounded-lg">{node.config.time}</span>}
                                  </>
                                )}
                                {node.type === 'publish' && node.config.pageId && (
                                  <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                                    {fanpages.find(f => f.pageId === node.config.pageId)?.name || 'Fanpage mục tiêu'}
                                  </span>
                                )}
                                {(node.type === 'ai_text' || node.type === 'ai_video') && node.config.topic && (
                                  <span className="text-[8px] font-black text-indigo-500 uppercase bg-indigo-500/5 px-2 py-0.5 rounded-lg border border-indigo-500/10">{node.config.topic}</span>
                                )}
                             </div>
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
                 <div className="space-y-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Chủ đề (Topic)</label>
                       <select value={selectedNode.config.topic || ''} onChange={(e) => updateNodeConfig({ topic: e.target.value })} className="nm-input font-bold appearance-none">
                          <option value="">Chọn chủ đề...</option>
                          {topics.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Giờ đăng (Time)</label>
                       <input type="time" value={selectedNode.config.time || '09:00'} onChange={(e) => updateNodeConfig({ time: e.target.value })} className="nm-input font-bold" />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Số lượng bài (Run Count)</label>
                       <input type="number" value={selectedNode.config.runCount || 1} onChange={(e) => updateNodeConfig({ runCount: parseInt(e.target.value) })} className="nm-input font-bold" />
                    </div>
                 </div>
               )}
               {selectedNode.type === 'ai_text' && (
                 <div className="space-y-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Chủ đề (Topic)</label>
                       <select value={selectedNode.config.topic || ''} onChange={(e) => updateNodeConfig({ topic: e.target.value })} className="nm-input font-bold appearance-none">
                          <option value="">Chọn chủ đề...</option>
                          {topics.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Tông giọng (Tone)</label>
                       <select value={selectedNode.config.tone || 'professional and elegant'} onChange={(e) => updateNodeConfig({ tone: e.target.value })} className="nm-input font-bold appearance-none">
                          <option value="professional and elegant">Chuyên nghiệp & Sang trọng</option>
                          <option value="engaging and humorous">Hài hước & Thu thu hút</option>
                          <option value="friendly and helpful">Thân thiện & Hữu ích</option>
                          <option value="bold and direct">Mạnh mẽ & Trực diện</option>
                       </select>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Từ khóa (Keywords)</label>
                       <input type="text" value={selectedNode.config.keywords || ''} onChange={(e) => updateNodeConfig({ keywords: e.target.value })} placeholder="Ví dụ: AI, Marketing, Automation..." className="nm-input font-bold" />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Chỉ dẫn thêm (Instructions)</label>
                       <textarea value={selectedNode.config.instructions || ''} onChange={(e) => updateNodeConfig({ instructions: e.target.value })} placeholder="Hướng dẫn cụ thể cho AI..." className="nm-input min-h-[100px] font-bold py-6 text-sm" />
                    </div>
                 </div>
               )}
                {selectedNode.type === 'ai_video' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Video Template</label>
                        <select value={selectedNode.config.template || 'modern'} onChange={(e) => updateNodeConfig({ template: e.target.value })} className="nm-input font-bold appearance-none">
                          {videoTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">TTS Provider (Model)</label>
                        <select value={selectedNode.config.ttsProvider || 'edge'} onChange={(e) => updateNodeConfig({ ttsProvider: e.target.value, ttsVoiceId: '' })} className="nm-input font-bold appearance-none">
                          {ttsProviders.map(p => (
                            <option key={p} value={p}>{p.toUpperCase()} Engine</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Giọng đọc (Voice Signature)</label>
                        <select 
                          value={voices.find(v => v.voiceId === selectedNode.config.ttsVoiceId && v.provider === (selectedNode.config.ttsProvider || 'edge'))?.id || ''} 
                          onChange={(e) => {
                            const voice = voices.find(v => v.id === e.target.value);
                            if (voice) updateNodeConfig({ ttsVoiceId: voice.voiceId, ttsProvider: voice.provider });
                          }} 
                          className="nm-input font-bold appearance-none"
                        >
                          <option value="">Chọn giọng đọc...</option>
                          {voices.filter(v => v.provider === (selectedNode.config.ttsProvider || 'edge')).map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">BGM Audio</label>
                        <select value={selectedNode.config.bgmAssetId || 'none'} onChange={(e) => updateNodeConfig({ bgmAssetId: e.target.value })} className="nm-input font-bold appearance-none">
                          <option value="none">Không có nhạc nền</option>
                          {bgmPresets.map(bgm => (
                            <option key={bgm.id} value={bgm.id}>{bgm.name}</option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">BGM Volume ({Math.round((selectedNode.config.bgmVolume || 0.15) * 100)}%)</label>
                        <input type="range" min="0" max="1" step="0.05" value={selectedNode.config.bgmVolume || 0.15} onChange={(e) => updateNodeConfig({ bgmVolume: parseFloat(e.target.value) })} className="w-full h-2 bg-accent-bg rounded-lg appearance-none cursor-pointer accent-soft-blue" />
                     </div>
                  </div>
                )}
               {selectedNode.type === 'human_approval' && (
                  <div className="space-y-6">
                    <div className="nm-inset p-6 rounded-3xl bg-soft-blue/5">
                      <p className="text-[10px] font-bold text-soft-blue uppercase tracking-widest text-center">Step requires manual approval</p>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Review Instructions</label>
                       <textarea value={selectedNode.config.instructions || ''} onChange={(e) => updateNodeConfig({ instructions: e.target.value })} placeholder="What should the reviewer check?..." className="nm-input min-h-[100px] font-bold py-6 text-sm" />
                    </div>
                  </div>
               )}
               {selectedNode.type === 'publish' && (
                 <div className="space-y-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Fanpage Đích (Target)</label>
                       <select value={selectedNode.config.pageId || ''} onChange={(e) => updateNodeConfig({ pageId: e.target.value })} className="nm-input font-bold appearance-none">
                         <option value="">Chọn Fanpage...</option>
                         {fanpages.map(p => (
                           <option key={p.id} value={p.pageId}>{p.name}</option>
                         ))}
                       </select>
                    </div>
                    <div className="space-y-4">
                     <div className="nm-inset p-6 rounded-2xl">
                       <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Chế độ đăng bài</p>
                       <p className="text-xs font-bold text-text-primary">Bài viết sẽ được đưa vào hàng đợi đăng bài tự động của Fanpage đã chọn.</p>
                     </div>
                    </div>
                 </div>
               )}
               <div className="pt-10">
                  <button onClick={() => { setNodes(prev => prev.filter(n => n.id !== selectedNode.id)); setIsPanelOpen(false); }} className="w-full py-5 rounded-[24px] nm-button text-soft-pink font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:bg-soft-pink transition-all flex items-center justify-center gap-3">
                    <Trash size={16} /> Xóa Node
                  </button>

               </div>
            </div>
          </div>
        </aside>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[300] nm-flat rounded-2xl p-2 w-56 animate-in zoom-in-95 duration-200 border border-white/5"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'node' && (
            <div className="space-y-1">
              <button onClick={() => deleteNode(contextMenu.targetId!)} className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-soft-pink/10 hover:bg-soft-pink text-[10px] font-black text-soft-pink hover:text-white uppercase tracking-widest transition-all">
                <Trash2 size={16} /> Xóa Node
              </button>
              <div className="h-px bg-white/5 mx-2 my-1"></div>
              <button onClick={() => { setContextMenu(null); setIsPanelOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[10px] font-black text-text-primary uppercase tracking-widest transition-all">
                <Settings2 size={14} className="text-soft-blue" /> Cấu hình
              </button>
              <button onClick={() => duplicateNode(contextMenu.targetId!)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-soft-blue/10 text-[10px] font-black text-text-primary uppercase tracking-widest transition-all">
                <Copy size={14} className="text-soft-blue" /> Nhân bản
              </button>
              <button onClick={() => { toast.info('Execution started from selected node'); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-500/10 text-[10px] font-black text-emerald-500 uppercase tracking-widest transition-all">
                <Play size={14} className="fill-emerald-500" /> Chạy từ đây
              </button>
            </div>
          )}
          {contextMenu.type === 'edge' && (
            <div className="space-y-1">
              <div className="px-4 py-2 mb-1">
                <p className="text-[8px] font-black text-soft-blue uppercase tracking-widest">Link Actions</p>
              </div>
              <button onClick={() => deleteEdge(contextMenu.targetId!)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-soft-pink/10 text-[10px] font-black text-soft-pink uppercase tracking-widest transition-all">
                <Trash size={14} /> Xóa Liên Kết
              </button>
              <button onClick={() => setContextMenu(null)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[10px] font-black text-text-muted uppercase tracking-widest transition-all">
                <X size={14} /> Cancel
              </button>
            </div>
          )}
          {contextMenu.type === 'canvas' && (
            <div className="space-y-1">
              <p className="px-4 py-2 text-[8px] font-black text-text-muted uppercase tracking-widest">Quick Create</p>
              {(Object.entries(NODE_TYPES) as [NodeType, any][]).map(([type, meta]) => (
                <button key={type} onClick={() => { addNode(type); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-soft-blue/10 text-[10px] font-black text-text-primary uppercase tracking-widest transition-all">
                  <meta.icon size={14} className={meta.defaultColor.split(' ')[0]} /> {meta.title}
                </button>
              ))}
            </div>
          )}
        </div>
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
