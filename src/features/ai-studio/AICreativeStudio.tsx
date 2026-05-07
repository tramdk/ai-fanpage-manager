import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { History, X, Info, Sliders, Sparkles, Upload, Clock, Activity, Target, Layers, Video, Image as ImageIcon, Send, Bot, Loader2, Play } from 'lucide-react';
import { ApiService } from '../../api';
import { useLanguage } from '../../LanguageContext';
import { MediaLibraryModal } from '../../components/MediaLibraryModal';
import { VideoConfigModal } from './VideoConfigModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface AICreativeStudioProps {
  post: any;
  api: ApiService;
  onSave: (data: { content: string, media: any[] }, shouldPublish: boolean) => void;
  onClose: () => void;
  title?: string;
}

// [rerender-memo] - Ensure expensive modal doesn't re-render parent state triggers
export const AICreativeStudio: React.FC<AICreativeStudioProps> = memo(({ post, api, onSave, onClose, title = "AI Creative Studio" }) => {
  const [content, setContent] = useState(post.content || post.caption || '');
  const [media, setMedia] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prompt, setPrompt] = useState(post.schedule?.advancedPrompt || '');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [videoResult, setVideoResult] = useState<{ videoId: string, url?: string, status: string } | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);
  const { t } = useLanguage();

  // [js-early-exit] - Populate media once on mount
  useEffect(() => {
    if (!post.imageUrl) {
      setMedia([]);
      return;
    }
    try {
      const parsed = JSON.parse(post.imageUrl);
      const items = Array.isArray(parsed) ? parsed : [{ type: 'image', data: post.imageUrl }];
      // Ensure every item has an ID for React keys
      setMedia(items.map((item: any, idx: number) => ({
        ...item,
        id: item.id || `init_${idx}_${Date.now()}`
      })));
    } catch (e) {
      setMedia([{ type: 'image', data: post.imageUrl, id: `err_${Date.now()}` }]);
    }
  }, [post.imageUrl]);

  // [rerender-functional-setstate] - Stable callback for text generation
  const handleRegenText = useCallback(async () => {
    setIsGenerating(true);
    try {
      let basePrompt = `Write a professional Facebook post content about ${post.topic || 'the product'}. Stage: ${post.phase || 'Strategic Content'}. Language: Vietnamese.`;
      if (prompt) basePrompt += `\nInstructions: ${prompt}`;
      const data = await api.ai.generateText(basePrompt);
      if (data.text) setContent(data.text);
    } catch (err) {
      console.warn("AI Text Regen Failed", err);
    } finally {
      setIsGenerating(false);
    }
  }, [post.topic, post.phase, prompt, api]);

  // [rerender-functional-setstate] - Functional update for media list
  const handleRegenImage = useCallback(async () => {
    setIsGeneratingImage(true);
    try {
      const data = await api.ai.generateImage({ 
        topic: post.topic || 'Product Photography', 
        prompt: prompt 
      });
      if (data.imageUrl) {
        setMedia(prev => [...prev, { type: 'image', data: data.imageUrl, id: `gen_${Math.random().toString(36).substring(7)}` }]);
      }
    } catch (err) {
       const keyword = post.topic?.split(' ')[0] || 'lifestyle';
       const mockUrl = `https://loremflickr.com/800/800/${encodeURIComponent(keyword)}?lock=${Date.now()}`;
       setMedia(prev => [...prev, { type: 'image', data: mockUrl, id: `mock_${Math.random().toString(36).substring(7)}` }]);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [post.topic, prompt, api]);


  const handleRemoveMedia = useCallback((id: string) => {
    setMedia(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleGenerateVideo = useCallback(async (videoConfig?: any) => {
    if (!content.trim()) return;

    if (!videoConfig) {
      setShowVideoConfig(true);
      return;
    }

    setShowVideoConfig(false);
    setIsGeneratingVideo(true);
    const tid = toast.loading('Synthesizing neural video...');
    try {
      const res = await api.ai.generateVideo(post.id, videoConfig);
      if (res.alreadyExists) {
        toast.dismiss();
        toast.success('Using existing video from archive');
        setVideoResult({ videoId: 'existing', url: res.videoUrl, status: 'ready' });
        setShowPlayer(true);
        // Also add to media list if not already there
        setMedia(prev => {
          if (prev.find(i => i.data === res.videoUrl)) return prev;
          return [...prev, { type: 'video', data: res.videoUrl, id: `v_${Date.now()}` }];
        });
        return;
      }

      toast.dismiss();
      toast.success('Synthesis started: ' + res.videoId);
      setVideoResult({ videoId: res.videoId, status: 'processing' });
      
      const poll = setInterval(async () => {
        try {
          const status = await api.ai.getVideoStatus(res.videoId);
          if (status.status === 'ready' || status.videoUrl) {
            clearInterval(poll);
            toast.success('Video synthesized successfully!');
            setVideoResult({ videoId: res.videoId, url: status.videoUrl, status: 'ready' });
            setMedia(prev => [...prev, { type: 'video', data: status.videoUrl, id: `v_${Date.now()}` }]);
            setShowPlayer(true);
          } else if (status.status === 'error') {
            clearInterval(poll);
            toast.error('Synthesis failed on server.');
          }
        } catch (e) { console.warn('Edit Modal Video Poll Failed', e); }
      }, 5000);
      setTimeout(() => clearInterval(poll), 300000);
    } catch (err: any) {
      toast.dismiss();
      toast.error('Video generation failed: ' + err.message);
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [post.id, api, content]);

  const handlePublishVideo = async () => {
    if (!videoResult?.url) return;
    setIsPublishingVideo(true);
    const tid = toast.loading('Publishing video to Fanpage...');
    try {
      // For standalone studio, we need a fanpage context if available, 
      // but if not specified, we can't publish directly easily.
      // However, AICreativeStudio usually has a post context which has a schedule -> fanpage
      const fanpageId = post.schedule?.fanpageId;
      if (!fanpageId) throw new Error('No target fanpage linked to this content.');

      await api.ai.publishVideo(fanpageId, videoResult.url, content);
      toast.success('Video published successfully!', { id: tid });
      setShowPlayer(false);
    } catch (err: any) {
      toast.error('Publish failed: ' + err.message, { id: tid });
    } finally {
      setIsPublishingVideo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-app-bg/80 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-card-bg border border-card-border rounded-[32px] shadow-3xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>

        {/* Header */}
        <div className="px-8 py-6 border-b border-card-border flex justify-between items-center bg-card-bg/50 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/10"><Bot size={24} /></div>
            <div>
               <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight leading-none">{title}</h3>
               <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] mt-2">Strategic Node Engineering</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary transition-all"><X size={24} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-app-bg/50 custom-scrollbar relative z-10">
          <div className="bg-card-bg border border-card-border p-6 rounded-2xl text-text-secondary flex items-start shadow-sm border-l-4 border-l-emerald-500">
            <Info className="w-6 h-6 mr-4 flex-shrink-0 text-emerald-500" />
            <div className="flex-1">
              <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">{t('aiGeneration')}</p>
              <p className="text-xs leading-relaxed font-bold opacity-80 uppercase italic">Refinement mode active. Strategic node synchronization in progress.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end bg-card-bg/50 p-6 rounded-t-2xl border border-card-border shadow-sm">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-text-secondary uppercase tracking-widest block mb-1 ml-1">Context Category</label>
                <div className="text-lg font-bold text-slate-100 uppercase tracking-tight">{post.topic || 'Global Stream'} • {post.phase || 'Strategic Content'}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdvanced(prev => !prev)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center border ${showAdvanced ? 'bg-indigo-500 border-indigo-500 text-white shadow-xl' : 'bg-accent-bg text-text-secondary border-card-border hover:text-text-primary'}`}>
                  <Sliders size={14} className="mr-2" /> {showAdvanced ? t('cancel') : 'Options'}
                </button>
                <button 
                  onClick={handleRegenText} 
                  disabled={isGenerating} 
                  className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 shadow-xl shadow-emerald-500/10 transition-all disabled:opacity-30 active:scale-95"
                >
                  <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} /> {isGenerating ? t('loading') : 'Generate'}
                </button>
              </div>
            </div>

            {showAdvanced ? (
              <div className="p-6 bg-card-bg border-x border-card-border animate-in slide-in-from-top-2 duration-300">
                <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-3 ml-1">Context Injections</label>
                <textarea 
                  className="w-full bg-app-bg border border-card-border rounded-xl p-5 text-xs font-bold text-text-primary outline-none focus:border-emerald-500/50 transition-all shadow-inner resize-none" 
                  rows={3} 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  placeholder="Inject specific rules for AI refinement..." 
                />
              </div>
            ) : null}

            <textarea 
              className="w-full border border-card-border border-t-0 rounded-b-2xl p-8 text-sm font-bold leading-relaxed text-text-primary focus:text-slate-100 outline-none bg-card-bg shadow-inner min-h-[300px] resize-none transition-all" 
              value={content} 
              onChange={e => setContent(e.target.value)} 
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center bg-card-bg border border-card-border p-5 px-8 rounded-2xl">
               <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Visual Assets Pipeline</span>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={handleRegenImage} 
                    disabled={isGeneratingImage} 
                    className="px-4 py-2 bg-accent-bg text-emerald-500 border border-card-border rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30"
                  >
                    <Sparkles size={14} className={`mr-1.5 inline ${isGeneratingImage ? 'animate-spin' : ''}`} /> {isGeneratingImage ? 'Sourcing...' : 'Find matching image'}
                  </button>
                  <button 
                    onClick={() => setShowMediaLibrary(true)} 
                    className="px-4 py-2 bg-slate-100 text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Upload size={14} /> <span>Upload</span>
                  </button>
               </div>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              {media.map(item => (
                <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden bg-accent-bg border border-card-border group hover:border-emerald-500/50 transition-all duration-500">
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                      <Video className="text-soft-blue opacity-40" size={32} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setVideoResult({ videoId: 'preview', url: item.data, status: 'ready' }); setShowPlayer(true); }} className="nm-flat p-3 rounded-full text-soft-blue">
                          <Play size={20} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <img src={item.data} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  )}
                  <button onClick={() => handleRemoveMedia(item.id)} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl"><X size={16} /></button>
                </div>
              ))}
              {isGeneratingImage ? (
                <div className="aspect-square bg-card-bg rounded-2xl animate-pulse flex flex-col items-center justify-center border border-dashed border-card-border">
                   <Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                   <p className="text-[8px] font-bold text-text-secondary uppercase">Searching...</p>
                </div>
              ) : null}
              {media.length === 0 && !isGeneratingImage ? (
                <div className="aspect-square bg-card-bg/50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-card-border text-slate-800">
                   <ImageIcon size={32} className="opacity-20" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-card-border flex justify-end items-center space-x-6 bg-card-bg/50 relative z-10">
            <button onClick={onClose} className="text-[10px] font-black uppercase text-text-secondary hover:text-text-primary tracking-widest transition-colors">Discard changes</button>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !content}
                className="px-6 py-3.5 nm-button text-soft-blue flex items-center gap-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 mr-2"
              >
                <Video size={18} className={isGeneratingVideo ? 'animate-bounce' : ''} />
                <span>{isGeneratingVideo ? 'Synthesizing...' : 'Generate Video'}</span>
              </button>
              
              <button 
                onClick={() => onSave({ content, media }, false)} 
                className="px-6 py-3.5 nm-button text-text-secondary hover:text-text-primary flex items-center gap-3 text-[10px] font-black uppercase tracking-widest"
              >
                Save Changes
              </button>
              <button 
                onClick={() => onSave({ content, media }, true)} 
                className="px-10 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 transition-all transform active:scale-95 flex items-center gap-3"
              >
                <Send size={16} />
                Publish Now
              </button>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {showMediaLibrary && (
          <MediaLibraryModal 
            api={api}
            onClose={() => setShowMediaLibrary(false)}
            onSelect={(url) => {
              setMedia(prev => [...prev, {
                type: url.includes('/video/') || url.endsWith('.mp4') ? 'video' : 'image',
                data: url,
                id: Math.random().toString(36).substring(7)
              }]);
              setShowMediaLibrary(false);
            }}
          />
        )}

        {showVideoConfig && (
          <VideoConfigModal 
            api={api} 
            onConfirm={handleGenerateVideo} 
            onClose={() => setShowVideoConfig(false)} 
          />
        )}

        {showPlayer && videoResult?.url && (
          <VideoPlayerModal 
            url={videoResult.url}
            onClose={() => setShowPlayer(false)}
            onPublish={handlePublishVideo}
            isPublishing={isPublishingVideo}
          />
        )}
      </AnimatePresence>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
    </div>
  );
});

AICreativeStudio.displayName = 'AICreativeStudio';
