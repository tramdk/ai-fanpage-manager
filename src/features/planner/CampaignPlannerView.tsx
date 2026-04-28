import React, { useState, useEffect, useCallback, useMemo, useTransition, memo } from 'react';
import { 
  Plus, RefreshCw, X, FileText, Target as Roadmap,
  ArrowRight, Filter, Edit3, Sparkles, Loader2, Clock, Info, Shield, Target, Calendar, Layout, Map as MapIcon, Zap
} from 'lucide-react';
import { ApiService } from '../../api';
import { Post, Schedule, Fanpage } from '../../types';
import { AICreativeStudio } from '../ai-studio/AICreativeStudio';

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
    <div 
      onClick={() => onEdit(post)}
      className="nm-flat p-5 group cursor-pointer hover:scale-[1.02] transition-all"
    >
      <div className="flex flex-col gap-4">
        <div className="w-full h-32 nm-inset p-2 rounded-2xl overflow-hidden relative">
          <img src={displayImage} alt="Preview" className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-700"/>
          <div className="absolute top-4 right-4 nm-flat px-3 py-1 rounded-lg text-[8px] font-black uppercase text-soft-blue tracking-widest backdrop-blur-md bg-white/40">
            {post.phase || 'NARRATIVE'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 px-1">
             <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest font-mono">
                <Clock size={12} className="text-soft-blue" /> {post.time}
             </div>
             <button onClick={(e) => { e.stopPropagation(); onEdit(post); }} className="w-8 h-8 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue transition-colors">
               <Edit3 size={14} />
             </button>
          </div>
          <p className="text-[11px] leading-relaxed text-text-secondary line-clamp-3 font-bold px-1 italic">
            "{post.caption}"
          </p>
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
  const [useDayProgression, setUseDayProgression] = useState(true);

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
        api.schedules.list().catch(() => []), 
        api.fanpages.list().catch(() => []),
        api.topics.list().catch(() => [])
      ]);
      setSchedules(scheduleList); 
      setFanpages(fanpageList);
      setTopics(topicList);
      
      if (fanpageList.length > 0 && !selectedFanpage) setSelectedFanpage(fanpageList[0].pageId);
      if (scheduleList.length > 0 && !selectedCampaignForMap) setSelectedCampaignForMap(scheduleList[0].id);
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
          const phase = idx === 0 ? 'HOOK' : idx === postsRes.length - 1 ? 'CONVERSION' : 'NARRATIVE';
          const mappedPost = { id: p.id, scheduleId: schedule.id, type: p.imageUrl ? 'photo' : 'link', time: schedule.time, caption: p.content, imageUrl: p.imageUrl, topic: p.topic, phase, orderIndex: p.orderIndex ?? idx };
          collectedPosts.push(mappedPost);
          if (idx < 7) week[idx].posts.push(mappedPost);
        });
      }
      setCalendarData(week); setAllPosts(collectedPosts);
    } catch (error) { console.warn("Data Sync Failure", error); } finally { setLoading(false); }
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
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const iterationCount = useDayProgression ? totalDays : 5;
    const phases = ['HOOK', 'CONTEXT', 'VALUE', 'PROOF', 'CONVERSION'];

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
            prompt = `Write a social media post for a series. Campaign: "${campaignName}" (${totalDays} days). Day ${i + 1} of ${totalDays}. Topic: ${topic}. Strategy: ${mainIdea}. Audience: ${targetAudience}. Vietnamese.`;
         } else {
            prompt = `Write a strategic marketing post. Phase: ${phases[i]}. Campaign: "${campaignName}". Topic: ${topic}. Strategy: ${mainIdea}. Audience: ${targetAudience}. Vietnamese.`;
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
             phase: useDayProgression ? (i === 0 ? 'START' : i === iterationCount - 1 ? 'END' : 'SERIES') : phases[i]
           })
         });
      }

      setDraftProgress(100); setTimeout(() => { setIsDrafting(false); setDraftProgress(0); fetchPlannerData(); }, 1000);
    } catch (err) { alert("Factory Error"); setIsDrafting(false); }
  }, [campaignName, topic, selectedFanpage, postTime, mainIdea, targetAudience, additionalInfo, fanpages, api, fetchPlannerData, startDate, endDate]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-32 gap-6">
       <RefreshCw className="w-12 h-12 text-soft-blue animate-spin opacity-40" />
       <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Synching Neural Strategy...</p>
    </div>
  );

  return (
    <div className="nm-flat flex h-[calc(100vh-12rem)] w-full overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-soft-blue/5 to-soft-pink/5 pointer-events-none"></div>

      {/* CAMPAIGN CONSOLE SIDEBAR */}
      <aside className="w-[450px] nm-flat m-6 mr-0 p-10 flex flex-col gap-10 relative overflow-y-auto custom-scrollbar z-10 rounded-[48px]">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 nm-flat flex items-center justify-center text-soft-blue"><Roadmap size={28} /></div>
           <div>
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Campaign Logic</h2>
              <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.4em] mt-1.5 opacity-60">Factory Intelligence Unit</p>
           </div>
        </div>

        <div className="space-y-10">
           {/* Primary Inputs */}
           <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2"><Target size={14} className="text-soft-blue" /> Deployment Node</label>
                <select className="nm-input font-bold" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
                  {fanpages.map(p => <option key={p.id} value={p.pageId}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Campaign Alias</label>
                <input type="text" className="nm-input font-bold placeholder:text-text-muted/30" placeholder="Brand Launch 2024" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Reference Topic</label>
                 <select className="nm-input font-bold" value={topic} onChange={e => setTopic(e.target.value)}>
                   {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                 </select>
              </div>
           </div>

           {/* Strategic Core */}
           <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2"><Shield size={14} className="text-soft-blue" /> Narrative Logic</label>
                <textarea className="nm-input font-bold resize-none min-h-[120px] pt-4" placeholder="Central Idea / Hook Strategy..." value={mainIdea} onChange={e => setMainIdea(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Target Audience</label>
                <input type="text" className="nm-input font-bold" placeholder="e.g. Gen Z Professionals" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
              </div>
           </div>

           {/* Chronology Settings */}
           <div className="space-y-6">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2"><Clock size={14} className="text-soft-blue" /> Chronology Node</label>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <span className="text-[9px] font-black text-text-muted uppercase ml-4 opacity-50">Start</span>
                    <input type="date" className="nm-input font-bold text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div className="space-y-3">
                    <span className="text-[9px] font-black text-text-muted uppercase ml-4 opacity-50">End</span>
                    <input type="date" className="nm-input font-bold text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
              </div>
               <div className="space-y-3">
                  <span className="text-[9px] font-black text-text-muted uppercase ml-4 opacity-50">Node Sync Time</span>
                  <input type="time" className="nm-input font-bold" value={postTime} onChange={e => setPostTime(e.target.value)} />
               </div>

               <button 
                 onClick={() => setUseDayProgression(!useDayProgression)}
                 className={`w-full flex items-center justify-between p-6 nm-flat rounded-3xl group transition-all ${useDayProgression ? 'nm-inset' : ''}`}
               >
                  <div className="flex flex-col items-start gap-1">
                     <span className={`text-[10px] font-black uppercase tracking-widest ${useDayProgression ? 'text-soft-blue' : 'text-text-primary'}`}>{useDayProgression ? 'Series Mode' : 'Phase Mode'}</span>
                     <span className="text-[8px] text-text-muted font-bold uppercase tracking-tighter">Algorithm Selection</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative ${useDayProgression ? 'bg-soft-blue' : 'nm-inset'}`}>
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${useDayProgression ? 'left-7' : 'left-1'}`}></div>
                  </div>
               </button>
            </div>
         </div>

        <div className="mt-auto pt-10">
           {isDrafting ? (
             <div className="w-full nm-inset rounded-[32px] p-8 animate-pulse">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-black uppercase text-soft-blue tracking-widest">Neural Drafting...</span>
                   <span className="text-[10px] font-black text-soft-blue">{draftProgress}%</span>
                </div>
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full bg-soft-blue transition-all duration-700 shadow-[0_0_15px_rgba(59,130,246,0.4)]" style={{ width: `${draftProgress}%` }}></div>
                </div>
             </div>
           ) : (
             <button onClick={handleDraftCampaign} className="w-full bg-soft-blue text-white font-black uppercase text-xs tracking-widest py-6 rounded-[32px] shadow-2xl hover:brightness-110 transition-all flex items-center justify-center gap-4 group active:scale-95">
               <Zap size={22} className="group-hover:rotate-12 transition-transform" /> LAUNCH AI FACTORY
             </button>
           )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-transparent overflow-hidden relative p-6">
        <header className="h-28 flex items-center justify-between px-10 mb-2">
          <div className="nm-inset p-2 rounded-3xl flex items-center gap-3">
              {[
                { id: 'planner', icon: <Calendar size={14} />, label: 'PLANNER' },
                { id: 'map', icon: <MapIcon size={14} />, label: 'STRATEGY MAP' },
                { id: 'grid', icon: <Layout size={14} />, label: 'GRID' }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => handleTabChange(t.id)} 
                  className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === t.id ? 'nm-flat text-soft-blue' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
          </div>
          <button 
            onClick={() => { setIsSyncing(true); fetchPlannerData().finally(() => setIsSyncing(false)); }} 
            className="w-14 h-14 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue transition-all active:scale-90"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-soft-blue' : ''} />
          </button>
        </header>

        <div className={`flex-1 nm-inset rounded-[48px] overflow-hidden relative m-4 flex flex-col transition-all duration-500 ${isPending ? 'opacity-40 blur-[4px]' : 'opacity-100'}`}>
          {activeTab === 'map' ? (
             <div className="flex flex-col h-full overflow-hidden">
                <div className="pt-12 pb-8 flex flex-col items-center gap-8 px-12">
                   <div className="text-center">
                      <h3 className="text-3xl font-black text-text-primary tracking-tight uppercase mb-2">Neural Journey Explorer</h3>
                      <div className="h-1.5 w-24 bg-soft-blue mx-auto rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                   </div>
                   <div className="nm-flat p-2 rounded-[32px] flex items-center gap-6 min-w-[500px]">
                      <div className="w-12 h-12 nm-flat flex items-center justify-center text-soft-blue"><Filter size={20} /></div>
                      <select className="bg-transparent px-4 text-[11px] font-black uppercase text-text-primary outline-none appearance-none cursor-pointer flex-1 tracking-widest" value={selectedCampaignForMap} onChange={e => setSelectedCampaignForMap(e.target.value)}>
                         {schedules.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.topic}</option>)}
                      </select>
                   </div>
                </div>
                
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center select-none bg-[radial-gradient(rgba(0,0,0,0.05)_1.5px,transparent_1.5px)] [background-size:40px_40px]">
                  <div className="flex items-center gap-12 px-32 py-20 min-w-max">
                    {filteredMapPosts.map((post, idx) => (
                      <React.Fragment key={post.id}>
                        <div className="relative group">
                          <div className="w-80 nm-flat rounded-[40px] p-8 transition-all group-hover:scale-105 group-hover:-translate-y-8">
                             <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 nm-inset flex items-center justify-center font-black text-sm text-soft-blue">{idx + 1}</div>
                                <div className="nm-inset px-4 py-1.5 rounded-xl text-[9px] font-black uppercase text-soft-blue tracking-widest">
                                  {post.phase || 'LOGIC'}
                                </div>
                             </div>
                             <div className="w-full h-44 nm-inset p-2 rounded-3xl mb-6 overflow-hidden relative">
                                {post.imageUrl ? (
                                  <img src={(() => { try { return JSON.parse(post.imageUrl)[0]?.data || post.imageUrl } catch(e) { return post.imageUrl } })()} className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-all duration-700" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase text-text-muted/20 italic">No Node Asset</div>
                                )}
                             </div>
                             <p className="text-xs font-bold text-text-secondary line-clamp-3 leading-relaxed italic px-2">"{post.caption}"</p>
                             <button onClick={() => setEditingPost(post)} className="mt-6 w-full nm-button py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-soft-blue transition-all">
                               Modify Strategic Node
                             </button>
                          </div>
                        </div>
                        {idx < filteredMapPosts.length - 1 ? (
                          <div className="flex items-center"><ArrowRight className="text-text-muted/20" size={48} strokeWidth={4} /></div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="pb-16 pt-8 flex justify-center gap-10">
                   {[
                     { label: 'AWARENESS', color: 'bg-soft-blue' },
                     { label: 'NARRATIVE', color: 'bg-soft-pink' },
                     { label: 'CONVERSION', color: 'bg-emerald-500' }
                   ].map((l, i) => (
                      <div key={i} className="flex items-center gap-4 nm-flat px-8 py-4 rounded-2xl">
                         <div className={`w-3 h-3 rounded-full ${l.color} shadow-lg`}></div>
                         <span className="text-[10px] font-black uppercase text-text-muted tracking-widest italic">{l.label}</span>
                      </div>
                   ))}
                </div>
             </div>
          ) : activeTab === 'planner' ? (
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/40">
                <div className="grid grid-cols-7 min-w-[1500px] min-h-full">
                   {calendarData.map((data, idx) => (
                      <div key={idx} className={`p-8 border-r border-b border-black/5 flex flex-col gap-8 ${data.isToday ? 'bg-soft-blue/[0.03]' : ''}`}>
                         <div className="flex justify-between items-center px-2">
                            <span className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em]">{data.dayLabel}</span>
                            <span className={`w-11 h-11 flex items-center justify-center rounded-2xl text-sm font-black transition-all ${data.isToday ? 'nm-flat text-soft-blue' : 'nm-inset text-text-muted'}`}>{data.dateLabel}</span>
                         </div>
                         <div className="space-y-8">
                           {data.posts.map((p: any) => <PostPreviewCard key={p.id} post={p} onEdit={setEditingPost} />)}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-white/40">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CampaignPlannerView;

