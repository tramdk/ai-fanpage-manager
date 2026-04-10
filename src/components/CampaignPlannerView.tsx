import React, { useState, useEffect, useCallback, useMemo, useTransition, memo } from 'react';
import { 
  Plus, RefreshCw, X, FileText, Target as Roadmap,
  ArrowRight, Filter, Edit3, Sparkles, Loader2, Clock, Info, Shield, Target
} from 'lucide-react';
import { ApiService } from '../api';
import { Post, Schedule, Fanpage } from '../types';
import { AICreativeStudio } from './AICreativeStudio';

// [rendering-memo] - Ensure performance for many list items
const PostPreviewCard = memo(({ post, onEdit }: { post: any; onEdit: (post: any) => void }) => {
  const displayImage = useMemo(() => {
    if (!post.imageUrl) return `https://picsum.photos/seed/${post.topic || post.caption}/200/200`;
    try {
      const media = JSON.parse(post.imageUrl);
      return Array.isArray(media) ? media[0].data : post.imageUrl;
    } catch (e) { return post.imageUrl; }
  }, [post.imageUrl, post.topic, post.caption]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all hover:-translate-y-1 cursor-pointer group relative">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
          <img src={displayImage} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-1.5 font-bold text-[8px] uppercase tracking-widest">
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/10">{post.phase || 'Narrative'}</span>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="p-1 text-slate-600 hover:text-emerald-500 transition-colors"><Edit3 size={14} /></button>
                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-tighter uppercase">{post.time}</span>
             </div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-3 font-medium italic group-hover:text-slate-200 transition-colors">"{post.caption}"</p>
        </div>
      </div>
    </div>
  );
});

PostPreviewCard.displayName = 'PostPreviewCard';

const CampaignPlannerView: React.FC<{ api: ApiService }> = ({ api }) => {
  const [activeTab, setActiveTab] = useState('planner');
  const [isPending, startTransition] = useTransition();

  // SIDEBAR CONSOLE STATE
  const [campaignName, setCampaignName] = useState('');
  const [topic, setTopic] = useState('');
  const [mainIdea, setMainIdea] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0];
  });
  const [postTime, setPostTime] = useState('09:00');
  const [useDayProgression, setUseDayProgression] = useState(true); // [NEW] Toggle for daily series mode

  
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftProgress, setDraftProgress] = useState(0);
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [fanpages, setFanpages] = useState<Fanpage[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [selectedCampaignForMap, setSelectedCampaignForMap] = useState<string>('');
  
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const fetchPlannerData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleList, fanpageList, topicList] = await Promise.all([ 
        api.schedules.list(), 
        api.fanpages.list(),
        api.fetch('/api/topics').then(r => r.json())
      ]);
      setSchedules(scheduleList); 
      setFanpages(fanpageList);
      setTopics(topicList || []);
      
      if (fanpageList.length > 0 && !selectedFanpage) setSelectedFanpage(fanpageList[0].pageId);
      if (scheduleList.length > 0 && !selectedCampaignForMap) setSelectedCampaignForMap(scheduleList[0].id);

      // Initialize topic with first available one if empty
      if (topicList && topicList.length > 0 && !topic) setTopic(topicList[0].name);

      const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], today = new Date();
      const week: any[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(today.getDate() + i);
        return { dateObj: d, dayLabel: weekdays[d.getDay()], dateLabel: d.getDate().toString(), isToday: i === 0, posts: [] };
      });

      const collectedPosts: any[] = [];
      for (const schedule of scheduleList) {
        if (schedule.status !== 'active') continue;
        const postsRes = await api.schedules.getPosts(schedule.id);
        postsRes.forEach((p: Post, idx: number) => {
          const phase = idx === 0 ? 'Hook' : idx === postsRes.length - 1 ? 'Conversion' : 'Narrative';
          const mappedPost = { id: p.id, scheduleId: schedule.id, type: p.imageUrl ? 'photo' : 'link', time: schedule.time, caption: p.content, imageUrl: p.imageUrl, topic: p.topic, phase, orderIndex: p.orderIndex ?? idx };
          collectedPosts.push(mappedPost);
          if (idx < 7) week[idx].posts.push(mappedPost);
        });
      }
      setCalendarData(week); setAllPosts(collectedPosts);
    } catch (error) { console.error("Data Sync Failure", error); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchPlannerData(); }, [fetchPlannerData]);

  const filteredMapPosts = useMemo(() => 
    allPosts.filter(p => p.scheduleId === selectedCampaignForMap).sort((a, b) => a.orderIndex - b.orderIndex), 
  [allPosts, selectedCampaignForMap]);

  const handleUpdateStrategicPost = useCallback(async (data: any) => {
    if (!editingPost) return;
    try {
      await api.posts.update(editingPost.id, { content: data.content, imageUrl: data.media.length > 0 ? JSON.stringify(data.media) : null });
      setEditingPost(null); fetchPlannerData();
    } catch (err) { alert("Deployment Failed"); }
  }, [editingPost, api, fetchPlannerData]);

  const handleTabChange = useCallback((tab: string) => {
    startTransition(() => { setActiveTab(tab); });
  }, []);

  const handleDraftCampaign = useCallback(async () => {
    if (!campaignName || !topic || !selectedFanpage) { alert("Insufficient logic for AI Factory"); return; }
    
    // [LOGIC] Determine iteration count
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const iterationCount = useDayProgression ? totalDays : 5;
    const phases = ['Hook', 'Context', 'Value', 'Proof', 'Conversion'];

    if (iterationCount <= 0) { alert("Invalid duration"); return; }

    setIsDrafting(true); setDraftProgress(5);
    try {
      const page = fanpages.find(p => p.pageId === selectedFanpage);
      const scheduleData = await api.schedules.create({
        topic: `${campaignName}: ${topic}`,
        fanpageId: selectedFanpage,
        fanpageName: page?.name || 'Hub Page',
        accessToken: page?.accessToken || '',
        time: postTime,
        runCount: iterationCount,
        advancedPrompt: `Strategy: ${mainIdea}\nAudience: ${targetAudience}\nContext: ${additionalInfo}\nMode: ${useDayProgression ? 'Daily Series' : 'Marketing Phases'}`
      });

      if (!scheduleData.schedule) throw new Error("Factory allocation failure");
      setDraftProgress(15);
      
      for (let i = 0; i < iterationCount; i++) {
         const progress = Math.round(15 + (i / iterationCount) * 80);
         setDraftProgress(progress);

         let prompt = '';
         if (useDayProgression) {
            prompt = `
               Task: Write a social media post for a series.
               Campaign: "${campaignName}" (${totalDays} days).
               Current Progress: Day ${i + 1} of ${totalDays}.
               Topic: ${topic}. Strategy: ${mainIdea}. Audience: ${targetAudience}. Vietnamese.
               Requirement: Start with "Ngàu ${i + 1}: ..." or clear series mention.
            `;
         } else {
            prompt = `
               Task: Write a strategic marketing post (Phase: ${phases[i]}).
               Campaign: "${campaignName}".
               Topic: ${topic}. Strategy: ${mainIdea}. Audience: ${targetAudience}. Vietnamese.
               Requirement: Focus on ${phases[i]} intent.
            `;
         }

         const textData = await api.ai.generateText(prompt);
         const imgData = await api.ai.generateImage(`Branding photography for ${topic}, ${useDayProgression ? `Day ${i + 1}` : phases[i]} context.`);
         const finalImageUrl = imgData.imageUrl ? JSON.stringify([{ type: 'image', data: imgData.imageUrl, id: `${Date.now()}-${i}` }]) : null;
         
         await api.fetch('/api/posts/queue', {
           method: 'POST',
           body: JSON.stringify({ 
             topic: `${campaignName}: ${topic}`, 
             content: textData.text, 
             imageUrl: finalImageUrl, 
             fanpageId: selectedFanpage, 
             scheduleId: scheduleData.schedule.id, 
             status: 'queued', 
             orderIndex: i, 
             phase: useDayProgression ? (i === 0 ? 'Start' : i === iterationCount - 1 ? 'End' : 'Series') : phases[i]
           })
         });
      }

      setDraftProgress(100); setTimeout(() => { setIsDrafting(false); setDraftProgress(0); fetchPlannerData(); }, 1000);
    } catch (err) { alert("Factory Error"); setIsDrafting(false); }
  }, [campaignName, topic, selectedFanpage, postTime, mainIdea, targetAudience, additionalInfo, fanpages, api, fetchPlannerData, startDate, endDate]);

  if (loading) return (
    <div className="flex items-center justify-center p-20">
       <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex bg-slate-900 rounded-[32px] border border-slate-800 shadow-3xl overflow-hidden h-[calc(100vh-10rem)] w-full max-w-full relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-emerald-500/[0.03] pointer-events-none"></div>

      {/* CAMPAIGN CONSOLE SIDEBAR */}
      <aside className="w-[420px] bg-slate-900/50 border-r border-slate-800 p-8 lg:p-10 flex flex-col gap-8 relative overflow-y-auto custom-scrollbar z-10">
        <div className="flex items-center gap-4">
           <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl shadow-emerald-500/10"><Roadmap size={22} /></div>
           <div>
              <h2 className="text-lg font-bold text-slate-50 uppercase tracking-tight">Campaign Console</h2>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">Factory Control Center</p>
           </div>
        </div>

        <div className="space-y-8">
           {/* Primary Inputs */}
           <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 ml-1 flex items-center gap-2"><Target size={12}/> Global Targeting</label>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-5 text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
                {fanpages.map(p => <option key={p.id} value={p.pageId}>{p.name}</option>)}
              </select>
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-5 text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600" placeholder="Campaign Alias" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              
              <div className="space-y-1.5 flex-1 w-full">
                 <select 
                   className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-5 text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer" 
                   value={topic} 
                   onChange={e => setTopic(e.target.value)}
                 >
                   {topics.length > 0 ? (
                      topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                   ) : (
                      <option disabled>No topics available</option>
                   )}
                 </select>
                 <div className="flex items-center gap-2 px-1">
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest leading-none">Reference Strategic Topic</span>
                    <Sparkles size={8} className="text-emerald-500" />
                 </div>
              </div>
           </div>

           {/* Strategic Core */}
           <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 ml-1 flex items-center gap-2"><Shield size={12}/> Narrative Logic</label>
              <textarea className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all resize-none min-h-[100px] placeholder:text-slate-600" placeholder="Central Idea / Hook Strategy..." value={mainIdea} onChange={e => setMainIdea(e.target.value)} />
              <input type="text" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 px-5 text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600" placeholder="Target Audience (e.g. Gen Z Professionals)" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              <textarea className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-[10px] font-bold text-slate-400 outline-none focus:border-emerald-500/50 transition-all resize-none h-24 placeholder:text-slate-600" placeholder="Additional Context / Brand Guidelines..." value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} />
           </div>

           {/* Dimensional Logic */}
           <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 ml-1 flex items-center gap-2"><Clock size={12}/> Chronology Settings</label>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <span className="text-[8px] font-black text-slate-600 uppercase ml-2">Phase Start</span>
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <span className="text-[8px] font-black text-slate-600 uppercase ml-2">Phase End</span>
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
              </div>
               <div className="space-y-2">
                  <span className="text-[8px] font-black text-slate-600 uppercase ml-2">Node Synchronization Time</span>
                  <input type="time" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[10px] font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={postTime} onChange={e => setPostTime(e.target.value)} />
               </div>

               {/* Mode Selection */}
               <div className="pt-4 border-t border-slate-800/50">
                  <button 
                    onClick={() => setUseDayProgression(!useDayProgression)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-emerald-500/30 transition-all group"
                  >
                     <div className="flex flex-col items-start gap-1">
                        <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{useDayProgression ? 'Daily Series Mode' : 'Strategic Phase Mode'}</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Day 1 to X Progression</span>
                     </div>
                     <div className={`w-10 h-5 rounded-full transition-all relative ${useDayProgression ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useDayProgression ? 'left-6' : 'left-1'}`}></div>
                     </div>
                  </button>
               </div>
            </div>
         </div>

        <div className="mt-auto pt-8">
           {isDrafting ? (
             <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[9px] font-black uppercase text-emerald-500">AI Factory Active...</span>
                   <span className="text-[9px] font-black text-slate-400">{draftProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${draftProgress}%` }}></div></div>
             </div>
           ) : (
             <button onClick={handleDraftCampaign} className="w-full bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 group active:scale-95">
               <Sparkles size={18} className="group-hover:rotate-45 transition-transform" /> Launch AI Campaign Factory
             </button>
           )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-0 flex flex-col bg-slate-950 overflow-hidden relative z-0">
        <header className="h-24 border-b border-slate-900 px-10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              {['planner', 'map', 'grid'].map(t => (
                <button key={t} onClick={() => handleTabChange(t)} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === t ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t === 'map' ? 'Strategy Map' : t}
                </button>
              ))}
          </div>
          <button onClick={() => { setIsSyncing(true); fetchPlannerData().finally(() => setIsSyncing(false)); }} className="p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-lg transition-all active:scale-95 hover:bg-slate-800 text-slate-400 hover:text-white"><RefreshCw size={16} className={isSyncing ? 'animate-spin text-emerald-500' : ''} /></button>
        </header>

        <div className={`flex-1 overflow-hidden relative flex flex-col transition-all duration-300 ${isPending ? 'opacity-40 blur-[2px]' : 'opacity-100'}`}>
          {activeTab === 'map' ? (
             <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
                <div className="pt-10 pb-6 flex flex-col items-center gap-6 px-12">
                   <div className="text-center">
                      <h3 className="text-2xl font-bold text-slate-50 tracking-tight uppercase mb-1">Campaign Journey Explorer</h3>
                      <div className="h-1 w-16 bg-emerald-500 mx-auto rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   </div>
                   <div className="flex items-center gap-4 bg-slate-900 p-2.5 rounded-2xl shadow-2xl border border-slate-800 min-w-[400px]">
                      <div className="bg-emerald-500 text-white p-3 rounded-xl shadow-xl shadow-emerald-500/10"><Filter size={18} /></div>
                      <select className="bg-transparent px-3 text-[10px] font-black uppercase text-slate-200 outline-none appearance-none cursor-pointer flex-1 tracking-widest" value={selectedCampaignForMap} onChange={e => setSelectedCampaignForMap(e.target.value)}>
                         {schedules.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.topic}</option>)}
                      </select>
                   </div>
                </div>
                
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center select-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px]">
                  <div className="flex items-center gap-10 px-24 py-16 min-w-max">
                    {filteredMapPosts.map((post, idx) => (
                      <React.Fragment key={post.id}>
                        <div className="relative group">
                          <div className="w-72 bg-slate-900 rounded-[32px] p-8 shadow-3xl border border-slate-800 transition-all group-hover:border-emerald-500/30 group-hover:-translate-y-6">
                             <div className="flex items-center justify-between mb-6">
                                <div className="bg-emerald-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-xl shadow-emerald-500/10">{idx + 1}</div>
                                <div className="flex items-center gap-2">
                                   <button onClick={() => setEditingPost(post)} className="text-slate-600 hover:text-emerald-500 transition-colors p-1"><Edit3 size={16} /></button>
                                   <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/10">{post.phase || 'Narrative'}</span>
                                </div>
                             </div>
                             <div className="w-full h-40 bg-slate-800 rounded-2xl mb-6 overflow-hidden border border-slate-700 relative">
                                {post.imageUrl ? (
                                  <img src={(() => { try { return JSON.parse(post.imageUrl)[0]?.data || post.imageUrl } catch(e) { return post.imageUrl } })()} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 hover:scale-110" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] font-black uppercase text-slate-700 italic">No Asset Available</div>
                                )}
                             </div>
                             <p className="text-[11px] font-medium text-slate-500 line-clamp-3 leading-relaxed italic group-hover:text-slate-300 transition-colors">"{post.caption}"</p>
                          </div>
                        </div>
                        {idx < filteredMapPosts.length - 1 ? (
                          <div className="flex items-center"><ArrowRight className="text-slate-800" size={40} strokeWidth={3} /></div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="pb-12 pt-6 flex justify-center gap-8 bg-gradient-to-t from-slate-950 to-transparent">
                   {['Awareness', 'Narrative', 'Conversion'].map((l, i) => (
                      <div key={i} className="flex items-center gap-4 bg-slate-900 px-8 py-4 rounded-2xl border border-slate-800 shadow-xl">
                         <div className={`w-2.5 h-2.5 rounded-full ${i === 2 ? 'bg-emerald-500' : i === 1 ? 'bg-indigo-500' : 'bg-blue-600 animate-pulse'}`}></div>
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">{l}</span>
                      </div>
                   ))}
                </div>
             </div>
          ) : activeTab === 'planner' ? (
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-7 min-w-[1400px] min-h-full">
                   {calendarData.map((data, idx) => (
                      <div key={idx} className={`p-8 border-r border-b border-slate-900 flex flex-col gap-6 ${data.isToday ? 'bg-emerald-500/[0.02]' : ''}`}>
                         <div className="flex justify-between items-center mb-4 px-1">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{data.dayLabel}</span>
                            <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black ${data.isToday ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-slate-500 bg-slate-900 shadow-inner'}`}>{data.dateLabel}</span>
                         </div>
                         <div className="space-y-4">
                           {data.posts.map((p: any) => <PostPreviewCard key={p.id} post={p} onEdit={setEditingPost} />)}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-slate-950">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {allPosts.map((p) => <PostPreviewCard key={p.id} post={p} onEdit={setEditingPost} />)}
               </div>
            </div>
          )}
        </div>
      </main>

      {editingPost ? (
        <AICreativeStudio 
           post={editingPost} 
           api={api} 
           onSave={handleUpdateStrategicPost} 
           onClose={() => setEditingPost(null)}
           title="Strategic Node Bridge"
        />
      ) : null}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { 
          width: 4px; 
          height: 4px; 
        } 
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(2, 6, 23, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #1e293b; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #10b981;
        }
      `}</style>
    </div>
  );
};

export default CampaignPlannerView;
