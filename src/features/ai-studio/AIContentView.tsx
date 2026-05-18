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
      <div className="nm-flat rounded-[32px] sm:rounded-[48px] overflow-hidden p-6 sm:p-10 lg:p-16 relative">
        <div className="absolute top-0 left-0 w-80 h-80 bg-soft-blue/5 blur-[120px] -ml-40 -mt-40"></div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-8 relative z-10">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 nm-inset flex items-center justify-center text-soft-blue rounded-xl sm:rounded-[24px]">
              <Bot size={24} sm:size={32} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary tracking-tight uppercase leading-none">{t('aiGeneration')}</h3>
              <p className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-2 sm:mt-3">AI Powered Content Engine</p>
            </div>
          </div>
          {activeTab === 'topic' && (
            <button 
              onClick={() => setIsAddingTopic(prev => !prev)} 
              className="nm-button px-6 py-3 sm:px-8 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-text-primary hover:text-soft-blue self-start sm:self-auto"
            >
              <Plus className="inline-block mr-2" size={14} /> {t('addTopic')}
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 mb-10 relative z-10 gap-6">
          <button
            onClick={() => setActiveTab('topic')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'topic' ? 'text-soft-blue border-soft-blue' : 'text-text-muted border-transparent hover:text-text-primary'}`}
          >
            {isVi ? 'Tạo theo chủ đề' : 'Topic-Based'}
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'product' ? 'text-soft-blue border-soft-blue' : 'text-text-muted border-transparent hover:text-text-primary'}`}
          >
            {isVi ? 'Tạo quảng cáo sản phẩm (Multimodal)' : 'Product Visual Ads'}
          </button>
        </div>

        {activeTab === 'topic' ? (
          <>
            {isAddingTopic && (
              <div className="mb-12 p-10 nm-inset rounded-[40px] animate-in zoom-in-95 duration-300">
                <div className="space-y-6">
                  <input type="text" placeholder="Topic Name" className="nm-input font-bold" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} />
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Target size={12} className="text-soft-blue" />
                    {t('topicsKeywords')}
                  </label>
                  <div className="relative group">
                    <select 
                      className="nm-input font-bold appearance-none cursor-pointer pr-12 text-text-primary" 
                      value={selectedTopic} 
                      onChange={e => setSelectedTopic(e.target.value)}
                    >
                      <option value="">-- {t('selectProtocol')} --</option>
                      {topics.map(t => <option key={t.id} value={t.id} className="bg-app-bg text-text-primary">{t.name}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-soft-blue transition-colors">
                      <Sliders size={16} />
                    </div>
                  </div>
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
                  className="nm-button px-16 py-6 bg-gradient-to-r from-soft-blue/10 to-indigo-600/10 border-soft-blue/20 text-soft-blue font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-6 disabled:opacity-30 group hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all"
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <ImageIcon size={12} className="text-soft-blue" />
                    {isVi ? 'HÌNH ẢNH SẢN PHẨM' : 'PRODUCT IMAGE'}
                  </label>
                  <div 
                    onClick={() => setShowProductMediaLibrary(true)}
                    className="relative aspect-[4/3] rounded-[32px] nm-flat overflow-hidden p-3 group cursor-pointer border border-white/5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-center items-center"
                  >
                    {productImage ? (
                      <>
                        <img src={productImage} className="w-full h-full object-cover rounded-[24px]" alt="Product draft" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[32px] backdrop-blur-[2px]">
                          <span className="nm-button px-6 py-3 text-[10px] font-black uppercase text-soft-blue">{isVi ? 'ĐỔI ẢNH' : 'CHANGE IMAGE'}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductImage('');
                          }}
                          className="absolute top-6 right-6 w-10 h-10 nm-button bg-soft-pink/10 flex items-center justify-center text-soft-pink hover:bg-soft-pink/20 transition-all rounded-full"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-text-muted hover:text-soft-blue transition-colors">
                        <div className="w-16 h-16 nm-inset flex items-center justify-center rounded-[20px]">
                          <Upload size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{isVi ? 'TẢI LÊN / CHỌN ẢNH' : 'UPLOAD / CHOOSE IMAGE'}</span>
                        <p className="text-[8px] font-bold text-text-muted/60 uppercase tracking-wider">{isVi ? 'Hỗ trợ PNG, JPG, WEBP' : 'Supports PNG, JPG, WEBP'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Bot size={12} className="text-soft-blue" />
                    {isVi ? 'TÊN SẢN PHẨM / THƯƠNG HIỆU (TÙY CHỌN)' : 'PRODUCT NAME / BRAND (OPTIONAL)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={isVi ? 'Ví dụ: Giày Chạy Bộ Nike Air Max v2' : 'e.g. Nike Air Max Runner v2'} 
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="nm-input font-bold"
                  />
                </div>
              </div>

              {/* Marketing Options */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                      <FileText size={12} className="text-soft-blue" />
                      {isVi ? 'ĐỊNH DẠNG BÀI VIẾT' : 'POST TYPE'}
                    </label>
                    <div className="relative group">
                      <select 
                        className="nm-input font-bold appearance-none cursor-pointer pr-12 text-text-primary" 
                        value={productPostType} 
                        onChange={e => setProductPostType(e.target.value)}
                      >
                        <option value="facebook_ad" className="bg-app-bg text-text-primary">{isVi ? 'Bài đăng Bán hàng / Ads' : 'Facebook Sales Post / Ads'}</option>
                        <option value="product_review" className="bg-app-bg text-text-primary">{isVi ? 'Review / Đánh giá sản phẩm' : 'Product Review / Evaluation'}</option>
                        <option value="storytelling" className="bg-app-bg text-text-primary">{isVi ? 'Storytelling / Kể chuyện' : 'Storytelling / Brand Story'}</option>
                        <option value="tiktok_script" className="bg-app-bg text-text-primary">{isVi ? 'Kịch bản Video ngắn (TikTok/Reels)' : 'Short Video Script (TikTok/Reels)'}</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-soft-blue transition-colors">
                        <Sliders size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                      <Sliders size={12} className="text-soft-blue" />
                      {isVi ? 'TÔNG GIỌNG NỘI DUNG' : 'TONE OF VOICE'}
                    </label>
                    <div className="relative group">
                      <select 
                        className="nm-input font-bold appearance-none cursor-pointer pr-12 text-text-primary" 
                        value={productTone} 
                        onChange={e => setProductTone(e.target.value)}
                      >
                        <option value="Chuyên nghiệp & Sang trọng" className="bg-app-bg text-text-primary">{isVi ? 'Chuyên nghiệp & Sang trọng' : 'Professional & Elegant'}</option>
                        <option value="Năng động & Hào hứng" className="bg-app-bg text-text-primary">{isVi ? 'Năng động & Hào hứng' : 'Energetic & Excited'}</option>
                        <option value="Thuyết phục & Thúc giục" className="bg-app-bg text-text-primary">{isVi ? 'Thuyết phục & Thúc giục' : 'Persuasive & Urgent'}</option>
                        <option value="Hài hước & Gần gũi" className="bg-app-bg text-text-primary">{isVi ? 'Hài hước & Gần gũi' : 'Humorous & Relatable'}</option>
                        <option value="Tự nhiên & Chia sẻ" className="bg-app-bg text-text-primary">{isVi ? 'Tự nhiên & Chia sẻ' : 'Natural & Sharing'}</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-soft-blue transition-colors">
                        <Sliders size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Target size={12} className="text-soft-blue" />
                    {isVi ? 'KHÁCH HÀNG MỤC TIÊU (TÙY CHỌN)' : 'TARGET AUDIENCE (OPTIONAL)'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={isVi ? 'Ví dụ: Dân văn phòng năng động, người chạy bộ chuyên nghiệp' : 'e.g. Active office workers, marathon runners'} 
                    value={productTargetAudience}
                    onChange={e => setProductTargetAudience(e.target.value)}
                    className="nm-input font-bold"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
                    <Sparkles size={12} className="text-soft-blue" />
                    {isVi ? 'YÊU CẦU ĐẶC BIỆT / KHUYẾN MÃI (TÙY CHỌN)' : 'SPECIAL INSTRUCTIONS / PROMOS (OPTIONAL)'}
                  </label>
                  <textarea 
                    placeholder={isVi ? 'Ví dụ: Nhấn mạnh bảo hành 12 tháng, chương trình khuyến mãi mua 1 tặng 1 trong tuần này.' : 'e.g. Highlight 12 months warranty, buy 1 get 1 free promo this week.'} 
                    value={productInstructions}
                    onChange={e => setProductInstructions(e.target.value)}
                    rows={3}
                    className="nm-input w-full p-4 font-bold text-sm resize-none custom-scrollbar"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button 
                onClick={handleGenerateProductAd} 
                disabled={isGenerating || !productImage} 
                className="nm-button px-16 py-6 bg-gradient-to-r from-soft-blue/10 to-indigo-600/10 border-soft-blue/20 text-soft-blue font-black uppercase text-[11px] tracking-[0.3em] flex items-center gap-6 disabled:opacity-30 group hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all"
              >
                <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                <span>{isGenerating ? (isVi ? 'ĐANG TẠO...' : 'GENERATING...') : (isVi ? 'TẠO QUẢNG CÁO SẢN PHẨM' : 'GENERATE PRODUCT AD')}</span>
              </button>
            </div>
          </div>
        )}
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
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Draft Content Preview</label>
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
                  <button 
                    onClick={() => setShowMediaLibrary(true)} 
                    className="nm-button px-6 py-2 flex items-center gap-3 text-text-primary font-black uppercase text-[10px] tracking-widest hover:text-soft-blue"
                  >
                    <Upload size={14} /> <span>Add</span>
                  </button>
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
                        AI Image
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

          {videoResult && (
            <div className="nm-inset p-8 rounded-[32px] border-l border-soft-blue/40 bg-soft-blue/5 animate-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 nm-flat flex items-center justify-center rounded-xl ${videoResult.status === 'ready' ? 'text-emerald-500' : 'text-soft-blue animate-pulse'}`}>
                    <Video size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">
                      {videoResult.status === 'ready' ? 'Video Ready' : 'Processing Video...'}
                    </h4>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">
                      ID: {videoResult.videoId}
                    </p>
                  </div>
                </div>
                {videoResult.url ? (
                  <button 
                    onClick={() => setShowPlayer(true)}
                    className="nm-button px-8 py-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-3"
                  >
                    <ImageIcon size={14} /> Preview Video
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">
                    <Loader2 size={14} className="animate-spin" /> Rendering...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-10">
            <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
              <select 
                className="min-w-[280px] nm-input font-black appearance-none text-text-primary" 
                value={selectedFanpage} 
                onChange={e => setSelectedFanpage(e.target.value)}
              >
                <option value="">-- {t('selectProtocol')} --</option>
                {fanpages.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id} className="bg-app-bg text-text-primary">{p.name}</option>)}
              </select>
              
              <button 
                onClick={() => handleGenerateVideo()}
                disabled={isGeneratingVideo || !generatedContent}
                className="nm-button px-8 py-6 text-soft-blue font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] disabled:opacity-30"
              >
                <Video size={18} className={isGeneratingVideo ? 'animate-bounce' : ''} />
                <span>{isGeneratingVideo ? 'Processing...' : 'Generate Video'}</span>
              </button>
            </div>

            <button 
              onClick={handlePost} 
              disabled={isPosting || !selectedFanpage} 
              className="nm-button px-16 sm:px-20 py-6 text-text-primary font-black uppercase text-sm tracking-[0.3em] flex items-center gap-6 group hover:text-soft-blue"
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
