import React, { useState, useEffect, useCallback, memo } from 'react';
import { Plus, Sliders, Sparkles, Upload, X, Bot, FileText, CheckCircle, AlertCircle, Image as ImageIcon, Send, Loader2, RefreshCw } from 'lucide-react';
import { Fanpage, Topic } from '../types';
import { useLanguage } from '../LanguageContext';
import { ApiService } from '../api';
import { AutomationSettings, AutomationConfig } from './AutomationSettings';

// [rerender-memo] - Ensure View component is memoized to avoid re-renders from parent
export const AIContentView = memo(({ fanpages, api }: { fanpages: Fanpage[], api: ApiService }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [mediaItems, setMediaItems] = useState<{ type: 'image' | 'video', data: string, id: string, isAiGenerated?: boolean, file?: File }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState('');

  const [selectedFanpage, setSelectedFanpage] = useState(fanpages.find(p => p.status === 'active')?.id || '');
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState({ type: '', message: '' });
  const { t } = useLanguage();

  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicKeywords, setNewTopicKeywords] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    tone: 'professional and elegant',
    keywords: '',
    instructions: ''
  });

  useEffect(() => {
    api.topics.list()
      .then((data: Topic[]) => {
        setTopics(data);
        if (data.length > 0) setSelectedTopic(data[0].id);
      })
      .catch((err: any) => console.error('Load Topics Failed', err));
  }, [api]);

  useEffect(() => {
    if (!fanpages.find(p => p.id === selectedFanpage)) {
      setSelectedFanpage(fanpages.find(p => p.status === 'active')?.id || '');
    }
  }, [fanpages, selectedFanpage]);

  const handleAddTopic = useCallback(async () => {
    if (!newTopicName) return;
    try {
      const data = await api.topics.create({ name: newTopicName, keywords: newTopicKeywords.split(',').map(s => s.trim()) });
      if (data.id) {
        setTopics(prev => [data, ...prev]);
        setSelectedTopic(data.id);
        setIsAddingTopic(false);
      }
    } catch (err) { console.error('Add Topic Failed', err); }
  }, [newTopicName, newTopicKeywords, api]);

  const handleGenerateImage = useCallback(async (topicName: string, keywords: string[], replaceExistingAi = false) => {
    setIsGeneratingImage(true);
    try {
      let prompt = `Hyper-realistic 4K commercial photography of ${topicName}. Elements: ${keywords.join(', ')}. Cinematic lighting, professional studio setup, 8K UHD quality, high resolution, ultra-detailed. NO TEXT.`;
      if (automationConfig.tone) prompt += ` Overall vibe/style: ${automationConfig.tone}.`;
      if (automationConfig.keywords) prompt += ` Important visual details: ${automationConfig.keywords}.`;

      const data = await api.ai.generateImage(prompt);
      if (data.imageUrl) {
        setMediaItems(prev => {
          const filtered = replaceExistingAi ? prev.filter(item => !item.isAiGenerated) : prev;
          return [...filtered, { type: 'image', data: data.imageUrl, id: Date.now().toString(), isAiGenerated: true }];
        });
      }
    } catch (err) {
      const mockUrl = `https://loremflickr.com/3840/2160/${encodeURIComponent(topicName)}?lock=${Date.now()}`;
      setMediaItems(prev => {
        const filtered = replaceExistingAi ? prev.filter(item => !item.isAiGenerated) : prev;
        return [...filtered, { type: 'image', data: mockUrl, id: Date.now().toString(), isAiGenerated: true }];
      });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [api, automationConfig]);

  const handleGenerateText = useCallback(async () => {
    if (!selectedTopic) return;
    setIsGeneratingText(true);
    try {
      const topic = topics.find(t => t.id === selectedTopic);
      if (!topic) return;
      const page = fanpages.find(p => p.id === selectedFanpage);
      const fanpageName = page ? page.name : 'premium boutique';
      let prompt = `Write an engaging FB post for "${fanpageName}" about "${topic.name}". Tone: ${automationConfig.tone}. Language: Vietnamese. Return ONLY the content.`;
      if (automationConfig.keywords) prompt += ` Additional keywords to include: ${automationConfig.keywords}.`;
      if (automationConfig.instructions) prompt += ` Extra instructions: ${automationConfig.instructions}.`;

      const textData = await api.ai.generateText(prompt);
      if (textData.text) setGeneratedContent(textData.text);
    } catch (err: any) {
      setError(err.message || t('noData'));
    } finally {
      setIsGeneratingText(false);
    }
  }, [selectedTopic, topics, selectedFanpage, fanpages, automationConfig, t, api]);

  const handleGenerate = useCallback(async () => {
    if (!selectedTopic) return;
    setIsGenerating(true);
    setError('');
    setPostStatus({ type: '', message: '' });
    setGeneratedContent('');
    setMediaItems([]);

    try {
      const topic = topics.find(t => t.id === selectedTopic);
      if (!topic) return;

      // [async-parallel] - Run Text and Image generation in parallel for perceived speed
      await Promise.all([
        handleGenerateText(),
        handleGenerateImage(topic.name, topic.keywords || [])
      ]);
    } catch (err: any) {
      setError(err.message || t('noData'));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTopic, topics, handleGenerateText, handleGenerateImage]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaItems(prev => [...prev, {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            data: event.target!.result as string,
            id: Math.random().toString(36).substring(7),
            isAiGenerated: false,
            file
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePost = useCallback(async () => {
    if (!selectedFanpage || !generatedContent.trim()) return;
    const page = fanpages.find(p => p.id === selectedFanpage);
    if (!page || !page.accessToken) return;

    setIsPosting(true);
    setPostStatus({ type: '', message: '' });

    try {
      const hasPhysicalFile = mediaItems.some(m => m.file);
      let payload: any;
      if (hasPhysicalFile) {
        payload = new FormData();
        payload.append('pageId', page.pageId);
        payload.append('message', generatedContent);
        payload.append('accessToken', page.accessToken);
        payload.append('topic', topics.find(t => t.id === selectedTopic)?.name || 'Direct Content');

        let stringMedia = [];
        for (const item of mediaItems) {
          if (item.file) {
            payload.append('mediaFiles', item.file);
          } else {
            stringMedia.push({ type: item.type, data: item.data });
          }
        }
        if (stringMedia.length > 0) {
          payload.append('media', JSON.stringify(stringMedia));
        }
      } else {
        payload = {
          pageId: page.pageId,
          message: generatedContent,
          accessToken: page.accessToken,
          media: mediaItems,
          topic: topics.find(t => t.id === selectedTopic)?.name || 'Direct Content'
        };
      }

      await api.facebook.post(payload);
      setPostStatus({ type: 'success', message: 'Published Successful!' });
    } catch (err: any) {
      setPostStatus({ type: 'error', message: err.message });
    } finally {
      setIsPosting(false);
    }
  }, [selectedFanpage, generatedContent, mediaItems, fanpages, topics, selectedTopic, api]);

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden p-8 lg:p-12 relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -ml-32 -mt-32"></div>

        <div className="flex justify-between items-center mb-10 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="p-4 bg-emerald-500 text-white rounded-[18px] shadow-lg shadow-emerald-500/20"><Bot size={32} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-50 tracking-tight uppercase leading-none">{t('aiGeneration')}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">{t('promptInstructions')}</p>
            </div>
          </div>
          <button onClick={() => setIsAddingTopic(prev => !prev)} className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-700 hover:text-emerald-500 transition-all border border-slate-700">
            <Plus className="inline-block mr-2" size={14} /> {t('addTopic')}
          </button>
        </div>

        {isAddingTopic ? (
          <div className="mb-10 p-8 bg-slate-950/50 border border-slate-800 rounded-[28px] animate-in zoom-in-95 duration-200">
            <div className="space-y-5">
              <input type="text" placeholder="Protocol Alias (Name)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-6 py-3.5 font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
              <input type="text" placeholder="Keywords (Comma separated)" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-6 py-3.5 font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={newTopicKeywords} onChange={e => setNewTopicKeywords(e.target.value)} />
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setIsAddingTopic(false)} className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-300">{t('cancel')}</button>
                <button onClick={handleAddTopic} className="px-8 py-3.5 bg-emerald-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95">{t('saveChanges')}</button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('topicsKeywords')}</label>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-base font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}>
                <option value="">-- {t('selectProtocol')} --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <AutomationSettings
              config={automationConfig}
              onChange={setAutomationConfig}
              show={showAdvanced}
              onToggle={() => setShowAdvanced(prev => !prev)}
            />
          </div>

          <div className="flex justify-center pt-6">
            <button onClick={handleGenerate} disabled={isGenerating || !selectedTopic} className="px-12 py-5 bg-emerald-500 text-white rounded-[24px] font-extrabold uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-5 disabled:opacity-30 active:scale-95 group">
              <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              <span>{isGenerating ? t('loading') : t('aiGeneration')}</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-[24px] flex items-center animate-in shake duration-500">
          <AlertCircle size={24} className="mr-5" /> <span className="font-bold uppercase text-[10px] tracking-widest">{error}</span>
        </div>
      ) : null}

      {generatedContent ? (
        <div className="bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl p-8 lg:p-12 space-y-10 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center bg-slate-950/50 p-6 rounded-[24px] border border-slate-800">
            <h3 className="text-xl font-bold text-slate-50 flex items-center tracking-tight"><FileText className="mr-3 text-emerald-500" /> {t('creativeStudio')}</h3>
            {postStatus.message ? (
              <div className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 ${postStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {postStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{postStatus.message}</span>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contextual Output</label>
                <button onClick={handleGenerateText} disabled={isGeneratingText} className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-30">
                  <RefreshCw size={12} className={isGeneratingText ? 'animate-spin' : ''} /> Regen Text
                </button>
              </div>
              <textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} rows={10} className="w-full p-8 bg-slate-800 border border-slate-700 rounded-[28px] font-medium text-lg lg:text-xl leading-relaxed text-slate-200 outline-none focus:border-emerald-500/50 transition-all resize-none shadow-inner" />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Generated Assets</span>
                <div className="flex gap-2">
                  <button onClick={() => { const t = topics.find(t => t.id === selectedTopic); if (t) handleGenerateImage(t.name, t.keywords || [], true); }} disabled={isGeneratingImage} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-700 border border-slate-700 transition-all disabled:opacity-30 flex items-center gap-2"><RefreshCw size={12} className={isGeneratingImage ? 'animate-spin' : ''} /> Regen</button>
                  <label className="cursor-pointer bg-emerald-500 text-white px-4 py-2 rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-600 transition-all flex items-center gap-2">
                    <Upload size={12} /> <span>Upload</span>
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {mediaItems.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-800 border border-slate-700 shadow-xl group">
                    <img src={item.data} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <button onClick={() => setMediaItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl"><X size={14} /></button>
                    {item.isAiGenerated && <div className="absolute bottom-3 left-3 bg-emerald-500/80 backdrop-blur-md text-[7px] font-bold text-white px-2 py-1 rounded-md uppercase tracking-widest shadow-lg">AI Vision</div>}
                  </div>
                ))}
                {isGeneratingImage ? (
                  <div className="aspect-square flex items-center justify-center bg-slate-800 rounded-[24px] animate-pulse border border-dashed border-slate-700"><Loader2 className="animate-spin text-slate-600" size={24} /></div>
                ) : null}
                {mediaItems.length === 0 && !isGeneratingImage ? (
                  <div className="aspect-square flex flex-col items-center justify-center bg-slate-800/30 border border-dashed border-slate-800 rounded-[24px] text-slate-700">
                    <ImageIcon size={32} className="opacity-20" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800 gap-8">
            <select className="min-w-[280px] bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-[10px] font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all appearance-none" value={selectedFanpage} onChange={e => setSelectedFanpage(e.target.value)}>
              <option value="">-- {t('selectProtocol')} --</option>
              {fanpages.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={handlePost} disabled={isPosting || !selectedFanpage} className="px-16 py-5 bg-slate-50 text-slate-950 rounded-[24px] font-extrabold uppercase text-sm tracking-[0.2em] shadow-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-5 active:scale-95 disabled:opacity-30 group">
              <Send className={`w-6 h-6 ${isPosting ? 'animate-pulse' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
              <span>{isPosting ? t('loading') : t('publish')}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

AIContentView.displayName = 'AIContentView';
