import React, { useState, useEffect, useCallback, memo } from 'react';
import { Clock, Sliders, X, Plus, Bot, RefreshCw, Trash2, Pause, Play, AlertCircle, Calendar, Zap, Layers } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { Fanpage, Schedule, Topic } from '../../types';
import { AutomationSettings, AutomationConfig } from './AutomationSettings';
import { useLanguage } from '../../LanguageContext';
import { CONFIG } from '../../config';
import { ApiService } from '../../api';

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
      <div className="nm-flat w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 rounded-[32px] sm:rounded-[48px]">
        <div className="px-6 sm:px-10 py-6 sm:py-8 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 nm-flat flex items-center justify-center text-soft-blue">
              <Layers size={20} sm:size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary uppercase tracking-tight">{t('automation')} Queue</h3>
              <p className="text-[9px] sm:text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1 opacity-60">{schedule.topic} • Protocol {schedule.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-colors">
            <X size={20} sm:size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 sm:space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-32 gap-6">
              <RefreshCw className="w-10 h-10 text-soft-blue animate-spin opacity-30" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('loading')}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-32 nm-inset rounded-[48px]">
              <Bot size={48} className="mx-auto mb-6 text-text-muted opacity-10" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">{t('noData')}</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <div key={post.id} className="nm-flat p-6 flex items-center gap-8 group hover:scale-[1.01] transition-all">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0 || isUpdating} className="w-8 h-8 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <div className="w-10 h-10 nm-inset flex items-center justify-center font-black text-xs text-soft-blue">{index + 1}</div>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === posts.length - 1 || isUpdating} className="w-8 h-8 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue disabled:opacity-20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>

                {post.imageUrl ? (
                  <div className="w-24 h-24 rounded-3xl nm-inset p-2 overflow-hidden flex-shrink-0">
                    <img src={(() => { try { const m = JSON.parse(post.imageUrl); return Array.isArray(m) ? m[0].data : post.imageUrl; } catch(e) { return post.imageUrl } })()} className="w-full h-full object-cover rounded-2xl" />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0 py-2">
                  <p className="text-sm font-bold text-text-primary line-clamp-2 leading-relaxed tracking-tight">{post.content}</p>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="nm-inset px-3 py-1 rounded-lg text-[9px] font-black text-emerald-500 uppercase tracking-widest">Queued</div>
                    <div className="flex items-center text-[9px] font-black text-text-muted uppercase tracking-widest"><Clock size={12} className="mr-2" /> {new Date(post.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="px-10 py-8 border-t border-text-muted/5 flex justify-between items-center">
          <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">{t('sortingNotice')}</p>
          <button onClick={onClose} className="nm-button px-10 py-4 font-black uppercase text-[10px] tracking-widest text-text-primary">
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
      await api.schedules.updateStatus(schedule.id, newStatus);
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, status: newStatus } : s));
      setPostStatus({ type: 'success', message: newStatus === 'suspended' ? 'Schedule suspended.' : 'Schedule resumed.' });
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to update schedule status.' });
    }
  }, [api]);

  const handleDeleteSchedule = useCallback(async (schedule: Schedule) => {
    if (!confirm(`Hard Delete "${schedule.topic}"?`)) return;
    try {
      await api.schedules.delete(schedule.id);
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      setPostStatus({ type: 'success', message: 'Schedule and unpublished posts deleted.' });
    } catch (err) {
      setPostStatus({ type: 'error', message: 'Failed to delete schedule.' });
    }
  }, [api]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="nm-flat p-10 relative overflow-hidden">
        <h3 className="text-2xl font-black text-text-primary mb-12 flex items-center gap-6 uppercase tracking-tight">
          <div className="w-14 h-14 nm-flat flex items-center justify-center text-soft-blue"><Calendar size={28} /></div>
          {t('contentScheduler')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
           <div className="space-y-4">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('topicsKeywords')}</label>
             <select className="nm-input font-bold" value={topic} onChange={e => setTopic(e.target.value)}>
                {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
             </select>
           </div>
           <div className="space-y-4">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">Fanpage</label>
             <select className="nm-input font-bold" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
                <option value="">Select Target Page</option>
                {fanpages.filter(p => p.status === 'active').map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
             </select>
           </div>
           <div className="space-y-4">
             <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">Post Protocol Time</label>
             <input type="time" className="nm-input font-bold" value={time} onChange={e => setTime(e.target.value)} />
           </div>
           <button 
             onClick={handleCreateSchedule} 
             disabled={isSaving} 
             className="bg-soft-blue text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
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
          <div className={`mt-10 p-6 rounded-3xl nm-inset text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${postStatus.type === 'success' ? 'text-emerald-500' : 'text-soft-pink'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${postStatus.type === 'success' ? 'bg-emerald-500' : 'bg-soft-pink'}`}></div>
            {postStatus.message}
          </div>
        )}
      </div>

      <div className="nm-flat overflow-hidden">
        <div className="px-10 py-8 border-b border-text-muted/5 flex justify-between items-center">
          <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">{t('activeSchedules')}</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Target Topic</th>
                <th className="px-10 py-6">Deployment Node</th>
                <th className="px-10 py-6">Schedule Logic</th>
                <th className="px-10 py-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-muted/5">
              {schedules.length === 0 ? (
                <tr><td colSpan={4} className="px-10 py-32 text-center text-text-muted font-black uppercase tracking-[0.3em] opacity-30">{t('noData')}</td></tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-white/30 transition-colors group">
                    <td className="px-10 py-8 font-black text-text-primary uppercase tracking-tight text-sm">{s.topic}</td>
                    <td className="px-10 py-8 text-[11px] text-text-secondary font-bold uppercase tracking-tight">{s.fanpageName}</td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-3">
                         <div className={`nm-inset px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.status === 'suspended' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                           DAILY {s.time} • {s.runCount}X
                         </div>
                         {s.status === 'suspended' && (
                           <div className="text-[8px] font-black text-soft-pink bg-soft-pink/5 px-2 py-1 rounded-lg border border-soft-pink/10 uppercase tracking-widest">HALTED</div>
                         )}
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleGenerateBatch(s)} 
                          disabled={isGeneratingBatchRecord[s.id] || s.status === 'suspended'} 
                          className={`nm-button px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isGeneratingBatchRecord[s.id] ? 'text-soft-blue' : 'text-text-primary hover:text-soft-blue'} disabled:opacity-30`}
                        >
                          {isGeneratingBatchRecord[s.id] ? 'GEN...' : 'Generate Batch'}
                        </button>
                        <button onClick={() => setSelectedScheduleForQueue(s)} className="w-11 h-11 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue" title="View Queue">
                          <Layers size={18} />
                        </button>
                        <button onClick={() => handleToggleSuspend(s)} className={`w-11 h-11 nm-button flex items-center justify-center transition-all ${s.status === 'suspended' ? 'text-emerald-500' : 'text-amber-500'}`} title={s.status === 'suspended' ? 'Resume Protocol' : 'Suspend Protocol'}>
                          {s.status === 'suspended' ? <Play size={18} /> : <Pause size={18} />}
                        </button>
                        <button onClick={() => handleDeleteSchedule(s)} className="w-11 h-11 nm-button flex items-center justify-center text-text-secondary hover:text-soft-pink transition-all" title="Terminate Strategy">
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
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Queue Conflict</h3>
                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1.5 opacity-60">Strategic Decision Required</p>
              </div>
            </div>
            
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Hàng đợi hiện đang có <span className="font-black text-soft-pink">{batchConflict.existingCount} bài chưa đăng</span>. Bạn muốn mở rộng hàng đợi hay thay thế toàn bộ?
            </p>

            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'add')}
                className="nm-button w-full py-5 text-[10px] font-black uppercase tracking-widest text-text-primary hover:text-soft-blue transition-all flex items-center justify-center gap-4"
              >
                 <Plus size={16} />
                 Append ({batchConflict.existingCount} + {batchConflict.schedule.runCount})
              </button>
              <button
                onClick={() => handleGenerateBatch(batchConflict.schedule, 'replace')}
                className="w-full py-5 bg-soft-pink text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4"
              >
                <Trash2 size={16} />
                Purge & Replace
              </button>
              <button onClick={() => setBatchConflict(null)} className="w-full py-2 text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors">
                Abort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
