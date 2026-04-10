import React, { useState, useEffect, useCallback, memo, useMemo, useTransition } from 'react';
import { Clock, Sliders, X, Plus, Bot, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Fanpage, Schedule, Topic } from '../types';
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
  const [tone, setTone] = useState('professional and elegant');
  const [mustInclude, setMustInclude] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<Record<string, boolean>>({});
  const [selectedScheduleForQueue, setSelectedScheduleForQueue] = useState<Schedule | null>(null);
  const { t } = useLanguage();

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
    if (!topic || !selectedFanpage || !time) { alert('Full Strategy Required'); return; }
    const page = fanpages.find(p => p.id === selectedFanpage);
    if (!page) return;

    let advancedPrompt = showAdvanced ? `Tone: ${tone}\nMust include: ${mustInclude}\nAdditional: ${additionalInstructions}` : '';
    setIsSaving(true);
    try {
      const data = await api.schedules.create({ topic, fanpageId: page.pageId, fanpageName: page.name, accessToken: page.accessToken, time, runCount, advancedPrompt });
      if (data.schedule) {
        setSchedules(prev => [...prev, data.schedule]);
        setShowAdvanced(false);
      }
    } catch (err) { alert('API Error'); } finally { setIsSaving(false); }
  }, [topic, selectedFanpage, time, tone, mustInclude, additionalInstructions, showAdvanced, fanpages, runCount, api]);

  const handleGenerateBatch = useCallback(async (schedule: Schedule) => {
    const scheduleId = schedule.id;
    setIsGeneratingBatch(prev => ({ ...prev, [scheduleId]: true }));

    try {
      const numToGenerate = schedule.runCount || 1;
      const tasks = Array.from({ length: numToGenerate }, async (_, i) => {
         let basePrompt = `Write a professional Facebook post about ${schedule.topic} [#${i+1}]. Tone: engaging. Language: Vietnamese. IMPORTANT: Return ONLY post content.`;
         if (schedule.advancedPrompt) basePrompt += `\nGuidelines: ${schedule.advancedPrompt}`;
         
         const textData = await api.ai.generateText(basePrompt);
         const imgData = await api.ai.generateImage(`Photography of ${schedule.topic}. ${schedule.advancedPrompt || ''}`);
         
         const finalImageUrl = imgData.imageUrl ? JSON.stringify([{ type: 'image', data: imgData.imageUrl, id: `${Date.now()}-${i}` }]) : null;
         
         return api.fetch('/api/posts/queue', {
           method: 'POST',
           body: JSON.stringify({ topic: schedule.topic, content: textData.text, imageUrl: finalImageUrl, fanpageId: schedule.fanpageId, scheduleId: schedule.id, status: 'queued', orderIndex: i })
         });
      });

      await Promise.all(tasks);
      alert(`Batch Deployment: ${numToGenerate} nodes synchronized.`);
    } catch (err) { alert('Batch Error'); } finally {
      setIsGeneratingBatch(prev => ({ ...prev, [scheduleId]: false }));
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end relative z-10">
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
           <button onClick={handleCreateSchedule} disabled={isSaving} className="md:col-span-2 bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30">
             <Plus size={16} /> {isSaving ? t('loading') : t('launchSchedule')}
           </button>
        </div>
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
                       <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">Daily {s.time} • {s.runCount}x</span>
                    </td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                      <button onClick={() => handleGenerateBatch(s)} disabled={isGeneratingBatch[s.id]} className="bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase border border-slate-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all">
                        {isGeneratingBatch[s.id] ? 'Deploying...' : 'Generate'}
                      </button>
                      <button onClick={() => setSelectedScheduleForQueue(s)} className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-slate-800 hover:text-slate-200 transition-all">Queue</button>
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
    </div>
  );
};
