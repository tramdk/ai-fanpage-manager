import React, { useState, useEffect, useCallback, memo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Sliders, Sparkles, Upload, X, Bot, FileText, CheckCircle, AlertCircle, Image as ImageIcon, Send, Loader2, RefreshCw, Target, Video } from 'lucide-react';
import { Fanpage, Topic } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';
import { AutomationSettings, AutomationConfig } from '../automation/AutomationSettings';
import { toast } from 'sonner';
import { VideoConfigModal } from './VideoConfigModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MediaLibraryModal } from '../../components/MediaLibraryModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// [rerender-memo] - Ensure View component is memoized to avoid re-renders from parent
export const AIContentView = memo(({ fanpages, api }: { fanpages: Fanpage[], api: ApiService }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [mediaItems, setMediaItems] = useState<{ type: 'image' | 'video', data: string, id: string, isAiGenerated?: boolean }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [error, setError] = useState('');

  const [selectedFanpage, setSelectedFanpage] = useState(fanpages.find(p => p.status === 'active')?.id || '');
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [videoResult, setVideoResult] = useState<{ videoId: string, url?: string, status: string } | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);
  const [postStatus, setPostStatus] = useState({ type: '', message: '' });
  const { t, language } = useLanguage();
  const isVi = language === 'vi';

  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicKeywords, setNewTopicKeywords] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
    tone: 'professional and elegant',
    keywords: '',
    instructions: ''
  });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // --- Product Advertisement States ---
  const [activeTab, setActiveTab] = useState<'topic' | 'product'>('topic');
  const [productImage, setProductImage] = useState('');
  const [productName, setProductName] = useState('');
  const [productTone, setProductTone] = useState('Chuyên nghiệp & Sang trọng');
  const [productPostType, setProductPostType] = useState('facebook_ad');
  const [productTargetAudience, setProductTargetAudience] = useState('');
  const [productInstructions, setProductInstructions] = useState('');
  const [showProductMediaLibrary, setShowProductMediaLibrary] = useState(false);

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

  const handleGenerateProductAd = useCallback(async () => {
    if (!productImage) {
      toast.error(isVi ? 'Vui lòng chọn hoặc tải lên hình ảnh sản phẩm!' : 'Please choose or upload a product image!');
      return;
    }
    
    setIsGenerating(true);
    setIsGeneratingText(true);
    setError('');
    setPostStatus({ type: '', message: '' });
    setGeneratedContent('');
    setMediaItems([]);

    const tid = toast.loading(isVi ? 'Đang phân tích hình ảnh & tạo nội dung quảng cáo...' : 'Analyzing image & creating product ad content...');
    try {
      const data = await api.ai.generateProductAd({
        imageUrl: productImage,
        productName,
        tone: productTone,
        targetAudience: productTargetAudience,
        instructions: productInstructions,
        postType: productPostType,
        language: isVi ? 'Tiếng Việt' : 'English'
      });

      if (data.text) {
        setGeneratedContent(data.text);
        // Automatically populate visual assets with the product image
        setMediaItems([{
          type: 'image',
          data: productImage,
          id: Date.now().toString(),
          isAiGenerated: false
        }]);
        toast.success(isVi ? 'Tạo nội dung quảng cáo thành công!' : 'Product ad content generated successfully!', { id: tid });
      } else {
        throw new Error(isVi ? 'Không nhận được nội dung phản hồi từ AI.' : 'Empty content response received from AI.');
      }
    } catch (err: any) {
      setError(err.message || (isVi ? 'Lỗi tạo nội dung.' : 'Content generation error.'));
      toast.error((isVi ? 'Tạo quảng cáo thất bại: ' : 'Failed to generate ad: ') + (err.message || 'Lỗi không xác định'), { id: tid });
    } finally {
      setIsGenerating(false);
      setIsGeneratingText(false);
    }
  }, [productImage, productName, productTone, productTargetAudience, productInstructions, productPostType, api, isVi]);


  const handlePost = useCallback(async () => {
    if (!selectedFanpage || !generatedContent.trim()) return;
    const page = fanpages.find(p => p.id === selectedFanpage);
    if (!page || !page.accessToken) return;

    setIsPosting(true);
    setPostStatus({ type: '', message: '' });
    toast.loading('Đang đăng bài lên Facebook...', { id: 'posting-fb' });

    try {
      const payload = {
        pageId: page.pageId,
        message: generatedContent,
        accessToken: page.accessToken,
        media: mediaItems.map(m => ({ type: m.type, data: m.data })),
        topic: topics.find(t => t.id === selectedTopic)?.name || 'Direct Content'
      };

      await api.facebook.post(payload);
      setPostStatus({ type: 'success', message: 'Published Successful!' });
      toast.success('Đăng bài thành công!', { id: 'posting-fb' });
    } catch (err: any) {
      setPostStatus({ type: 'error', message: err.message });
      toast.error('Đăng bài thất bại: ' + err.message, { id: 'posting-fb' });
    } finally {
      setIsPosting(false);
    }
  }, [selectedFanpage, generatedContent, mediaItems, fanpages, topics, selectedTopic, api]);

  const handleGenerateVideo = useCallback(async (videoConfig?: any) => {
    if (!generatedContent.trim()) return;
    
    // Check if video already exists to prevent accidental re-render
    if (videoResult?.url && !videoConfig) {
      const reRender = window.confirm('A neural video has already been synthesized for this content. Do you want to re-configure and render a new version?');
      if (!reRender) {
        setShowPlayer(true);
        return;
      }
    }

    if (!videoConfig) {
      setShowVideoConfig(true);
      return;
    }

    setShowVideoConfig(false);
    setIsGeneratingVideo(true);
    try {
      toast.loading('Saving draft & synthesizing video...');
      
      const topic = topics.find(t => t.id === selectedTopic);
      const page = fanpages.find(p => p.id === selectedFanpage);
      
      const draftPost = await api.posts.queue({
        topic: topic?.name || 'AI Generated',
        content: generatedContent,
        imageUrl: JSON.stringify(mediaItems.map(m => ({ type: m.type, data: m.data }))),
        fanpageId: page?.pageId || undefined,
      });

      if (!draftPost.post?.id) throw new Error('Failed to create draft post');

      const videoResultData = await api.ai.generateVideo(draftPost.post.id, videoConfig);
      
      if (videoResultData.alreadyExists) {
        setVideoResult({ videoId: 'existing', url: videoResultData.videoUrl, status: 'ready' });
        toast.dismiss();
        toast.success('Using existing neural video found for this content.');
        setShowPlayer(true);
        return;
      }

      setVideoResult({ videoId: videoResultData.videoId, status: 'processing', url: undefined });
      toast.dismiss();
      toast.success(`Synthesis Protocol Complete: ${videoResultData.videoId}`);
      
      // Start polling for status
      let failCount = 0;
      const poll = setInterval(async () => {
        try {
          const status = await api.ai.getVideoStatus(videoResultData.videoId);
          console.log('[POLL_STATUS]', status);

          if (status && (status.status === 'ready' || status.status === 'completed' || status.videoUrl)) {
            const videoUrl = status.videoUrl;
            setVideoResult({ videoId: videoResultData.videoId, url: videoUrl, status: 'ready' });
            
            try {
              const currentMedia = mediaItems || [];
              const updatedMedia = [...currentMedia, { type: 'video', data: videoUrl, id: `v_${Date.now()}`, isAiGenerated: true }];
              await api.posts.update(draftPost.post.id, {
                imageUrl: JSON.stringify(updatedMedia)
              });
            } catch (saveErr) {
              console.warn('Auto-save failed:', saveErr);
            }

            clearInterval(poll);
            toast.success('Neural Video Synthesis Successful!');
            setShowPlayer(true); 
          } else if (status && status.status === 'error') {
            clearInterval(poll);
            toast.error('Synthesis Failed: Server-side error during rendering.');
          }
          failCount = 0; // Reset fail count on success
        } catch (e: any) {
          console.warn('Poll attempt failed:', e.message);
          failCount++;
          if (failCount > 10) { // Stop after 10 consecutive failures (approx 50s)
            clearInterval(poll);
            toast.error('Connection Lost: Synthesis monitoring suspended.');
          }
        }
      }, 5000);

      // Timeout poll after 5 mins
      setTimeout(() => clearInterval(poll), 300000);
    } catch (err: any) {
      toast.dismiss();
      toast.error('Synthesis Error: ' + err.message);
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [generatedContent, selectedTopic, topics, selectedFanpage, mediaItems, api, fanpages]);

  const handlePublishVideo = async () => {
    if (!videoResult?.url || !selectedFanpage) {
      toast.error('Synthesis Data Missing: Ensure fanpage is selected and video is ready.');
      return;
    }
    setIsPublishingVideo(true);
    toast.loading('Deploying neural video to Facebook...');
    try {
      await api.ai.publishVideo(selectedFanpage, videoResult.url, generatedContent);
      toast.dismiss();
      toast.success('Protocol Executed: Video published to Fanpage!');
      setShowPlayer(false);
    } catch (err: any) {
      toast.dismiss();
      toast.error('Deployment Failed: ' + err.message);
    } finally {
      setIsPublishingVideo(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 px-4 sm:px-6 lg:px-8">
      
      {/* DISCOVERY HUB */}
      <div className="nm-flat rounded-lg sm:rounded-xl overflow-hidden p-6 sm:p-10 lg:p-16 relative">
        <div className="absolute top-0 left-0 w-80 h-80 bg-[#2563EB]/5 blur-[120px] -ml-40 -mt-40"></div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-8 relative z-10">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-xl sm:rounded-lg">
              <Bot size={24} sm:size={32} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-gray-100  uppercase leading-none">{t('aiGeneration')}</h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em] mt-2 sm:mt-3">AI Powered Content Engine</p>
            </div>
          </div>
          {activeTab === 'topic' && (
            <button 
              onClick={() => setIsAddingTopic(prev => !prev)} 
              className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-6 py-3 sm:px-8 sm:py-4 text-[9px] sm:text-[10px] font-bold uppercase text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400 self-start sm:self-auto"
            >
              <Plus className="inline-block mr-2" size={14} /> {t('addTopic')}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 mb-10 relative z-10 gap-6">
          <button
            onClick={() => setActiveTab('topic')}
            className={`pb-4 text-xs font-bold uppercase transition-all border-b-2 ${activeTab === 'topic' ? 'text-[#2563EB] dark:text-blue-400 border-soft-blue' : 'text-[#6B7280] dark:text-gray-400 border-transparent hover:text-[#111827] dark:text-gray-100'}`}
          >
            {isVi ? 'Tạo theo chủ đề' : 'Topic-Based'}
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`pb-4 text-xs font-bold uppercase transition-all border-b-2 ${activeTab === 'product' ? 'text-[#2563EB] dark:text-blue-400 border-soft-blue' : 'text-[#6B7280] dark:text-gray-400 border-transparent hover:text-[#111827] dark:text-gray-100'}`}
          >
            {isVi ? 'Tạo quảng cáo sản phẩm (Multimodal)' : 'Product Visual Ads'}
          </button>
        </div>

        {activeTab === 'topic' ? (
          <>
            {isAddingTopic && (
              <div className="mb-12 p-10 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-xl animate-in zoom-in-95 duration-300">
                <div className="space-y-6">
                  <Input
                    type="text"
                    placeholder="Topic Name"
                    className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    value={newTopicName}
                    onChange={e => setNewTopicName(e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="Keywords (Comma separated)"
                    className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    value={newTopicKeywords}
                    onChange={e => setNewTopicKeywords(e.target.value)}
                  />
                  <div className="flex justify-end gap-6 pt-4">
                    <Button variant="ghost" onClick={() => setIsAddingTopic(false)} className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:text-gray-100 hover:bg-transparent tracking-normal h-auto py-3">
                      {t('cancel')}
                    </Button>
                    <Button onClick={handleAddTopic} className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-10 py-4 text-[#2563EB] dark:text-blue-400 font-bold uppercase text-[10px] tracking-normal h-auto hover:bg-transparent">
                      {t('saveChanges')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-12 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Target size={12} className="text-[#2563EB] dark:text-blue-400" />
                    {t('topicsKeywords')}
                  </label>
                  <div className="relative group">
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                        <SelectValue placeholder={`-- ${t('selectProtocol')} --`} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                        {topics.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em] ml-4">Automation Layer</label>
                  <button 
                    onClick={() => setShowAdvanced(prev => !prev)} 
                    className={`w-full h-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-8 py-3 flex items-center justify-between font-bold text-[10px] uppercase transition-all bg-slate-200/50 dark:bg-slate-950/40 text-slate-900 dark:text-white ${showAdvanced ? 'text-[#2563EB] dark:text-blue-400 border-[#2563EB] dark:border-blue-400 bg-slate-300/30 dark:bg-slate-900/60' : 'hover:text-[#2563EB] dark:hover:text-blue-400'}`}
                  >
                    <div className="flex items-center gap-4">
                      <Sparkles size={20} className={showAdvanced ? 'text-[#2563EB] dark:text-blue-400 animate-pulse' : 'text-[#6B7280] dark:text-gray-400'} /> 
                      {showAdvanced ? t('cancelProtocol') : t('configureAutomation')}
                    </div>
                    {showAdvanced ? <X size={20} /> : <Plus size={20} />}
                  </button>
                </div>

                {showAdvanced && (
                  <div className="md:col-span-2 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 sm:p-12 space-y-10 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Tone */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Neural Tone / Ngữ điệu</label>
                          <Select value={automationConfig.tone} onValueChange={(val) => setAutomationConfig({ ...automationConfig, tone: val })}>
                            <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                              <SelectItem value="professional and elegant" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Professional & Elegant</SelectItem>
                              <SelectItem value="fun and energetic" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Fun & Energetic</SelectItem>
                              <SelectItem value="storytelling" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Storytelling</SelectItem>
                              <SelectItem value="direct and promotional" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Direct & Promotional</SelectItem>
                              <SelectItem value="urgent and compelling" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Urgent & Compelling</SelectItem>
                              <SelectItem value="empathetic" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">Empathetic / Sâu lắng</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Keywords */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Neural Keywords / Từ khóa</label>
                          <Input 
                            type="text"
                            placeholder="e.g. sale, premium, summer..."
                            className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" 
                            value={automationConfig.keywords} 
                            onChange={e => setAutomationConfig({ ...automationConfig, keywords: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Strategic Instructions / Chỉ dẫn phụ</label>
                        <Textarea 
                          className="w-full min-h-[140px] p-4 font-bold text-sm resize-none custom-scrollbar rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all" 
                          rows={3}
                          placeholder="e.g. Hãy thêm call to action (kêu gọi hành động) ở cuối bài, sử dụng nhiều emoji..."
                          value={automationConfig.instructions} 
                          onChange={e => setAutomationConfig({ ...automationConfig, instructions: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-6">
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !selectedTopic} 
                  className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-16 py-6 bg-gradient-to-r from-soft-blue/10 to-indigo-600/10 border-soft-blue/20 text-[#2563EB] dark:text-blue-400 font-bold uppercase text-[11px] tracking-[0.3em] flex items-center gap-6 disabled:opacity-30 group hover: transition-all"
                >
                  <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                  <span>{isGenerating ? t('loading') : t('generate')}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-10 relative z-10 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Product Visual Area */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <ImageIcon size={12} className="text-[#2563EB] dark:text-blue-400" />
                    {isVi ? 'HÌNH ẢNH SẢN PHẨM' : 'PRODUCT IMAGE'}
                  </label>
                  <div 
                    onClick={() => setShowProductMediaLibrary(true)}
                    className="relative aspect-[4/3] rounded-lg nm-flat overflow-hidden p-3 group cursor-pointer border border-white/5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-center items-center"
                  >
                    {productImage ? (
                      <>
                        <img src={productImage} className="w-full h-full object-cover rounded-lg" alt="Product draft" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-[2px]">
                          <span className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-6 py-3 text-[10px] font-bold uppercase text-[#2563EB] dark:text-blue-400">{isVi ? 'ĐỔI ẢNH' : 'CHANGE IMAGE'}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductImage('');
                          }}
                          className="absolute top-6 right-6 w-10 h-10 border border-[#D1D5DB] dark:border-white/12 rounded-lg bg-soft-pink/10 flex items-center justify-center text-soft-pink hover:bg-soft-pink/20 transition-all rounded-full"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400 transition-colors">
                        <div className="w-16 h-16 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center rounded-[20px]">
                          <Upload size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase">{isVi ? 'TẢI LÊN / CHỌN ẢNH' : 'UPLOAD / CHOOSE IMAGE'}</span>
                        <p className="text-[8px] font-bold text-[#6B7280] dark:text-gray-400/60 uppercase">{isVi ? 'Hỗ trợ PNG, JPG, WEBP' : 'Supports PNG, JPG, WEBP'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Bot size={12} className="text-[#2563EB] dark:text-blue-400" />
                    {isVi ? 'TÊN SẢN PHẨM / THƯƠNG HIỆU (TÙY CHỌN)' : 'PRODUCT NAME / BRAND (OPTIONAL)'}
                  </label>
                  <Input 
                    type="text" 
                    placeholder={isVi ? 'Ví dụ: Giày Chạy Bộ Nike Air Max v2' : 'e.g. Nike Air Max Runner v2'} 
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Marketing Options */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                      <FileText size={12} className="text-[#2563EB] dark:text-blue-400" />
                      {isVi ? 'ĐỊNH DẠNG BÀI VIẾT' : 'POST TYPE'}
                    </label>
                    <Select value={productPostType} onValueChange={setProductPostType}>
                      <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                        <SelectItem value="facebook_ad" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Bài đăng Bán hàng / Ads' : 'Facebook Sales Post / Ads'}</SelectItem>
                        <SelectItem value="product_review" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Review / Đánh giá sản phẩm' : 'Product Review / Evaluation'}</SelectItem>
                        <SelectItem value="storytelling" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Storytelling / Kể chuyện' : 'Storytelling / Brand Story'}</SelectItem>
                        <SelectItem value="tiktok_script" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Kịch bản Video ngắn (TikTok/Reels)' : 'Short Video Script (TikTok/Reels)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                      <Sliders size={12} className="text-[#2563EB] dark:text-blue-400" />
                      {isVi ? 'TÔNG GIỌNG NỘI DUNG' : 'TONE OF VOICE'}
                    </label>
                    <Select value={productTone} onValueChange={setProductTone}>
                      <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                        <SelectItem value="Chuyên nghiệp & Sang trọng" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Chuyên nghiệp & Sang trọng' : 'Professional & Elegant'}</SelectItem>
                        <SelectItem value="Năng động & Hào hứng" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Năng động & Hào hứng' : 'Energetic & Excited'}</SelectItem>
                        <SelectItem value="Thuyết phục & Thúc giục" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Thuyết phục & Thúc giục' : 'Persuasive & Urgent'}</SelectItem>
                        <SelectItem value="Hài hước & Gần gũi" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Hài hước & Gần gũi' : 'Humorous & Relatable'}</SelectItem>
                        <SelectItem value="Tự nhiên & Chia sẻ" className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">{isVi ? 'Tự nhiên & Chia sẻ' : 'Natural & Sharing'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Target size={12} className="text-[#2563EB] dark:text-blue-400" />
                    {isVi ? 'KHÁCH HÀNG MỤC TIÊU (TÙY CHỌN)' : 'TARGET AUDIENCE (OPTIONAL)'}
                  </label>
                  <Input 
                    type="text" 
                    placeholder={isVi ? 'Ví dụ: Dân văn phòng năng động, người chạy bộ chuyên nghiệp' : 'e.g. Active office workers, marathon runners'} 
                    value={productTargetAudience}
                    onChange={e => setProductTargetAudience(e.target.value)}
                    className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Sparkles size={12} className="text-[#2563EB] dark:text-blue-400" />
                    {isVi ? 'YÊU CẦU ĐẶC BIỆT / KHUYẾN MÃI (TÙY CHỌN)' : 'SPECIAL INSTRUCTIONS / PROMOS (OPTIONAL)'}
                  </label>
                  <Textarea 
                    placeholder={isVi ? 'Ví dụ: Nhấn mạnh bảo hành 12 tháng, chương trình khuyến mãi mua 1 tặng 1 trong tuần này.' : 'e.g. Highlight 12 months warranty, buy 1 get 1 free promo this week.'} 
                    value={productInstructions}
                    onChange={e => setProductInstructions(e.target.value)}
                    rows={3}
                    className="w-full p-4 font-bold text-sm resize-none custom-scrollbar rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button 
                onClick={handleGenerateProductAd} 
                disabled={isGenerating || !productImage} 
                className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-16 py-6 bg-gradient-to-r from-soft-blue/10 to-indigo-600/10 border-soft-blue/20 text-[#2563EB] dark:text-blue-400 font-bold uppercase text-[11px] tracking-[0.3em] flex items-center gap-6 disabled:opacity-30 group hover: transition-all"
              >
                <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                <span>{isGenerating ? (isVi ? 'ĐANG TẠO...' : 'GENERATING...') : (isVi ? 'TẠO QUẢNG CÁO SẢN PHẨM' : 'GENERATE PRODUCT AD')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 rounded-lg text-soft-pink flex items-center animate-in shake duration-500">
          <AlertCircle size={24} className="mr-6" /> 
          <span className="font-bold uppercase text-[10px] tracking-normal">{error}</span>
        </div>
      )}

      {generatedContent && (
        <div className="nm-flat rounded-lg sm:rounded-xl p-6 sm:p-10 lg:p-16 space-y-8 sm:space-y-12 animate-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center px-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-xl">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#111827] dark:text-gray-100 ">{t('creativeStudio')}</h3>
            </div>
            {postStatus.message && (
              <div className={`px-6 py-3 rounded-lg bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[10px] font-bold uppercase flex items-center gap-3 ${postStatus.type === 'success' ? 'text-emerald-500' : 'text-soft-pink'}`}>
                {postStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{postStatus.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">Draft Content Preview</label>
                <button onClick={handleGenerateText} disabled={isGeneratingText} className="flex items-center gap-3 text-[10px] font-bold uppercase text-[#2563EB] dark:text-blue-400 hover:opacity-70 transition-all disabled:opacity-30">
                  <RefreshCw size={14} className={isGeneratingText ? 'animate-spin' : ''} /> Regenerate
                </button>
              </div>
              <Textarea 
                value={generatedContent} 
                onChange={e => setGeneratedContent(e.target.value)} 
                rows={10} 
                className="w-full p-6 sm:p-10 font-bold text-base sm:text-lg leading-relaxed text-white resize-none custom-scrollbar rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all" 
              />
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-4 rounded-lg">
                <span className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-4">Creative Assets</span>
                <div className="flex gap-4">
                  <button onClick={() => { const t = topics.find(t => t.id === selectedTopic); if (t) handleGenerateImage(t.name, t.keywords || [], true); }} disabled={isGeneratingImage} className="w-10 h-10 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400 transition-all">
                    <RefreshCw size={16} className={isGeneratingImage ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowMediaLibrary(true)} 
                    className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-6 py-2 flex items-center gap-3 text-[#111827] dark:text-gray-100 font-bold uppercase text-[10px] tracking-normal hover:text-[#2563EB] dark:text-blue-400"
                  >
                    <Upload size={14} /> <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {mediaItems.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-lg nm-flat p-2 group overflow-hidden">
                    <img src={item.data} className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-700" />
                    <button onClick={() => setMediaItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-4 right-4 w-10 h-10 border border-[#D1D5DB] dark:border-white/12 rounded-lg bg-soft-pink/10 flex items-center justify-center text-soft-pink opacity-0 group-hover:opacity-100 transition-all">
                      <X size={18} />
                    </button>
                    {item.isAiGenerated && (
                      <div className="absolute bottom-4 left-4 nm-flat px-3 py-1.5 rounded-xl text-[8px] font-bold text-[#2563EB] dark:text-blue-400 uppercase backdrop-blur-md bg-white/40">
                        AI Image
                      </div>
                    )}
                  </div>
                ))}
                {isGeneratingImage && (
                  <div className="aspect-square flex items-center justify-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-lg">
                    <Loader2 className="animate-spin text-[#2563EB] dark:text-blue-400/30" size={32} />
                  </div>
                )}
                {mediaItems.length === 0 && !isGeneratingImage && (
                  <div className="aspect-square flex flex-col items-center justify-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-lg border-2 border-dashed border-white/10 text-[#6B7280] dark:text-gray-400 opacity-20">
                    <ImageIcon size={48} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {videoResult && (
            <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 rounded-lg border-l border-soft-blue/40 bg-[#2563EB]/5 animate-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 nm-flat flex items-center justify-center rounded-xl ${videoResult.status === 'ready' ? 'text-emerald-500' : 'text-[#2563EB] dark:text-blue-400 animate-pulse'}`}>
                    <Video size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] dark:text-gray-100 ">
                      {videoResult.status === 'ready' ? 'Video Ready' : 'Processing Video...'}
                    </h4>
                    <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase mt-1">
                      ID: {videoResult.videoId}
                    </p>
                  </div>
                </div>
                {videoResult.url ? (
                  <button 
                    onClick={() => setShowPlayer(true)}
                    className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-8 py-3 text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-3"
                  >
                    <ImageIcon size={14} /> Preview Video
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase opacity-40">
                    <Loader2 size={14} className="animate-spin" /> Rendering...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-10">
            <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
              <Select value={selectedFanpage} onValueChange={setSelectedFanpage}>
                <SelectTrigger className="min-w-[280px] w-full sm:w-[280px] flex h-12 rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                  <SelectValue placeholder={`-- ${t('selectProtocol')} --`} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border border-white/10 rounded-lg text-white">
                  {fanpages.filter(p => p.status === 'active').map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-800 focus:bg-slate-800 rounded-xl cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <button 
                onClick={() => handleGenerateVideo()}
                disabled={isGeneratingVideo || !generatedContent}
                className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-8 py-6 text-[#2563EB] dark:text-blue-400 font-bold uppercase text-[11px] tracking-normal flex items-center gap-3 hover: disabled:opacity-30"
              >
                <Video size={18} className={isGeneratingVideo ? 'animate-bounce' : ''} />
                <span>{isGeneratingVideo ? 'Processing...' : 'Generate Video'}</span>
              </button>
            </div>

            <button 
              onClick={handlePost} 
              disabled={isPosting || !selectedFanpage} 
              className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-16 sm:px-20 py-6 text-[#111827] dark:text-gray-100 font-bold uppercase text-sm tracking-[0.3em] flex items-center gap-6 group hover:text-[#2563EB] dark:text-blue-400"
            >
              <Send className={`w-6 h-6 ${isPosting ? 'animate-pulse' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
              <span>{isPosting ? 'Deploying...' : t('publish')}</span>
            </button>
          </div>
        </div>
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
      
      <AnimatePresence>
        {showMediaLibrary && (
          <MediaLibraryModal 
            api={api}
            onClose={() => setShowMediaLibrary(false)}
            onSelect={(url) => {
              setMediaItems(prev => [...prev, {
                type: url.includes('/video/') || url.endsWith('.mp4') ? 'video' : 'image',
                data: url,
                id: Math.random().toString(36).substring(7),
                isAiGenerated: false
              }]);
              setShowMediaLibrary(false);
            }}
          />
        )}

        {showProductMediaLibrary && (
          <MediaLibraryModal 
            api={api}
            onClose={() => setShowProductMediaLibrary(false)}
            onSelect={(url) => {
              setProductImage(url);
              setShowProductMediaLibrary(false);
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
});

AIContentView.displayName = 'AIContentView';
