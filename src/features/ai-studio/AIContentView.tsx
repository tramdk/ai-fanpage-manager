import React, { useState, useEffect, useCallback, memo } from 'react';
import { Plus, Sliders, Sparkles, Upload, X, Bot, FileText, CheckCircle, AlertCircle, Image as ImageIcon, Send, Loader2, RefreshCw } from 'lucide-react';
import { Fanpage, Topic } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';
import { AutomationSettings, AutomationConfig } from '../automation/AutomationSettings';

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
      .catch((err: any) => console.warn('Load Topics Failed', err));
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
    } catch (err) { console.warn('Add Topic Failed', err); }
  }, [newTopicName, newTopicKeywords, api]);

  const handleGenerateImage = useCallback(async (topicName: string, keywords: string[], replaceExistingAi = false) => {
    setIsGeneratingImage(true);
    try {
      const allKeywords = [...keywords];
      if (automationConfig.keywords) {
        allKeywords.push(...automationConfig.keywords.split(',').map(s => s.trim()));
      }
      const data = await api.ai.generateImage({ topic: topicName, keywords: allKeywords });
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
    <div className="space-y-8 sm:space-y-12 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 px-4 sm:px-6 lg:px-8">
      
      {/* DISCOVERY HUB */}
      <div className="nm-flat rounded-[32px] sm:rounded-[48px] overflow-hidden p-6 sm:p-10 lg:p-16 relative">
        <div className="absolute top-0 left-0 w-80 h-80 bg-soft-blue/5 blur-[120px] -ml-40 -mt-40"></div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-8 sm:mb-12 relative z-10">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 nm-inset flex items-center justify-center text-soft-blue rounded-xl sm:rounded-[24px]">
              <Bot size={24} sm:size={32} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight uppercase leading-none">Neural Discover</h3>
              <p className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-2 sm:mt-3">Autonomous Asset Sourcing</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddingTopic(prev => !prev)} 
            className="nm-button px-6 py-3 sm:px-8 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-primary hover:text-soft-blue self-start sm:self-auto"
          >
            <Plus className="inline-block mr-2" size={14} /> {t('addTopic')}
          </button>
        </div>

        {isAddingTopic && (
          <div className="mb-12 p-10 nm-inset rounded-[40px] animate-in zoom-in-95 duration-300">
            <div className="space-y-6">
              <input type="text" placeholder="Protocol Alias (Name)" className="nm-input font-bold" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
              <input type="text" placeholder="Keywords (Comma separated)" className="nm-input font-bold" value={newTopicKeywords} onChange={e => setNewTopicKeywords(e.target.value)} />
              <div className="flex justify-end gap-6 pt-4">
                <button onClick={() => setIsAddingTopic(false)} className="text-[10px] font-black uppercase text-text-muted hover:text-text-primary tracking-widest">{t('cancel')}</button>
                <button onClick={handleAddTopic} className="nm-button px-10 py-4 text-soft-blue font-black uppercase text-[10px] tracking-widest">{t('saveChanges')}</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">{t('topicsKeywords')}</label>
              <select 
                className="nm-input font-black appearance-none" 
                value={selectedTopic} 
                onChange={e => setSelectedTopic(e.target.value)}
              >
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
            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedTopic} 
              className="nm-button px-16 py-6 bg-soft-blue/5 text-soft-blue font-black uppercase text-[11px] tracking-[0.2em] flex items-center gap-6 disabled:opacity-30 group"
            >
              <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              <span>{isGenerating ? t('loading') : 'Discover Protocol'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="nm-inset p-8 rounded-[32px] text-soft-pink flex items-center animate-in shake duration-500">
          <AlertCircle size={24} className="mr-6" /> 
          <span className="font-black uppercase text-[10px] tracking-widest">{error}</span>
        </div>
      )}

      {generatedContent && (
        <div className="nm-flat rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 lg:p-16 space-y-8 sm:space-y-12 animate-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center px-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 nm-inset flex items-center justify-center text-soft-blue rounded-xl">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">{t('creativeStudio')}</h3>
            </div>
            {postStatus.message && (
              <div className={`px-6 py-3 rounded-2xl nm-inset text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${postStatus.type === 'success' ? 'text-emerald-500' : 'text-soft-pink'}`}>
                {postStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{postStatus.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Neural Draft Output</label>
                <button onClick={handleGenerateText} disabled={isGeneratingText} className="flex items-center gap-3 text-[10px] font-black uppercase text-soft-blue hover:opacity-70 transition-all disabled:opacity-30">
                  <RefreshCw size={14} className={isGeneratingText ? 'animate-spin' : ''} /> Regenerate
                </button>
              </div>
              <textarea 
                value={generatedContent} 
                onChange={e => setGeneratedContent(e.target.value)} 
                rows={10} 
                className="nm-inset w-full p-6 sm:p-10 font-bold text-base sm:text-lg leading-relaxed text-text-primary resize-none custom-scrollbar" 
              />
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center nm-inset p-4 rounded-2xl">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4">Creative Assets</span>
                <div className="flex gap-4">
                  <button onClick={() => { const t = topics.find(t => t.id === selectedTopic); if (t) handleGenerateImage(t.name, t.keywords || [], true); }} disabled={isGeneratingImage} className="w-10 h-10 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue transition-all">
                    <RefreshCw size={16} className={isGeneratingImage ? 'animate-spin' : ''} />
                  </button>
                  <label className="nm-button px-6 py-2 flex items-center gap-3 cursor-pointer text-text-primary font-black uppercase text-[10px] tracking-widest hover:text-soft-blue">
                    <Upload size={14} /> <span>Add</span>
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {mediaItems.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-[32px] nm-flat p-2 group overflow-hidden">
                    <img src={item.data} className="w-full h-full object-cover rounded-[24px] group-hover:scale-110 transition-transform duration-700" />
                    <button onClick={() => setMediaItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-4 right-4 w-10 h-10 nm-button bg-soft-pink/10 flex items-center justify-center text-soft-pink opacity-0 group-hover:opacity-100 transition-all">
                      <X size={18} />
                    </button>
                    {item.isAiGenerated && (
                      <div className="absolute bottom-4 left-4 nm-flat px-3 py-1.5 rounded-xl text-[8px] font-black text-soft-blue uppercase tracking-widest backdrop-blur-md bg-white/40">
                        Neural Asset
                      </div>
                    )}
                  </div>
                ))}
                {isGeneratingImage && (
                  <div className="aspect-square flex items-center justify-center nm-inset rounded-[32px]">
                    <Loader2 className="animate-spin text-soft-blue/30" size={32} />
                  </div>
                )}
                {mediaItems.length === 0 && !isGeneratingImage && (
                  <div className="aspect-square flex flex-col items-center justify-center nm-inset rounded-[32px] border-2 border-dashed border-white/10 text-text-muted opacity-20">
                    <ImageIcon size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-10">
            <select 
              className="min-w-[320px] nm-input font-black appearance-none" 
              value={selectedFanpage} 
              onChange={e => setSelectedFanpage(e.target.value)}
            >
              <option value="">-- {t('selectProtocol')} --</option>
              {fanpages.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button 
              onClick={handlePost} 
              disabled={isPosting || !selectedFanpage} 
              className="nm-button px-20 py-6 text-text-primary font-black uppercase text-sm tracking-[0.3em] flex items-center gap-6 group hover:text-soft-blue"
            >
              <Send className={`w-6 h-6 ${isPosting ? 'animate-pulse' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
              <span>{isPosting ? 'Deploying...' : t('publish')}</span>
            </button>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
});

AIContentView.displayName = 'AIContentView';
