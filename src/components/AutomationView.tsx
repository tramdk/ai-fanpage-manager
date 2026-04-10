import React, { useState, useEffect, useCallback, memo } from 'react';
import { Clock, Sliders, X, Plus, Bot, RefreshCw, Trash2, Pause, Play } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Fanpage, Schedule, Topic } from '../types';
import { AutomationSettings, AutomationConfig } from './AutomationSettings';
import { useLanguage } from '../LanguageContext';
import { CONFIG } from '../config';
import { ApiService } from '../api';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schedule.id, api]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    // [rerender-functional-setstate] - Use functional update
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/10"><Clock className="w-5 h-5" /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-50 uppercase tracking-tight">{t('automation')}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{schedule.topic} • {schedule.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-950/50 space-y-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 animate-pulse">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 border border-dashed border-slate-800 rounded-[28px]">
              <Bot className="w-12 h-12 mx-auto mb-4 text-slate-800" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{t('noData')}</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <div key={post.id} className="flex items-center space-x-5 p-5 rounded-2xl border border-slate-800 bg-slate-900 group hover:border-emerald-500/30 transition-all">
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0 || isUpdating} className="p-1 hover:bg-slate-800 rounded text-slate-600 hover:text-emerald-500 disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-400 group-hover:text-emerald-500 transition-colors">{index + 1}</div>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === posts.length - 1 || isUpdating} className="p-1 hover:bg-slate-800 rounded text-slate-600 hover:text-emerald-500 disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {post.imageUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800 bg-slate-800">
                    <img src={(() => { try { const m = JSON.parse(post.imageUrl); return Array.isArray(m) ? m[0].data : post.imageUrl; } catch(e) { return post.imageUrl } })()} className="w-full h-full object-cover" />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-200 line-clamp-2 leading-relaxed">{post.content}</p>
                  <div className="mt-2.5 flex items-center space-x-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-500">Queued</span>
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="px-8 py-5 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{t('sortingNotice')}</p>
          <button onClick={onClose} className="px-8 py-3 bg-slate-50 text-slate-950 border border-slate-800 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
            {t('finishedManagement')}
          </button>
        </div>
      </div>
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
  const [isSaving, setIsGeneratingBatch] = useState(false); // Refactored state
  const [isGeneratingBatchRecord, setIsGeneratingBatchRecord] = useState<Record<string, boolean>>({});
  const [selectedScheduleForQueue, setSelectedScheduleForQueue] = useState<Schedule | null>(null);
  const [postStatus, setPostStatus] = useState({ type: '', message: '' });
  const [batchConflict, setBatchConflict] = useState<{ schedule: Schedule, existingCount: number } | null>(null);
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
        const [schData, topData] = await Promise.all([ api.schedules.list(), api.topics.list() ]);
        setSchedules(schData); setTopics(topData);
        if (topData.length > 0) setTopic(topData[0].name);
      } catch (err) { console.error('Data Load Error', err); }
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
    try {
      const data = await api.schedules.create({ topic, fanpageId: page.pageId, fanpageName: page.name, accessToken: page.accessToken, time, runCount, advancedPrompt });
      if (data.schedule) {
        setSchedules(prev => [...prev, data.schedule]);
        setShowAdvanced(false);
        setPostStatus({ type: 'success', message: 'Schedule launched successfully' });
      }
    } catch (err) { 
      setPostStatus({ type: 'error', message: 'Failed to launch schedule' });
    } finally { setIsGeneratingBatch(false); }
  }, [topic, selectedFanpage, time, automationConfig, showAdvanced, fanpages, runCount, api]);

  const handleGenerateBatch = useCallback(async (schedule: Schedule, mode?: 'add' | 'replace') => {
    const scheduleId = schedule.id;

    // If mode is not specified, check for existing queued posts first
    if (!mode) {
      const existingPosts = await api.schedules.getPosts(scheduleId);
      const queuedCount = existingPosts.filter((p: any) => p.status === 'queued').length;
      if (queuedCount > 0) {
        setBatchConflict({ schedule, existingCount: queuedCount });
        return; // Show conflict modal, wait for user choice
      }
    }

    setBatchConflict(null);
    setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: true }));
    setPostStatus({ type: '', message: '' });

    try {
      // If replace mode: delete all queued/failed posts first
      if (mode === 'replace') {
        await api.fetch(`/api/posts/schedule/${scheduleId}/queue`, { method: 'DELETE' });
      }

      // Get current max orderIndex to append correctly in 'add' mode
      let startIndex = 0;
      if (mode === 'add') {
        const existingPosts = await api.schedules.getPosts(scheduleId);
        const queued = existingPosts.filter((p: any) => p.status === 'queued');
        startIndex = queued.length;
      }

      const numToGenerate = schedule.runCount || 1;
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
    } catch (err) { 
      setPostStatus({ type: 'error', message: 'Batch generation failed' });
    } finally {
      setIsGeneratingBatchRecord(prev => ({ ...prev, [scheduleId]: false }));
    }
  }, [api]);

  const handleToggleSuspend = useCallback(async (schedule: Schedule) => {
    const newStatus = schedule.status === 'active' ? 'suspended' : 'active';
    try {
      const updated = await api.schedules.updateStatus(schedule.id, newStatus);
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: newStatus } : s));
      setPostStatus({ type: 'success', message: newStatus === 'suspended' ? 'Schedule suspended.' : 'Schedule resumed.' });
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to update schedule status.' });
    }
  }, [api]);

  const handleDeleteSchedule = useCallback(async (schedule: Schedule) => {
    if (!confirm(`Hard Delete "${schedule.topic}"?\n\nSẽ xóa:\n• Tất cả bài chưa đăng (queued/failed)\n• Lịch trình này\n\nBài đã published sẽ được giữ lại trong Activity Logs.`)) return;
    try {
      await api.schedules.delete(schedule.id);
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      setPostStatus({ type: 'success', message: 'Schedule and unpublished posts deleted.' });
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to delete schedule.' });
    }
  }, [api]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <h3 className="text-lg font-bold text-slate-50 mb-10 flex items-center uppercase tracking-tight relative z-10">
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl mr-4 shadow-lg shadow-emerald-500/10"><Clock size={20} /></div>
          {t('contentScheduler')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10">
           <div>
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block ml-2">{t('topicsKeywords')}</label>
             <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none" value={topic} onChange={e => setTopic(e.target.value)}>
                {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
             </select>
           </div>
           <div>
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block ml-2">Fanpage</label>
             <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
                <option value="">Select Page</option>
                {fanpages.filter(p => p.status === 'active').map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
             </select>
           </div>
           <div>
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block ml-2">Post Time</label>
             <input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all" value={time} onChange={e => setTime(e.target.value)} />
           </div>
           <button onClick={handleCreateSchedule} disabled={isSaving} className="bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30">
             <Plus size={16} /> {isSaving ? t('loading') : t('launchSchedule')}
           </button>
        </div>

        <div className="mt-8">
          <AutomationSettings 
            config={automationConfig} 
            onChange={setAutomationConfig} 
            show={showAdvanced} 
            onToggle={() => setShowAdvanced(!showAdvanced)} 
          />
        </div>

        {postStatus.message && (
          <div className={`mt-8 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${postStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${postStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            {postStatus.message}
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-50 uppercase tracking-widest">{t('activeSchedules')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Topic</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Page</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {schedules.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-700 font-bold uppercase tracking-widest text-[10px]">{t('noData')}</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5 font-bold text-slate-200 text-sm">{s.topic}</td>
                    <td className="px-8 py-5 text-xs text-slate-500 font-medium">{s.fanpageName}</td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${s.status === 'suspended' ? 'text-amber-500/80 bg-amber-500/5 border-amber-500/10' : 'text-emerald-500/80 bg-emerald-500/5 border-emerald-500/10'}`}>
                           Daily {s.time} • {s.runCount}x
                         </span>
                         {s.status === 'suspended' && (
                           <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 uppercase tracking-widest">Suspended</span>
                         )}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                      <button onClick={() => handleGenerateBatch(s)} disabled={isGeneratingBatchRecord[s.id] || s.status === 'suspended'} className="bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase border border-slate-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all disabled:opacity-30">
                        {isGeneratingBatchRecord[s.id] ? 'Deploying...' : 'Generate'}
                      </button>
                      <button onClick={() => setSelectedScheduleForQueue(s)} className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 hover:text-slate-200 transition-all">Queue</button>
                      <button onClick={() => handleToggleSuspend(s)} className={`p-2.5 rounded-xl border transition-all ${s.status === 'suspended' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'}`} title={s.status === 'suspended' ? 'Resume Schedule' : 'Suspend Schedule'}>
                        {s.status === 'suspended' ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                      <button onClick={() => handleDeleteSchedule(s)} className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all" title="Hard Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedScheduleForQueue ? (
        <QueueModal schedule={selectedScheduleForQueue} onClose={() => setSelectedScheduleForQueue(null)} api={api} />
      ) : null}

      {/* Batch Conflict Resolution Modal */}
      {batchConflict && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-3xl w-full max-w-md animate-in fade-in zoom-in duration-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-50 uppercase tracking-tight">Queue Conflict</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{batchConflict.schedule.topic}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Hàng đợi hiện đang có <span className="font-black text-amber-500">{batchConflict.existingCount} bài chưa đăng</span>.
            </p>
            <p className="text-[11px] text-slate-600 mb-8">Bạn muốn thêm bài mới vào cuối hàng đợi, hay xóa hàng đợi cũ và tạo mới hoàn toàn?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'add')}
                className="px-6 py-3.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all"
              >
                 <Plus size={12} className="inline mr-2" />
                 Thêm vào ({batchConflict.existingCount} + {batchConflict.schedule.runCount})
              </button>
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'replace')}
                className="px-6 py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all"
              >
                <Trash2 size={12} className="inline mr-2" />
                Thay thế ({batchConflict.existingCount} bài cũ sẽ bị xóa)
              </button>
            </div>
            <button onClick={() => setBatchConflict(null)} className="w-full mt-4 py-2.5 text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
