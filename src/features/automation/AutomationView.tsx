import React, { useState, useEffect, useCallback, memo } from 'react';
import { Clock, Sliders, X, Plus, Bot, RefreshCw, Trash2, Pause, Play, AlertCircle, Calendar, Zap, Layers, Activity, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { Fanpage, Schedule, Topic } from '../../types';
import { AutomationSettings, AutomationConfig } from './AutomationSettings';
import { useLanguage } from '../../LanguageContext';
import { CONFIG } from '../../config';
import { ApiService } from '../../api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// [rerender-no-inline-components] - Move QueueModal out of main view and memoize
const QueueModal = memo(({
  schedule,
  onClose,
  api
}: {
  schedule: Schedule,
  onClose: () => void,
  api: ApiService
}) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useLanguage();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.schedules.getPosts(schedule.id);
      setPosts(data);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [schedule.id, api]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    let updatedPosts: any[] = [];
    setPosts(prev => {
      const newPosts = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPosts.length) return prev;
      [newPosts[index], newPosts[targetIndex]] = [newPosts[targetIndex], newPosts[index]];
      updatedPosts = newPosts;
      return newPosts;
    });

    if (updatedPosts.length === 0) return;

    setIsUpdating(true);
    try {
      await api.fetch('/api/posts/reorder', {
        method: 'POST',
        body: JSON.stringify({ postIds: updatedPosts.map(p => p.id) })
      });
    } catch (err) {
      fetchPosts(); // Rollback on error
    } finally {
      setIsUpdating(false);
    }
  }, [api, fetchPosts]);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="nm-flat w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 rounded-lg sm:rounded-xl">
        <div className="px-6 sm:px-10 py-6 sm:py-8 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <Layers size={20} sm:size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-gray-100 ">{t('automation')} Queue</h3>
              <p className="text-[9px] sm:text-[10px] text-[#6B7280] dark:text-gray-400 font-bold uppercase mt-1 opacity-60">{schedule.topic} • {schedule.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-colors">
            <X size={20} sm:size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 sm:space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-32 gap-6">
              <RefreshCw className="w-10 h-10 text-[#2563EB] dark:text-blue-400 animate-spin opacity-30" />
              <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-32 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-xl">
              <Bot size={48} className="mx-auto mb-6 text-[#6B7280] dark:text-gray-400 opacity-10" />
              <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em]">{t('noData')}</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <div key={post.id} className="nm-flat p-6 flex items-center gap-8 group hover:scale-[1.01] transition-all">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0 || isUpdating} className="w-8 h-8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400 disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <div className="w-10 h-10 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center font-bold text-xs text-[#2563EB] dark:text-blue-400">{index + 1}</div>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === posts.length - 1 || isUpdating} className="w-8 h-8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400 disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {post.imageUrl ? (
                  <div className="w-24 h-24 rounded-xl bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-2 overflow-hidden flex-shrink-0">
                    <img src={(() => { try { const m = JSON.parse(post.imageUrl); return Array.isArray(m) ? m[0].data : post.imageUrl; } catch(e) { return post.imageUrl } })()} className="w-full h-full object-cover rounded-lg" />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0 py-2">
                  <p className="text-sm font-bold text-[#111827] dark:text-gray-100 line-clamp-2 leading-relaxed ">{post.content}</p>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-3 py-1 rounded-lg text-[9px] font-bold text-emerald-500 uppercase">Queued</div>
                    <div className="flex items-center text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase"><Clock size={12} className="mr-2" /> {new Date(post.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="px-10 py-8 border-t border-text-muted/5 flex justify-between items-center">
          <p className="text-[9px] text-[#6B7280] dark:text-gray-400 font-bold uppercase tracking-[0.2em]">{t('sortingNotice')}</p>
          <button onClick={onClose} className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-10 py-4 font-bold uppercase text-[10px] tracking-normal text-[#111827] dark:text-gray-100">
            {t('finishedManagement')}
          </button>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }`}</style>
    </div>
  );
});

QueueModal.displayName = 'QueueModal';

export const AutomationView = ({ fanpages, api, initialFanpageId }: { fanpages: Fanpage[], api: ApiService, initialFanpageId?: string }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState('');
  const [time, setTime] = useState(CONFIG.DEFAULT_TIME);
  const [runCount, setRunCount] = useState<number>(CONFIG.DEFAULT_RUN_COUNT);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    tone: 'professional and elegant',
    keywords: '',
    instructions: ''
  });
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [isSaving, setIsGeneratingBatch] = useState(false);
  const [isGeneratingBatchRecord, setIsGeneratingBatchRecord] = useState<Record<string, boolean>>({});
  const [selectedScheduleForQueue, setSelectedScheduleForQueue] = useState<Schedule | null>(null);
  const [postStatus, setPostStatus] = useState({ type: '', message: '' });
  const [batchConflict, setBatchConflict] = useState<{ schedule: Schedule, existingCount: number } | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    if (postStatus.message) {
      const timer = setTimeout(() => setPostStatus({ type: '', message: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [postStatus.message]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schData, topData, wfData] = await Promise.all([ 
          api.schedules.list(), 
          api.topics.list(),
          api.workflows.list().catch(() => [])
        ]);
        setSchedules(schData); 
        setTopics(topData);
        setWorkflows(wfData);
        if (topData.length > 0) setTopic(topData[0].name);
      } catch (err) { console.warn('Data Load Error', err); }
    };
    fetchData();
  }, [api]);

  useEffect(() => {
    if (initialFanpageId && fanpages.some(p => p.id === initialFanpageId)) setSelectedFanpage(initialFanpageId);
  }, [initialFanpageId, fanpages]);

  const handleCreateSchedule = useCallback(async () => {
    if (!topic || !selectedFanpage || !time) { 
      setPostStatus({ type: 'error', message: 'Full Strategy Required' });
      return; 
    }
    const page = fanpages.find(p => p.id === selectedFanpage);
    if (!page) return;

    let advancedPrompt = showAdvanced ? `Tone: ${automationConfig.tone}\nMust include: ${automationConfig.keywords}\nAdditional: ${automationConfig.instructions}` : '';
    setIsGeneratingBatch(true);
    setPostStatus({ type: '', message: '' });
    const tid = toast.loading('Đang khởi tạo lịch đăng bài...');
    try {
      const data = await api.schedules.create({ 
        topic, 
        fanpageId: page.pageId, 
        fanpageName: page.name, 
        accessToken: page.accessToken, 
        time, 
        runCount, 
        advancedPrompt,
        workflowId: selectedWorkflow || undefined
      });
      if (data.schedule) {
        setSchedules(prev => [...prev, data.schedule]);
        setShowAdvanced(false);
        setPostStatus({ type: 'success', message: 'Schedule launched successfully' });
        toast.success('Đã thiết lập lịch đăng bài thành công!', { id: tid });
      }
    } catch (err) { 
      setPostStatus({ type: 'error', message: 'Failed to launch schedule' });
      toast.error('Lỗi thiết lập lịch đăng bài', { id: tid });
    } finally { setIsGeneratingBatch(false); }
  }, [topic, selectedFanpage, time, automationConfig, showAdvanced, fanpages, runCount, selectedWorkflow, api]);

  const handleGenerateBatch = useCallback(async (schedule: Schedule, mode?: 'add' | 'replace') => {
    const scheduleId = schedule.id;

    if (!mode) {
      const existingPosts = await api.schedules.getPosts(scheduleId);
      const queuedCount = existingPosts.filter((p: any) => p.status === 'queued').length;
      if (queuedCount > 0) {
        setBatchConflict({ schedule, existingCount: queuedCount });
        return;
      }
    }

    setBatchConflict(null);
    setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: true }));
    setPostStatus({ type: '', message: '' });

    try {
      if (mode === 'replace') {
        await api.fetch(`/api/posts/schedule/${scheduleId}/queue`, { method: 'DELETE' });
      }

      const numToGenerate = schedule.runCount || 1;
      
      // If schedule is linked to a workflow, use the workflow engine!
      if (schedule.workflowId) {
        setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: true }));
        const tid = toast.loading('Đang kích hoạt quy trình AI...');
        try {
          await api.workflows.execute(schedule.workflowId!, {
            scheduleId: schedule.id,
            topic: schedule.topic,
            prompt: schedule.advancedPrompt,
            selectedFanpage: schedule.fanpageId,
            batchCount: numToGenerate // Send batchCount to let backend handle the loop
          });
          setPostStatus({ type: 'success', message: `Batch of ${numToGenerate} started on server. Check Video Queue for progress.` });
          toast.success(`Đã bắt đầu tạo ${numToGenerate} nội dung qua AI`, { id: tid });
        } catch (err) {
          setPostStatus({ type: 'error', message: 'Failed to start batch generation.' });
          toast.error('Lỗi khi chạy quy trình AI', { id: tid });
        } finally {
          setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: false }));
        }
      } else {
        // Legacy manual generation
        let startIndex = 0;
        if (mode === 'add') {
          const existingPosts = await api.schedules.getPosts(scheduleId);
          const queued = existingPosts.filter((p: any) => p.status === 'queued');
          startIndex = queued.length;
        }

        const tasks = Array.from({ length: numToGenerate }, async (_, i) => {
           let basePrompt = `Write a professional Facebook post about ${schedule.topic} [#${startIndex + i + 1}]. Tone: engaging. Language: Vietnamese. IMPORTANT: Return ONLY post content.`;
           if (schedule.advancedPrompt) basePrompt += `\nGuidelines: ${schedule.advancedPrompt}`;
           
           const textData = await api.ai.generateText(basePrompt);
           const imgData = await api.ai.generateImage(`Photography of ${schedule.topic}. ${schedule.advancedPrompt || ''}`);
           const finalImageUrl = imgData.imageUrl ? JSON.stringify([{ type: 'image', data: imgData.imageUrl, id: `${Date.now()}-${i}` }]) : null;
           
           return api.fetch('/api/posts/queue', {
             method: 'POST',
             body: JSON.stringify({ topic: schedule.topic, content: textData.text, imageUrl: finalImageUrl, fanpageId: schedule.fanpageId, scheduleId: schedule.id, status: 'queued', orderIndex: startIndex + i })
           });
        });
        await Promise.all(tasks);
        setPostStatus({ type: 'success', message: `Batch deployed: ${numToGenerate} posts queued.` });
        toast.success(`Đã đưa ${numToGenerate} bài vào hàng chờ thành công!`);
      }
    } catch (err) { 
      setPostStatus({ type: 'error', message: 'Batch generation failed' });
    } finally {
      setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: false }));
    }
  }, [api]);

  const handleToggleSuspend = useCallback(async (schedule: Schedule) => {
    const newStatus = schedule.status === 'active' ? 'suspended' : 'active';
    try {
      await api.schedules.updateStatus(schedule.id, newStatus);
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: newStatus } : s));
      setPostStatus({ type: 'success', message: newStatus === 'suspended' ? 'Schedule suspended.' : 'Schedule resumed.' });
      toast.success(newStatus === 'suspended' ? 'Đã tạm dừng lịch đăng' : 'Đã tiếp tục lịch đăng');
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to update schedule status.' });
      toast.error('Lỗi cập nhật trạng thái');
    }
  }, [api]);

  const handleDeleteSchedule = useCallback(async (schedule: Schedule) => {
    if (!confirm(`Hard Delete "${schedule.topic}"?`)) return;
    try {
      await api.schedules.delete(schedule.id);
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      setPostStatus({ type: 'success', message: 'Schedule and unpublished posts deleted.' });
      toast.success('Đã xóa lịch đăng và các bài chưa đăng');
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to delete schedule.' });
      toast.error('Lỗi khi xóa lịch đăng');
    }
  }, [api]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="nm-flat p-10 relative overflow-hidden">
        <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100 mb-12 flex items-center gap-6 ">
          <div className="w-14 h-14 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400"><Calendar size={28} /></div>
          {t('contentScheduler')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
           <div className="space-y-4">
             <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('topicsKeywords')}</label>
             <Select value={topic} onValueChange={setTopic}>
               <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                 {topics.map(t => (
                   <SelectItem key={t.id} value={t.name} className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">
                     {t.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-4">
             <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">Fanpage</label>
             <Select value={selectedFanpage} onValueChange={setSelectedFanpage}>
               <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                 <SelectValue placeholder="Select Target Page" />
               </SelectTrigger>
               <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                 {fanpages.filter(p => p.status === 'active').map(page => (
                   <SelectItem key={page.id} value={page.id} className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">
                     {page.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           <div className="space-y-4">
             <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">Posting Time</label>
             <Input 
               type="time" 
               className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all [color-scheme:dark]" 
               value={time} 
               onChange={e => setTime(e.target.value)} 
             />
           </div>
           <div className="space-y-4">
             <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">Strategy Workflow</label>
             <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
               <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                 <SelectValue placeholder="Legacy Generation (Text/Image)" />
               </SelectTrigger>
               <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                 {workflows.map(wf => (
                   <SelectItem key={wf.id} value={wf.id} className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">
                     {wf.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
           <button 
             onClick={handleCreateSchedule} 
             disabled={isSaving} 
             className="bg-[#2563EB] text-white py-5 rounded-xl font-bold uppercase text-xs tracking-normal shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
           >
             {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
             <span>{isSaving ? 'DEPLOYING...' : t('launchSchedule')}</span>
           </button>
        </div>

        <div className="mt-10">
          <AutomationSettings 
            config={automationConfig} 
            onChange={setAutomationConfig} 
            show={showAdvanced} 
            onToggle={() => setShowAdvanced(!showAdvanced)} 
          />
        </div>

        {postStatus.message && (
          <div className={`mt-10 p-6 rounded-xl bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[10px] font-bold uppercase flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${postStatus.type === 'success' ? 'text-emerald-500' : 'text-soft-pink'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${postStatus.type === 'success' ? 'bg-emerald-500' : 'bg-soft-pink'}`}></div>
            {postStatus.message}
          </div>
        )}
      </div>

      <div className="nm-flat overflow-hidden">
        <div className="px-10 py-8 border-b border-text-muted/5 flex justify-between items-center">
          <h3 className="text-xs font-bold text-[#111827] dark:text-gray-100 uppercase">{t('activeSchedules')}</h3>
        </div>
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[#6B7280] dark:text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                <th className="px-10 py-8">Topic/Category</th>
                <th className="px-10 py-8">Fanpage Target</th>
                <th className="px-10 py-8">Schedule</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-muted/5">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg mx-auto w-16 h-16 rounded-full flex items-center justify-center text-[#6B7280] dark:text-gray-400/20 mb-6">
                      <Activity size={32} />
                    </div>
                    <p className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em]">{t('noData')}</p>
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-white/30 transition-colors group">
                    <td className="px-10 py-8 font-bold text-[#111827] dark:text-gray-100  text-sm">{s.topic}</td>
                    <td className="px-10 py-8 text-[11px] text-[#6B7280] dark:text-gray-400 font-bold ">{s.fanpageName}</td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3">
                         <div className={`bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-4 py-2 rounded-xl text-[10px] font-bold uppercase ${s.status === 'suspended' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                           {s.time} • {s.runCount} POSTS TOTAL (1/DAY)
                         </div>
                         {s.queuedCount > 0 && (
                           <div className="text-[8px] font-bold text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/10 uppercase flex items-center gap-2">
                             <CheckCircle2 size={12} /> BATCH READY
                           </div>
                         )}
                         {s.status === 'suspended' && (
                           <div className="text-[8px] font-bold text-soft-pink bg-soft-pink/5 px-2 py-1 rounded-lg border border-soft-pink/10 uppercase">HALTED</div>
                         )}
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleGenerateBatch(s)} 
                          disabled={isGeneratingBatchRecord[s.id] || s.status === 'suspended'} 
                          className={`border border-[#D1D5DB] dark:border-white/12 rounded-lg px-6 py-3 text-[10px] font-bold uppercase transition-all ${isGeneratingBatchRecord[s.id] ? 'text-[#2563EB] dark:text-blue-400' : (s.queuedCount > 0 ? 'text-emerald-500 hover:text-emerald-400' : 'text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400')} disabled:opacity-30`}
                        >
                          {isGeneratingBatchRecord[s.id] ? 'GEN...' : (s.queuedCount > 0 ? 'Regenerate' : 'Generate Batch')}
                        </button>
                        <button onClick={() => setSelectedScheduleForQueue(s)} className="w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400" title="View Queue">
                          <Layers size={18} />
                        </button>
                        <button onClick={() => handleToggleSuspend(s)} className={`w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center transition-all ${s.status === 'suspended' ? 'text-emerald-500' : 'text-amber-500'}`} title={s.status === 'suspended' ? 'Resume' : 'Pause'}>
                          {s.status === 'suspended' ? <Play size={18} /> : <Pause size={18} />}
                        </button>
                        <button onClick={() => handleDeleteSchedule(s)} className="w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-all" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-6">
           {schedules.length === 0 ? (
             <div className="py-16 text-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-lg">
                <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('noData')}</p>
             </div>
           ) : (
             schedules.map((s) => (
               <div key={s.id} className="nm-flat p-6 rounded-lg space-y-5">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-sm font-bold text-[#111827] dark:text-gray-100 ">{s.topic}</h4>
                        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase mt-1">{s.fanpageName}</p>
                     </div>
                     <div className={`bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase ${s.status === 'suspended' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                        {s.status === 'suspended' ? 'Suspended' : 'Active'}
                     </div>
                  </div>

                  <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-4 rounded-lg flex justify-between items-center">
                     <div className="space-y-1">
                        <p className="text-[8px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em]">Post Time</p>
                        <p className="text-xs font-bold text-[#111827] dark:text-gray-100">{s.time}</p>
                     </div>
                     <div className="w-[1px] h-6 bg-text-muted/10" />
                     <div className="space-y-1 text-right">
                        <p className="text-[8px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em]">Total Posts</p>
                        <p className="text-xs font-bold text-[#111827] dark:text-gray-100">{s.runCount}X</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => handleGenerateBatch(s)}
                       disabled={isGeneratingBatchRecord[s.id] || s.status === 'suspended'}
                       className="border border-[#D1D5DB] dark:border-white/12 rounded-lg py-4 text-[9px] font-bold uppercase text-[#2563EB] dark:text-blue-400 flex items-center justify-center gap-2"
                     >
                        <RefreshCw size={14} className={isGeneratingBatchRecord[s.id] ? 'animate-spin' : ''} />
                        {isGeneratingBatchRecord[s.id] ? 'Gen...' : 'Batch'}
                     </button>
                     <button onClick={() => setSelectedScheduleForQueue(s)} className="border border-[#D1D5DB] dark:border-white/12 rounded-lg py-4 text-[9px] font-bold uppercase text-[#111827] dark:text-gray-100 flex items-center justify-center gap-2">
                        <Layers size={14} /> Queue
                     </button>
                     <button onClick={() => handleToggleSuspend(s)} className={`border border-[#D1D5DB] dark:border-white/12 rounded-lg py-4 text-[9px] font-bold uppercase flex items-center justify-center gap-2 ${s.status === 'suspended' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {s.status === 'suspended' ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Halt</>}
                     </button>
                     <button onClick={() => handleDeleteSchedule(s)} className="border border-[#D1D5DB] dark:border-white/12 rounded-lg py-4 text-[9px] font-bold uppercase text-soft-pink flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Delete
                     </button>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {selectedScheduleForQueue ? (
        <QueueModal schedule={selectedScheduleForQueue} onClose={() => setSelectedScheduleForQueue(null)} api={api} />
      ) : null}

      {/* Batch Conflict Resolution Modal */}
      {batchConflict && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="nm-flat max-w-lg w-full p-10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-14 h-14 nm-flat flex items-center justify-center text-amber-500">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111827] dark:text-gray-100 ">Queue Status</h3>
                <p className="text-[10px] text-[#6B7280] dark:text-gray-400 font-bold uppercase mt-1.5 opacity-60">Action Required</p>
              </div>
            </div>
            
            <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-8 leading-relaxed">
              Hàng đợi hiện đang có <span className="font-bold text-soft-pink">{batchConflict.existingCount} bài chưa đăng</span>. Bạn muốn mở rộng hàng đợi hay thay thế toàn bộ?
            </p>

            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'add')}
                className="border border-[#D1D5DB] dark:border-white/12 rounded-lg w-full py-5 text-[10px] font-bold uppercase text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400 transition-all flex items-center justify-center gap-4"
              >
                 <Plus size={16} />
                 Append ({batchConflict.existingCount} + {batchConflict.schedule.runCount})
              </button>
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'replace')}
                className="w-full py-5 bg-soft-pink text-white rounded-xl font-bold uppercase text-[10px] tracking-normal shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4"
              >
                <Trash2 size={16} />
                Purge & Replace
              </button>
              <button onClick={() => setBatchConflict(null)} className="w-full py-2 text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase hover:text-[#111827] dark:text-gray-100 transition-colors">
                Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
