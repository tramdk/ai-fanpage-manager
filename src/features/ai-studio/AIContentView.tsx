import React, { useState, useEffect, useCallback, memo } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Sliders, 
  Sparkles, 
  Upload, 
  X, 
  Bot, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  RefreshCw, 
  Target, 
  Video,
  ChevronRight,
  Sparkle
} from 'lucide-react';
import { Fanpage, Topic } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';
import { AutomationConfig } from '../automation/AutomationSettings';
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
  const [autoGenerateMarketingImage, setAutoGenerateMarketingImage] = useState(false);

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isGeneratingMarketingImage, setIsGeneratingMarketingImage] = useState(false);

  useEffect(() => {
    if (mediaItems.length > 0 && !selectedMediaId) {
      setSelectedMediaId(mediaItems[0].id);
    }
  }, [mediaItems, selectedMediaId]);

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
        setNewTopicName('');
        setNewTopicKeywords('');
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
  }, [selectedTopic, topics, handleGenerateText, handleGenerateImage, t]);

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
        const originalId = Date.now().toString();
        const initialMedia = [{
          type: 'image',
          data: productImage,
          id: originalId,
          isAiGenerated: false
        }];
        setMediaItems(initialMedia);
        setSelectedMediaId(originalId);

        if (autoGenerateMarketingImage) {
          toast.loading(isVi ? 'Đang tự động thiết kế hình ảnh marketing...' : 'Auto-designing marketing image...', { id: tid });
          try {
            const mktData = await api.ai.generateMarketingImage({
              imageUrl: productImage,
              postContent: data.text
            });
            if (mktData.imageUrl) {
              const mktId = (Date.now() + 1).toString();
              setMediaItems([
                ...initialMedia,
                {
                  type: 'image',
                  data: mktData.imageUrl,
                  id: mktId,
                  isAiGenerated: true
                }
              ]);
              setSelectedMediaId(mktId);
              toast.success(isVi ? 'Tạo nội dung & Thiết kế ảnh Marketing thành công!' : 'Product ad & marketing image generated successfully!', { id: tid });
            } else {
              toast.success(isVi ? 'Tạo quảng cáo thành công (Không tạo được ảnh Marketing).' : 'Product ad generated successfully (failed to design marketing image).', { id: tid });
            }
          } catch (mktErr) {
            console.warn('Auto marketing image failed:', mktErr);
            toast.success(isVi ? 'Tạo quảng cáo thành công (Lỗi thiết kế ảnh Marketing).' : 'Product ad generated successfully (error designing marketing image).', { id: tid });
          }
        } else {
          toast.success(isVi ? 'Tạo nội dung quảng cáo thành công!' : 'Product ad content generated successfully!', { id: tid });
        }
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
  }, [productImage, productName, productTone, productTargetAudience, productInstructions, productPostType, api, isVi, autoGenerateMarketingImage]);

  const handleGenerateMarketingImage = useCallback(async () => {
    const selectedItem = mediaItems.find(item => item.id === selectedMediaId);
    if (!selectedItem) {
      toast.error(isVi ? 'Vui lòng chọn một hình ảnh trước!' : 'Please select an image first!');
      return;
    }
    if (!generatedContent.trim()) {
      toast.error(isVi ? 'Vui lòng tạo nội dung bài viết trước!' : 'Please generate post content first!');
      return;
    }

    setIsGeneratingMarketingImage(true);
    const tid = toast.loading(isVi ? 'Đang thiết kế hình ảnh marketing...' : 'Designing marketing image...');
    try {
      const data = await api.ai.generateMarketingImage({
        imageUrl: selectedItem.data,
        postContent: generatedContent
      });

      if (data.imageUrl) {
        const newId = Date.now().toString();
        setMediaItems(prev => [
          ...prev,
          {
            type: 'image',
            data: data.imageUrl,
            id: newId,
            isAiGenerated: true
          }
        ]);
        setSelectedMediaId(newId);
        toast.success(isVi ? 'Đã tạo ảnh Marketing thành công!' : 'Marketing image generated successfully!', { id: tid });
      } else {
        throw new Error(isVi ? 'Không nhận được đường dẫn ảnh từ server.' : 'Empty image URL returned from server.');
      }
    } catch (err: any) {
      toast.error((isVi ? 'Lỗi tạo ảnh: ' : 'Error generating image: ') + (err.message || 'Lỗi không xác định'), { id: tid });
    } finally {
      setIsGeneratingMarketingImage(false);
    }
  }, [selectedMediaId, mediaItems, generatedContent, api, isVi]);

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
  }, [generatedContent, selectedTopic, topics, selectedFanpage, mediaItems, api, fanpages, videoResult]);

  const handlePublishVideo = async (targetFanpageId?: string) => {
    const fId = targetFanpageId || selectedFanpage;
    if (!videoResult?.url || !fId) {
      toast.error('Synthesis Data Missing: Ensure fanpage is selected and video is ready.');
      return;
    }
    setIsPublishingVideo(true);
    toast.loading('Deploying neural video to Facebook...');
    try {
      await api.ai.publishVideo(fId, videoResult.url, generatedContent);
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
    <div className="space-y-12 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#09090b] dark:text-zinc-100">
      
      {/* ASYMMETRIC HEADER HERO */}
      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-950 dark:to-zinc-900/50 p-8 sm:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)]">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full -ml-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-[65ch]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Sparkle size={12} className="animate-pulse" />
              <span>AI Content Engine v2.0</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-zinc-900 dark:text-zinc-50">
              {isVi ? 'Phòng Lab Sáng Tạo AI' : 'AI Creative Studio'}
            </h1>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {isVi 
                ? 'Tự động hóa hoàn toàn quy trình tạo nội dung truyền thông xã hội. Từ nghiên cứu chủ đề, thiết kế hình ảnh marketing chuyên nghiệp, đến sản xuất video AI và tự động đăng tải.' 
                : 'Automate your entire social media marketing workflow. Generate persuasive copy, design stunning marketing visual assets, synthesize neural videos, and publish directly to Facebook.'}
            </p>
          </div>

          {/* Premium Sliding Tab Switcher */}
          <div className="self-start lg:self-center bg-zinc-200/60 dark:bg-zinc-800/40 p-1.5 rounded-[1.25rem] border border-zinc-300/40 dark:border-zinc-700/30 flex gap-2">
            <button
              onClick={() => setActiveTab('topic')}
              className={`px-6 py-3 rounded-[1rem] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'topic' 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-md scale-[1.02]' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-300/30 dark:hover:bg-zinc-800/20'
              }`}
            >
              {isVi ? 'Tạo theo chủ đề' : 'Topic-Based'}
            </button>
            <button
              onClick={() => setActiveTab('product')}
              className={`px-6 py-3 rounded-[1rem] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'product' 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-md scale-[1.02]' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-300/30 dark:hover:bg-zinc-800/20'
              }`}
            >
              {isVi ? 'Quảng cáo Sản phẩm' : 'Product Ads'}
            </button>
          </div>
        </div>
      </div>

      {/* INPUT PANEL BENTO */}
      <div className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 p-8 sm:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
        
        {activeTab === 'topic' ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Target size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{isVi ? 'Chiến dịch Chủ đề' : 'Topic Campaign'}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{isVi ? 'Tạo nội dung xoay quanh các chủ đề định sẵn' : 'Build multi-angle content on defined topics'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddingTopic(prev => !prev)} 
                className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 active:scale-[0.98] transition-all"
              >
                <Plus size={14} className="text-blue-500" />
                <span>{isVi ? 'Thêm Chủ đề' : 'Add Topic'}</span>
              </button>
            </div>

            {isAddingTopic && (
              <div className="p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl animate-in zoom-in-95 duration-300 space-y-6">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{isVi ? 'Tạo chủ đề tiếp thị mới' : 'Create New Marketing Topic'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{isVi ? 'Tên chủ đề' : 'Topic Name'}</label>
                    <Input
                      type="text"
                      placeholder="e.g. Dịch Vụ Cưới Hỏi Cao Cấp"
                      className="h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                      value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{isVi ? 'Từ khóa bổ trợ (cách nhau bằng dấu phẩy)' : 'Keywords (Comma separated)'}</label>
                    <Input
                      type="text"
                      placeholder="e.g. tráp rồng phượng, ăn hỏi, sang trọng"
                      className="h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                      value={newTopicKeywords}
                      onChange={e => setNewTopicKeywords(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-2">
                  <Button variant="ghost" onClick={() => setIsAddingTopic(false)} className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent h-auto py-3">
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleAddTopic} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl h-auto active:scale-[0.98] transition-all">
                    {t('saveChanges')}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Target size={12} className="text-blue-500" />
                  {t('topicsKeywords')}
                </label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition-all justify-between">
                    <SelectValue placeholder={`-- ${t('selectProtocol')} --`} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                    {topics.map(t => (
                      <SelectItem key={t.id} value={t.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                  <Sliders size={12} className="text-blue-500" />
                  {isVi ? 'Cấu hình tự động hóa' : 'Automation Layer'}
                </label>
                <button 
                  onClick={() => setShowAdvanced(prev => !prev)} 
                  className={`w-full h-12 border rounded-xl px-5 flex items-center justify-between font-bold text-xs uppercase tracking-wider transition-all ${
                    showAdvanced 
                      ? 'text-blue-600 dark:text-blue-400 border-blue-500/40 bg-blue-500/5 shadow-[inset_0_1px_0_rgba(59,130,246,0.1)]' 
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Sparkles size={16} className={showAdvanced ? 'text-blue-500 animate-pulse' : 'text-zinc-400'} /> 
                    {showAdvanced ? t('cancelProtocol') : t('configureAutomation')}
                  </span>
                  {showAdvanced ? <X size={16} /> : <Plus size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showAdvanced && (
                <div className="animate-in slide-in-from-top-4 duration-300 p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block ml-1">{isVi ? 'Tông giọng thương hiệu' : 'Brand Tone'}</label>
                      <Select value={automationConfig.tone} onValueChange={(val) => setAutomationConfig({ ...automationConfig, tone: val })}>
                        <SelectTrigger className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                          <SelectItem value="professional and elegant" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Professional & Elegant</SelectItem>
                          <SelectItem value="fun and energetic" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Fun & Energetic</SelectItem>
                          <SelectItem value="storytelling" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Storytelling</SelectItem>
                          <SelectItem value="direct and promotional" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Direct & Promotional</SelectItem>
                          <SelectItem value="urgent and compelling" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Urgent & Compelling</SelectItem>
                          <SelectItem value="empathetic" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">Empathetic / Sâu lắng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block ml-1">{isVi ? 'Từ khóa chủ lực bổ sung' : 'Core Keywords to Inject'}</label>
                      <Input 
                        type="text"
                        placeholder="e.g. sale, premium, summer..."
                        className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" 
                        value={automationConfig.keywords} 
                        onChange={e => setAutomationConfig({ ...automationConfig, keywords: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block ml-1">{isVi ? 'Yêu cầu phụ đặc biệt' : 'Special Tactical Instructions'}</label>
                    <Textarea 
                      className="w-full min-h-[120px] p-5 font-medium text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" 
                      rows={3}
                      placeholder="e.g. Viết thêm Call To Action ngắn gọn, kêu gọi mọi người nhắn tin nhận ưu đãi đặc biệt..."
                      value={automationConfig.instructions} 
                      onChange={e => setAutomationConfig({ ...automationConfig, instructions: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>

            <div className="flex justify-center pt-4">
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating || !selectedTopic} 
                className="relative inline-flex items-center gap-4 border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-xs tracking-[0.2em] rounded-xl px-12 py-5 shadow-lg active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none group"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin text-blue-500' : 'group-hover:rotate-12 transition-transform text-indigo-500'}`} />
                <span>{isGenerating ? t('loading') : t('generate')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{isVi ? 'Chiến dịch Quảng cáo Sản phẩm (Multimodal)' : 'Multimodal Product Campaign'}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{isVi ? 'Phân tích hình ảnh sản phẩm để viết quảng cáo và thiết kế ảnh Marketing chuyên nghiệp' : 'Analyze visual assets to craft highly targeted copy and new marketing designs'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Product Visual Area - Left 5 cols */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <ImageIcon size={12} className="text-blue-500" />
                    {isVi ? 'Hình ảnh sản phẩm' : 'Product Image'}
                  </label>
                  
                  <div 
                    onClick={() => setShowProductMediaLibrary(true)}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-center items-center cursor-pointer group"
                  >
                    {productImage ? (
                      <>
                        <img src={productImage} className="w-full h-full object-cover" alt="Product source" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <span className="border border-white/30 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 transition-all">{isVi ? 'Đổi ảnh' : 'Change image'}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductImage('');
                          }}
                          className="absolute top-4 right-4 w-9 h-9 border border-red-500/30 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors p-6">
                        <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                          <Upload size={22} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">{isVi ? 'Tải lên hoặc chọn ảnh' : 'Upload or Choose Image'}</span>
                        <p className="text-[10px] text-zinc-500/60 font-semibold uppercase">{isVi ? 'Hỗ trợ PNG, JPG, WEBP' : 'Supports PNG, JPG, WEBP'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <Bot size={12} className="text-blue-500" />
                    {isVi ? 'Tên sản phẩm / Thương hiệu' : 'Product name / Brand'}
                  </label>
                  <Input 
                    type="text" 
                    placeholder={isVi ? 'e.g. Giày Chạy Bộ Nike Air Max v2' : 'e.g. Nike Air Max Runner v2'} 
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Marketing Options - Right 7 cols */}
              <div className="lg:col-span-7 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                      <FileText size={12} className="text-blue-500" />
                      {isVi ? 'Định dạng bài viết' : 'Post Type'}
                    </label>
                    <Select value={productPostType} onValueChange={setProductPostType}>
                      <SelectTrigger className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                        <SelectItem value="facebook_ad" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Bài đăng bán hàng / Ads' : 'Sales Post / Ads'}</SelectItem>
                        <SelectItem value="product_review" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Đánh giá / Review sản phẩm' : 'Product Review / Evaluation'}</SelectItem>
                        <SelectItem value="storytelling" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Kể chuyện / Storytelling' : 'Storytelling'}</SelectItem>
                        <SelectItem value="tiktok_script" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Kịch bản Video ngắn (TikTok/Reels)' : 'Short Video Script'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Sliders size={12} className="text-blue-500" />
                      {isVi ? 'Tông giọng truyền tải' : 'Tone of Voice'}
                    </label>
                    <Select value={productTone} onValueChange={setProductTone}>
                      <SelectTrigger className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                        <SelectItem value="Chuyên nghiệp & Sang trọng" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Chuyên nghiệp & Sang trọng' : 'Professional & Elegant'}</SelectItem>
                        <SelectItem value="Năng động & Hào hứng" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Năng động & Hào hứng' : 'Energetic & Excited'}</SelectItem>
                        <SelectItem value="Thuyết phục & Thúc giục" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Thuyết phục & Thúc giục' : 'Persuasive & Urgent'}</SelectItem>
                        <SelectItem value="Hài hước & Gần gũi" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Hài hước & Gần gũi' : 'Humorous & Relatable'}</SelectItem>
                        <SelectItem value="Tự nhiên & Chia sẻ" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">{isVi ? 'Tự nhiên & Chia sẻ' : 'Natural & Sharing'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <Target size={12} className="text-blue-500" />
                    {isVi ? 'Khách hàng mục tiêu' : 'Target Audience'}
                  </label>
                  <Input 
                    type="text" 
                    placeholder={isVi ? 'e.g. Mẹ bỉm sữa năng động, dân văn phòng trẻ tuổi...' : 'e.g. Marathon runners, young office workers...'} 
                    value={productTargetAudience}
                    onChange={e => setProductTargetAudience(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <Sparkles size={12} className="text-blue-500" />
                    {isVi ? 'Khuyến mãi / Chỉ dẫn đặc biệt' : 'Special Instructions / Promos'}
                  </label>
                  <Textarea 
                    placeholder={isVi ? 'e.g. Nhấn mạnh bảo hành 5 năm, chương trình giảm 20% trong hôm nay...' : 'e.g. Highlight 5 years warranty, 20% off today only...'} 
                    value={productInstructions}
                    onChange={e => setProductInstructions(e.target.value)}
                    rows={3}
                    className="w-full p-4 font-semibold text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3 ml-1">
                  <input
                    type="checkbox"
                    id="autoGenerateMarketingImage"
                    checked={autoGenerateMarketingImage}
                    onChange={(e) => setAutoGenerateMarketingImage(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <label htmlFor="autoGenerateMarketingImage" className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer select-none">
                    {isVi ? 'Tự động thiết kế ảnh Marketing chuyên nghiệp (AI)' : 'Auto-generate professional Marketing Image (AI)'}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button 
                onClick={handleGenerateProductAd} 
                disabled={isGenerating || !productImage} 
                className="relative inline-flex items-center gap-4 border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-xs tracking-[0.2em] rounded-xl px-12 py-5 shadow-lg active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none group animate-in fade-in"
              >
                <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform text-indigo-500'}`} />
                <span>{isGenerating ? (isVi ? 'ĐANG PHÂN TÍCH...' : 'ANALYZING...') : (isVi ? 'TẠO QUẢNG CÁO SẢN PHẨM' : 'GENERATE PRODUCT AD')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-6 flex items-center animate-in shake duration-500">
          <AlertCircle size={20} className="mr-4 flex-shrink-0" /> 
          <span className="font-semibold text-xs uppercase tracking-wider">{error}</span>
        </div>
      )}

      {/* WORKSPACE BENTO GRID */}
      {generatedContent && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">{t('creativeStudio')}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{isVi ? 'Không gian tinh chỉnh nội dung và hình ảnh' : 'Refine generated copy and design templates'}</p>
              </div>
            </div>
            {postStatus.message && (
              <div className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-2 ${
                postStatus.type === 'success' 
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' 
                  : 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400'
              }`}>
                {postStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{postStatus.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* CARD A: The Copywriter Terminal (Left 7 cols) */}
            <div className="lg:col-span-7 rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">DRAFT COPYWRITING PREVIEW</span>
                <button 
                  onClick={handleGenerateText} 
                  disabled={isGeneratingText} 
                  className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:opacity-70 transition-all disabled:opacity-30"
                >
                  <RefreshCw size={12} className={isGeneratingText ? 'animate-spin' : ''} /> 
                  <span>Regenerate</span>
                </button>
              </div>
              
              <div className="relative">
                {/* Subtle visual editor guidelines */}
                <div className="absolute top-4 left-4 flex flex-col items-center gap-2 pointer-events-none select-none text-zinc-500/20 font-mono text-[10px] font-bold">
                  <span>LN 01</span>
                </div>
                <Textarea 
                  value={generatedContent} 
                  onChange={e => setGeneratedContent(e.target.value)} 
                  rows={12} 
                  className="w-full pl-14 pr-6 py-4 font-semibold text-base sm:text-lg leading-relaxed text-zinc-900 dark:text-zinc-50 resize-none custom-scrollbar rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all" 
                />
              </div>
            </div>

            {/* CARD B: Creative Visual Assets Hub (Right 5 cols) */}
            <div className="lg:col-span-5 rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">CREATIVE VISUAL ASSETS</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { const t = topics.find(t => t.id === selectedTopic); if (t) handleGenerateImage(t.name, t.keywords || [], true); }} 
                    disabled={isGeneratingImage} 
                    className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all active:scale-95"
                  >
                    <RefreshCw size={14} className={isGeneratingImage ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowMediaLibrary(true)} 
                    className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl px-4 py-2 flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] tracking-wider hover:text-blue-500 dark:hover:text-blue-400 active:scale-95 transition-all"
                  >
                    <Upload size={12} /> 
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Asymmetric Gallery Panel */}
              <div className="grid grid-cols-2 gap-4">
                {mediaItems.map(item => {
                  const isSelected = selectedMediaId === item.id;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedMediaId(item.id)}
                      className={`relative aspect-square rounded-2xl border p-1.5 overflow-hidden cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'ring-4 ring-blue-500/80 dark:ring-blue-500/60 shadow-lg shadow-blue-500/5 scale-[0.98] border-blue-500/40' 
                          : 'border-zinc-200/60 dark:border-zinc-800/60 hover:border-blue-500/20'
                      }`}
                    >
                      <img src={item.data} className="w-full h-full object-cover rounded-[1rem] hover:scale-105 transition-transform duration-700" alt="Asset preview" />
                      
                      {/* Spring-animated selection checkmark */}
                      {isSelected && (
                        <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md animate-in zoom-in-50 duration-300">
                          <CheckCircle size={14} />
                        </div>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMediaItems(prev => prev.filter(i => i.id !== item.id));
                          if (isSelected) setSelectedMediaId(null);
                        }} 
                        className="absolute top-3 right-3 w-8 h-8 border border-red-500/30 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all hover:bg-red-500/20 active:scale-95"
                      >
                        <X size={14} />
                      </button>
                      {item.isAiGenerated && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[8px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider backdrop-blur-md bg-white/70 dark:bg-black/60 border border-white/20 dark:border-black/20">
                          AI IMAGE
                        </div>
                      )}
                    </div>
                  );
                })}
                {isGeneratingImage && (
                  <div className="aspect-square flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <Loader2 className="animate-spin text-blue-500/55" size={28} />
                  </div>
                )}
                {mediaItems.length === 0 && !isGeneratingImage && (
                  <div className="aspect-square flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 opacity-40">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>

              {/* High-End Styled Marketing Image Generator Button */}
              {mediaItems.length > 0 && (
                <div className="pt-2">
                  <Button
                    onClick={handleGenerateMarketingImage}
                    disabled={isGeneratingMarketingImage || !selectedMediaId || !generatedContent.trim()}
                    className="w-full h-12 border border-blue-500/10 dark:border-blue-500/5 rounded-xl bg-gradient-to-r from-blue-600/5 to-indigo-600/5 hover:from-blue-600/10 hover:to-indigo-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  >
                    {isGeneratingMarketingImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} className="animate-pulse text-indigo-500" />
                    )}
                    <span>
                      {isGeneratingMarketingImage
                        ? (isVi ? 'Đang tạo ảnh Marketing...' : 'Designing Marketing Image...')
                        : (isVi ? 'Thiết kế ảnh Marketing bằng AI' : 'Design Marketing Image with AI')}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Neural Video Synthesis Pipeline Status Card */}
          {videoResult && (
            <div className="rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent p-6 sm:p-8 animate-in slide-in-from-left-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
                    videoResult.status === 'ready' 
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' 
                      : 'border-blue-500/20 bg-blue-500/10 text-blue-500 animate-pulse'
                  }`}>
                    <Video size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {videoResult.status === 'ready' ? 'Neural Video Ready' : 'Synthesizing Neural Video...'}
                    </h4>
                    <p className="font-mono text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase mt-1 tracking-widest">
                      PIPELINE ID: {videoResult.videoId}
                    </p>
                  </div>
                </div>
                {videoResult.url ? (
                  <button 
                    onClick={() => setShowPlayer(true)}
                    className="inline-flex items-center gap-2 border border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-500 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider active:scale-95 transition-all"
                  >
                    <ImageIcon size={14} /> 
                    <span>Preview Video</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase opacity-60">
                    <Loader2 size={14} className="animate-spin text-blue-500" /> 
                    <span>Rendering Frame Sequence...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DEPLOYMENT CONTROL HUB */}
          <div className="rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Select value={selectedFanpage} onValueChange={setSelectedFanpage}>
                <SelectTrigger className="min-w-[280px] w-full sm:w-[280px] flex h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder={`-- ${t('selectProtocol')} --`} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                  {fanpages.filter(p => p.status === 'active').map(p => (
                    <SelectItem key={p.id} value={p.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <button 
                onClick={() => handleGenerateVideo()}
                disabled={isGeneratingVideo || !generatedContent}
                className="inline-flex items-center justify-center gap-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl px-6 py-4 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] tracking-wider active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <Video size={14} className={isGeneratingVideo ? 'animate-bounce text-blue-500' : 'text-zinc-400'} />
                <span>{isGeneratingVideo ? 'Synthesizing...' : 'Generate Video'}</span>
              </button>
            </div>

            <button 
              onClick={handlePost} 
              disabled={isPosting || !selectedFanpage} 
              className="w-full md:w-auto inline-flex items-center justify-center gap-3 border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 rounded-xl px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] shadow-md hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-35 disabled:pointer-events-none group"
            >
              <Send className={`w-4 h-4 ${isPosting ? 'animate-pulse' : 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} />
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
          api={api}
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
