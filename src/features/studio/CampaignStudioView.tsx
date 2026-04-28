import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Sparkles, Workflow, Play, Check, Edit3, Send, RefreshCw, ChevronRight, X, ArrowLeft, Zap, FileText, Image as ImageIcon, Clock, CheckCircle2 } from 'lucide-react';
import { ApiService } from '../../api';
import { useLanguage } from '../../LanguageContext';

type Step = 'config' | 'generate' | 'review';

const NODE_ICONS: Record<string, any> = {
  trigger: Zap, ai_text: FileText, ai_image: ImageIcon,
  human_approval: CheckCircle2, publish: Send, delay: Clock,
};

const NODE_COLORS: Record<string, string> = {
  trigger: 'text-text-primary nm-flat-sm px-3 py-1 bg-soft-blue/10',
  ai_text: 'text-text-primary nm-flat-sm px-3 py-1 bg-soft-cyan/10',
  ai_image: 'text-text-primary nm-flat-sm px-3 py-1 bg-soft-pink/10',
  human_approval: 'text-emerald-500 nm-flat-sm px-3 py-1 bg-emerald-50',
  publish: 'text-indigo-500 nm-flat-sm px-3 py-1 bg-indigo-50',
  delay: 'text-text-muted nm-flat-sm px-3 py-1 bg-white/50',
};

export const CampaignStudioView: React.FC<{ api: ApiService }> = ({ api }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('config');
  const [fanpages, setFanpages] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  // Config state
  const [selectedFanpage, setSelectedFanpage] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [topic, setTopic] = useState('');
  const [mainIdea, setMainIdea] = useState('');
  const [audience, setAudience] = useState('');
  const [postCount, setPostCount] = useState(5);
  const [postTime, setPostTime] = useState('09:00');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genLog, setGenLog] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);

  // Review state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    Promise.all([
      api.fanpages.list().catch(() => []),
      api.workflows.list().catch(() => []),
      api.topics.list().catch(() => []),
    ]).then(([fp, wf, tp]) => {
      setFanpages(fp);
      setWorkflows(wf);
      setTopics(tp);
      if (fp.length > 0) setSelectedFanpage(fp[0].pageId);
      if (tp.length > 0) setTopic(tp[0].name);
    });
  }, [api]);

  const selectedWfData = workflows.find(w => w.id === selectedWorkflow);
  const wfNodes: any[] = selectedWfData ? (() => { try { return JSON.parse(selectedWfData.nodesData || '[]'); } catch { return []; } })() : [];

  const log = (msg: string) => setGenLog(prev => [...prev, msg]);

  const handleGenerate = useCallback(async () => {
    if (!campaignName || !topic || !selectedFanpage) {
      toast.warning('Vui lòng điền đầy đủ thông tin chiến dịch.');
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenLog([]);
    setGeneratedPosts([]);
    const posts: any[] = [];

    try {
      log('🚀 Khởi tạo chiến dịch...');
      const page = fanpages.find(p => p.pageId === selectedFanpage);

      for (let i = 0; i < postCount; i++) {
        const progress = Math.round(10 + (i / postCount) * 80);
        setGenProgress(progress);
        log(`📝 Đang tạo bài viết ${i + 1}/${postCount}...`);

        const prompt = `Viết một bài đăng mạng xã hội tiếng Việt cho chiến dịch "${campaignName}".
Topic: ${topic}. Ý chính: ${mainIdea}. Đối tượng: ${audience}.
Bài ${i + 1}/${postCount}. Hãy viết nội dung hấp dẫn, chuyên nghiệp.`;

        let content = '', imageUrl: string | null = null;

        log(`  ✍️ AI Copywriter đang viết...`);
        const textData = await api.ai.generateText(prompt);
        content = textData.text || '';

        if (!selectedWorkflow || wfNodes.some((n: any) => n.type === 'ai_image')) {
          log(`  🎨 AI Image Studio đang tạo ảnh...`);
          try {
            const imgData = await api.ai.generateImage(`${topic}, professional marketing photo, Day ${i + 1}`);
            imageUrl = imgData.imageUrl ? JSON.stringify([{ type: 'image', data: imgData.imageUrl, id: `${Date.now()}-${i}` }]) : null;
          } catch { /* skip image if fails */ }
        }

        posts.push({
          index: i,
          content,
          imageUrl,
          fanpageId: selectedFanpage,
          fanpageName: page?.name || '',
          time: postTime,
          status: 'pending',
        });
        setGeneratedPosts([...posts]);
      }

      setGenProgress(100);
      log('✅ Hoàn thành! Chuyển sang bước Review...');
      setTimeout(() => { setStep('review'); setGenerating(false); }, 800);
    } catch (err: any) {
      const errorMsg = err.message || 'Có lỗi xảy ra trong quá trình tạo nội dung.';
      log(`❌ LỖI: ${errorMsg}`);
      setGenerating(false);
    }
  }, [campaignName, topic, selectedFanpage, mainIdea, audience, postCount, postTime, fanpages, wfNodes, selectedWorkflow, api]);

  const handlePublishAll = async () => {
    if (!window.confirm(`Xác nhận đăng ${generatedPosts.length} bài lên Facebook?`)) return;
    setPublishing(true);
    const page = fanpages.find(p => p.pageId === selectedFanpage);
    const scheduleRes = await api.schedules.create({
      topic: `${campaignName}: ${topic}`,
      fanpageId: selectedFanpage,
      fanpageName: page?.name || '',
      accessToken: page?.accessToken || '',
      time: postTime,
      runCount: generatedPosts.length,
      advancedPrompt: mainIdea,
    }).catch(() => null);

    const scheduleId = scheduleRes?.schedule?.id;

    for (let i = 0; i < generatedPosts.length; i++) {
      const p = generatedPosts[i];
      try {
        await api.fetch('/api/posts/queue', {
          method: 'POST',
          body: JSON.stringify({
            topic: `${campaignName}: ${topic}`,
            content: p.content,
            imageUrl: p.imageUrl,
            fanpageId: selectedFanpage,
            scheduleId,
            status: 'queued',
            orderIndex: i,
          }),
        });
        setGeneratedPosts(prev => prev.map((post, idx) => idx === i ? { ...post, status: 'queued' } : post));
      } catch { /* continue */ }
    }
    setPublishing(false);
    toast.success('Đã thêm vào hàng chờ đăng bài thành công!');
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <div className="nm-flat p-10 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 nm-flat flex items-center justify-center text-soft-blue">
            <Sparkles size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-primary uppercase tracking-tighter">{t('campaignStudio')}</h2>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mt-2">{t('studioSub')}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="nm-inset p-2 flex items-center gap-2">
          {(['config', 'generate', 'review'] as Step[]).map((s, i) => {
            const isDone = (step === 'generate' && i === 0) || (step === 'review' && i <= 1);
            const isActive = step === s;
            return (
              <React.Fragment key={s}>
                <button
                  onClick={() => !generating && i <= (step === 'review' ? 2 : step === 'generate' ? 1 : 0) && setStep(s)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${isActive ? 'nm-button text-soft-blue' : isDone ? 'text-emerald-500' : 'text-text-muted opacity-50'}
                `}>
                  {isDone ? <span className="flex items-center gap-2"><Check size={14}/>{t(s as any)}</span> : t(s as any)}
                </button>
                {i < 2 && <ChevronRight size={14} className="text-text-muted" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: CONFIG */}
      {step === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Campaign Config */}
          <div className="nm-flat p-10 space-y-8">
            <div className="flex items-center gap-4 mb-2">
               <Edit3 size={18} className="text-soft-blue" />
               <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{t('campaignConfig')}</h3>
            </div>
 
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('fanpageTarget')}</label>
                <select className="nm-input appearance-none" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
                  {fanpages.map(p => <option key={p.id} value={p.pageId}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('campaignName')}</label>
                <input className="nm-input" placeholder="Tên chiến dịch..." value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('strategicTopic')}</label>
                <select className="nm-input appearance-none" value={topic} onChange={e => setTopic(e.target.value)}>
                  {topics.map(t => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
                  {topics.length === 0 && <option value={topic || ''}>{topic || 'No topics'}</option>}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('mainIdea')}</label>
                <textarea className="nm-input min-h-[120px] resize-none" placeholder="Ý chính của chiến dịch, hook strategy..." value={mainIdea} onChange={e => setMainIdea(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('targetAudience')}</label>
                <input className="nm-input" placeholder="Đối tượng mục tiêu..." value={audience} onChange={e => setAudience(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('postCount')}</label>
                  <input type="number" min={1} max={30} className="nm-input" value={postCount} onChange={e => setPostCount(parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-2">{t('postTime')}</label>
                  <input type="time" className="nm-input" value={postTime} onChange={e => setPostTime(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Selection */}
          <div className="nm-flat p-10 space-y-8 flex flex-col">
            <div className="flex items-center gap-4 mb-2">
              <Workflow size={18} className="text-soft-blue" />
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{t('selectWorkflow')}</h3>
            </div>
 
            <div className="space-y-6 flex-1">
              <button
                onClick={() => setSelectedWorkflow('')}
                className={`w-full p-8 text-left transition-all duration-300 rounded-3xl ${!selectedWorkflow ? 'nm-button text-soft-blue' : 'nm-flat-sm opacity-70 hover:opacity-100'}`}
              >
                <div className="text-[11px] font-black uppercase tracking-widest mb-2">Default Strategy</div>
                <div className="text-[9px] text-text-secondary font-bold uppercase tracking-tight">Trigger → AI Text → AI Image → Publish</div>
              </button>

              {workflows.map(wf => {
                const nodes: any[] = (() => { try { return JSON.parse(wf.nodesData || '[]'); } catch { return []; } })();
                const isActive = selectedWorkflow === wf.id;
                return (
                  <button
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf.id)}
                    className={`w-full p-8 text-left transition-all duration-300 rounded-3xl ${isActive ? 'nm-button text-soft-blue' : 'nm-flat-sm opacity-70 hover:opacity-100'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[11px] font-black uppercase tracking-widest">{wf.name}</div>
                      {isActive && <Check size={16} />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {nodes.slice(0, 5).map((n: any, i: number) => {
                        const Icon = NODE_ICONS[n.type] || Zap;
                        return (
                          <React.Fragment key={n.id}>
                            <span className={`flex items-center gap-2 text-[8px] font-black uppercase ${NODE_COLORS[n.type] || 'text-text-muted nm-flat-sm px-2 py-1'}`}>
                              <Icon size={10} />{n.title}
                            </span>
                            {i < nodes.length - 1 && i < 4 && <ChevronRight size={10} className="text-text-muted" />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
 
            <div className="pt-10">
              <button
                onClick={() => setStep('generate')}
                disabled={!campaignName || !selectedFanpage}
                className="w-full bg-soft-blue text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 disabled:opacity-30 transition-all flex items-center justify-center gap-4"
              >
                <Play size={20} fill="currentColor" /> {generating ? t('loading') : t('launchFactory')}
              </button>
              {(!campaignName || !selectedFanpage) && (
                <p className="text-center text-[9px] text-text-muted mt-6 font-bold uppercase tracking-widest opacity-50">{t('completeInfo')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: GENERATE */}
      {step === 'generate' && (
        <div className="nm-flat p-12 space-y-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight">{t('factoryRunning')}</h3>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">{campaignName} · {postCount} units in production</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-soft-blue leading-none">{genProgress}%</div>
              <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-2">Neural Load</div>
            </div>
          </div>

          <div className="nm-inset p-1.5 rounded-full overflow-hidden h-6">
            <div className="h-full bg-soft-blue rounded-full transition-all duration-700 shadow-lg" style={{ width: `${genProgress}%` }} />
          </div>

          <div className="nm-inset p-8 h-64 overflow-y-auto custom-scrollbar font-mono text-soft-blue/80">
            {genLog.map((l, i) => (
              <div key={i} className="text-[11px] mb-2 last:mb-0 border-l-2 border-soft-blue/20 pl-4 py-1">{l}</div>
            ))}
            {!generating && genLog.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <Zap size={32} />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4">Generator Offline</p>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6">
            {generatedPosts.length > 0 && !generating && (
              <button onClick={() => setStep('review')} className="w-full bg-emerald-500 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4">
                <Check size={20} /> Finalize {generatedPosts.length} Results
              </button>
            )}
            
            {!generating && (
              <button onClick={() => setStep('config')} className="w-full text-text-muted hover:text-text-primary text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Adjust Config
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 'review' && (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <button onClick={() => setStep('config')} className="w-14 h-14 nm-button flex items-center justify-center text-text-primary">
                <ArrowLeft size={22} />
              </button>
              <div>
                <h3 className="text-3xl font-black text-text-primary uppercase tracking-tight">{t('reviewPublish')}</h3>
                <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-2">{generatedPosts.length} nodes ready for deployment</p>
              </div>
            </div>
            <button
              onClick={handlePublishAll}
              disabled={publishing}
              className="bg-soft-blue text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-4"
            >
              {publishing ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
              {publishing ? t('loading') : t('queueAll')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {generatedPosts.map((post, idx) => {
              const imgSrc = post.imageUrl ? (() => { try { return JSON.parse(post.imageUrl)[0]?.data; } catch { return null; } })() : null;
              const isEditing = editingIndex === idx;
              const isQueued = post.status === 'queued';
              
              return (
                <div key={idx} className={`nm-flat overflow-hidden transition-all duration-500 flex flex-col ${isQueued ? 'opacity-70 scale-95' : 'hover:scale-[1.02]'}`}>
                  <div className="p-2 h-64">
                    <div className="nm-inset w-full h-full rounded-2xl overflow-hidden relative">
                      {imgSrc ? (
                        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <ImageIcon size={48} />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="nm-flat-sm text-[9px] font-black text-soft-blue uppercase tracking-widest px-4 py-2">Node {idx + 1}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col gap-6">
                    {isEditing ? (
                      <textarea
                        className="nm-input min-h-[160px] resize-none text-sm"
                        value={post.content}
                        onChange={e => setGeneratedPosts(prev => prev.map((p, i) => i === idx ? { ...p, content: e.target.value } : p))}
                      />
                    ) : (
                      <div className="nm-inset p-6 rounded-2xl flex-1">
                        <p className="text-[13px] text-text-secondary font-medium leading-relaxed italic line-clamp-6">"{post.content}"</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      {isQueued ? (
                        <div className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-50 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                          <Check size={16} /> Deployed to Queue
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'nm-button text-soft-blue' : 'nm-flat-sm hover:text-soft-blue'}`}
                          >
                            {isEditing ? <><Check size={16} /> {t('save')}</> : <><Edit3 size={16} /> {t('editContent')}</>}
                          </button>
                          {isEditing && (
                            <button onClick={() => setEditingIndex(null)} className="w-12 h-12 nm-button flex items-center justify-center text-soft-pink">
                              <X size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
