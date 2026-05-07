import React, { useState, useEffect } from 'react';
import { History, X, Info, Sliders, Sparkles, Upload, Clock, Activity, Target, Layers, Video } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { AICreativeStudio } from '../ai-studio/AICreativeStudio';
import { ApiService } from '../../api';
import { Post } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { toast } from 'sonner';
import { VideoConfigModal } from '../ai-studio/VideoConfigModal';
import { VideoPlayerModal } from '../ai-studio/VideoPlayerModal';

export const HistoryView = ({ api }: { api: ApiService }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isPublishingVideo, setIsPublishingVideo] = useState(false);

  // Column Resizing Logic
  const [columnWidths, setColumnWidths] = useState({
    fanpage: 180,
    topic: 160,
    date: 140,
    studio: 100,
    logic: 350,
    status: 140,
    actions: 180
  });

  const [resizing, setResizing] = useState<string | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      setColumnWidths(prev => ({
        ...prev,
        [resizing]: Math.max(80, prev[resizing as keyof typeof prev] + e.movementX)
      }));
    };
    const handleMouseUp = () => setResizing(null);

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await api.posts.list();
        setPosts(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [api]);

  const handleSaveEdit = async (data: { content: string, media: any[] }, shouldPublish: boolean = false) => {
    if (!editingPost) return;
    const tid = toast.loading(shouldPublish ? 'Saving & Deploying...' : 'Saving changes...');
    try {
      const resp = await api.posts.update(editingPost.id, {
        content: data.content,
        imageUrl: data.media.length > 0 ? JSON.stringify(data.media) : null
      });

      if (resp.error) throw new Error(resp.error);

      const updatedPost = { 
        ...editingPost, 
        content: data.content, 
        imageUrl: data.media.length > 0 ? JSON.stringify(data.media) : null 
      };

      setPosts(posts.map(p => p.id === editingPost.id ? updatedPost : p));
      setEditingPost(null);
      
      toast.dismiss(tid);
      
      if (shouldPublish) {
        setActivePost(updatedPost);
        // We need to wait for state update or use a direct call
        setTimeout(() => {
          handlePublishVideo();
        }, 100);
      } else {
        toast.success('Draft updated successfully.');
      }
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(err.message);
    }
  };

  const handleVideoAction = (post: Post) => {
    let cleanUrl = post.imageUrl || '';
    
    // Attempt to parse if it's a JSON string
    if (cleanUrl.startsWith('[') || cleanUrl.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanUrl);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        // Strategy: Find the first item that looks like a video
        const videoItem = items.find(item => {
          const val = item.data || item.url || '';
          return val.includes('/video/') || val.endsWith('.mp4') || val.endsWith('.webm') || val.includes('autoreels_videos');
        });

        if (videoItem) {
          cleanUrl = videoItem.data || videoItem.url;
        } else if (items.length > 0) {
          // Fallback to first item if no video found
          cleanUrl = items[0].data || items[0].url || '';
        }
      } catch (e) {
        console.warn('Failed to parse imageUrl as JSON, using raw string');
      }
    }

    setActivePost({ ...post, imageUrl: cleanUrl });
    
    // Check if it's actually a video link (must contain video keywords or extensions)
    const isVideo = cleanUrl.includes('/video/') || cleanUrl.includes('autoreels_videos') || cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm');
    
    if (isVideo) {
      setShowVideoPlayer(true);
    } else {
      setShowVideoConfig(true);
    }
  };

  const handleGenerateVideo = async (config: any) => {
    if (!activePost) return;
    setShowVideoConfig(false);
    setIsGeneratingVideo(true);
    toast.loading('Initiating neural synthesis...');
    
    try {
      const res = await api.ai.generateVideo(activePost.id, config);
      
      if (res.alreadyExists) {
        toast.dismiss();
        toast.success('Protocol: Existing video recovered from neural archive.');
        setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, imageUrl: res.videoUrl } : p));
        setActivePost({ ...activePost, imageUrl: res.videoUrl });
        setShowVideoPlayer(true);
        return;
      }

      toast.dismiss();
      toast.success('Synthesis Protocol Active: ' + res.videoId);

      // Simple Polling
      const poll = setInterval(async () => {
        try {
          const status = await api.ai.getVideoStatus(res.videoId);
          if (status.status === 'ready' || status.videoUrl) {
            clearInterval(poll);
            toast.success('Synthesis Successful!');
            // Update local post state
            setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, imageUrl: status.videoUrl } : p));
            setActivePost({ ...activePost, imageUrl: status.videoUrl });
            setShowVideoPlayer(true);
          }
        } catch (e) { console.warn('History poll fail', e); }
      }, 5000);
      setTimeout(() => clearInterval(poll), 300000);

    } catch (err: any) {
      toast.dismiss();
      toast.error('Synthesis Failed: ' + err.message);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handlePublishVideo = async () => {
    if (!activePost?.imageUrl || !activePost.fanpageId) return;
    setIsPublishingVideo(true);
    toast.loading('Deploying to Facebook...');
    try {
      await api.ai.publishVideo(activePost.fanpageId, activePost.imageUrl, activePost.content);
      toast.dismiss();
      toast.success('Deployed: Video published to Fanpage!');
      setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, fbPostId: 'published', status: 'published' } : p));
      setShowVideoPlayer(false);
    } catch (err: any) {
      toast.dismiss();
      toast.error('Deployment Error: ' + err.message);
    } finally {
      setIsPublishingVideo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 gap-6">
        <Activity className="w-12 h-12 text-soft-blue animate-pulse opacity-40" />
        <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Synching Neural Logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nm-flat border-red-500/20 text-red-400 p-10 rounded-[32px] max-w-2xl mx-auto flex items-center gap-8">
        <div className="w-16 h-16 nm-flat flex items-center justify-center text-red-500 font-black text-xl">!</div>
        <div>
          <div className="font-bold uppercase text-xs tracking-widest mb-1 opacity-60">Neural Network Disruption</div>
          <p className="text-sm font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 sm:space-y-12 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center nm-flat p-10 rounded-[48px] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-soft-blue/5 blur-[120px] -mr-48 -mt-48"></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 nm-flat flex items-center justify-center text-soft-blue">
            <History className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-primary tracking-tight">{t('activityFeed')}</h2>
            <p className="text-xs font-semibold text-text-muted mt-2 opacity-60">System Synchrone Monitor</p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="nm-inset px-8 py-4 rounded-3xl flex items-center gap-4">
            <Layers size={18} className="text-soft-blue" />
            <span className="text-xs text-text-primary font-bold uppercase tracking-widest">Active Nodes: {posts.length}</span>
          </div>
        </div>
      </div>

      <div className="nm-flat rounded-[48px] p-2 overflow-hidden flex-1 flex flex-col min-h-0">
        {posts.length === 0 ? (
          <div className="p-32 text-center nm-inset m-4 rounded-[48px] flex-1">
            <History className="w-20 h-20 mx-auto mb-10 text-text-muted/20" />
            <p className="text-sm font-bold text-text-muted uppercase tracking-widest">{t('noData')}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-auto custom-scrollbar m-4 nm-inset rounded-[32px] flex-1">
              <table className="w-full text-left border-collapse table-fixed relative">
                <thead className="sticky top-0 z-20 bg-app-bg shadow-sm">
                  <tr className="text-text-muted text-xs font-bold uppercase tracking-widest border-b border-text-muted/5">
                    {[
                      { id: 'fanpage', label: t('fanpages'), icon: <Target size={14} className="text-soft-blue"/> },
                      { id: 'topic', label: t('topicsKeywords'), icon: null },
                      { id: 'date', label: t('lastSync'), icon: <Clock size={14} className="text-soft-blue"/> },
                      { id: 'studio', label: t('creativeStudio'), icon: null },
                      { id: 'logic', label: 'Instructional Logic', icon: null },
                      { id: 'status', label: t('statusActive'), icon: null },
                      { id: 'actions', label: t('quickActions'), icon: null, alignRight: true }
                    ].map((col) => (
                      <th 
                        key={col.id} 
                        style={{ width: columnWidths[col.id as keyof typeof columnWidths] }}
                        className={`px-6 py-8 relative group/header ${col.alignRight ? 'text-right' : ''}`}
                      >
                        <div className={`flex items-center gap-3 ${col.alignRight ? 'justify-end' : ''}`}>
                          {col.icon} {col.label}
                        </div>
                        <div 
                          onMouseDown={() => setResizing(col.id)}
                          className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-soft-blue/30 transition-colors z-20 ${resizing === col.id ? 'bg-soft-blue/50' : ''}`}
                        ></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="group hover:bg-soft-blue/5 transition-all duration-500 border-b border-text-muted/5 last:border-0">
                      <td className="px-6 py-6 truncate">
                         <div className="text-sm font-bold text-text-primary truncate">{post.fanpageName || 'Neural Hub'}</div>
                         <div className="text-[10px] font-semibold text-text-muted mt-1">NODE {post.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="nm-flat px-3 py-1 rounded-lg text-xs font-bold text-soft-blue tracking-wide bg-white/20">
                          {post.topic}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <div className="text-sm font-bold text-text-primary font-mono">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-text-muted font-semibold mt-1">
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {(() => {
                          let parsed: any[] = [];
                          if (post.imageUrl) {
                            try {
                              parsed = JSON.parse(post.imageUrl);
                              if (!Array.isArray(parsed)) parsed = [{ data: post.imageUrl }];
                            } catch (e) {
                              parsed = [{ data: post.imageUrl }];
                            }
                          }
                          return (
                            <div className="w-12 h-12 nm-inset p-1.5 rounded-xl overflow-hidden relative group-hover:scale-110 transition-transform duration-700">
                              {parsed.length > 0 ? (
                                 <img src={parsed[0].data} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-[8px] font-black uppercase text-text-muted/20 italic">No Node</div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-6 text-sm text-text-secondary font-medium italic opacity-80" title={post.content}>
                        <div className="truncate">"{post.content || 'Empty automated generation'}"</div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="nm-flat px-4 py-2 rounded-xl flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shadow-lg ${post.status === 'published' ? 'bg-emerald-500 shadow-emerald-500/50' : post.status === 'failed' ? 'bg-soft-pink shadow-soft-pink/50' : 'bg-soft-blue animate-pulse shadow-soft-blue/50'}`}></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{post.status}</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleVideoAction(post)}
                            className="nm-button p-2.5 rounded-xl text-soft-blue hover:scale-110 transition-all active:scale-95"
                            title={post.imageUrl?.includes('cloudinary') ? "View/Publish Video" : "Generate AI Video"}
                          >
                            <Video size={18} className={isGeneratingVideo && activePost?.id === post.id ? 'animate-bounce' : ''} />
                          </button>
                          {post.status === 'queued' ? (
                            <button
                              onClick={() => setEditingPost(post)}
                              className="nm-button px-5 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-soft-blue transition-all active:scale-95"
                            >
                              {t('creativeStudio')}
                            </button>
                          ) : (
                            <div className="nm-inset px-5 py-2.5 rounded-xl text-[10px] uppercase font-bold text-text-muted/30 tracking-widest inline-block">
                              LOCKED
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden overflow-y-auto custom-scrollbar p-4 space-y-6 flex-1">
               {posts.map((post) => (
                 <div key={post.id} className="nm-flat p-6 rounded-[32px] space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-4">
                          {(() => {
                             let parsed: any[] = [];
                             if (post.imageUrl) {
                               try { parsed = JSON.parse(post.imageUrl); if (!Array.isArray(parsed)) parsed = [{ data: post.imageUrl }]; } 
                               catch (e) { parsed = [{ data: post.imageUrl }]; }
                             }
                             return (
                               <div className="w-14 h-14 nm-inset p-1 rounded-xl overflow-hidden flex-shrink-0">
                                  {parsed.length > 0 ? <img src={parsed[0].data} className="w-full h-full object-cover rounded-lg" /> : <div className="w-full h-full bg-text-muted/5" />}
                               </div>
                             );
                          })()}
                          <div>
                             <h4 className="text-sm font-black text-text-primary truncate max-w-[150px]">{post.fanpageName || 'Neural Hub'}</h4>
                             <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{new Date(post.createdAt).toLocaleDateString()} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                       </div>
                       <div className={`w-3 h-3 rounded-full shadow-lg ${post.status === 'published' ? 'bg-emerald-500 shadow-emerald-500/50' : post.status === 'failed' ? 'bg-soft-pink shadow-soft-pink/50' : 'bg-soft-blue animate-pulse shadow-soft-blue/50'}`}></div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                       <span className="nm-inset px-3 py-1 rounded-lg text-[9px] font-black text-soft-blue uppercase tracking-widest">{post.topic}</span>
                       <span className="nm-inset px-3 py-1 rounded-lg text-[9px] font-black text-text-muted uppercase tracking-widest">Protocol {post.status}</span>
                    </div>

                    <p className="text-xs text-text-secondary font-medium leading-relaxed italic border-l-2 border-soft-blue/20 pl-4 py-1">
                       "{post.content?.substring(0, 100)}{post.content?.length > 100 ? '...' : ''}"
                    </p>

                    <div className="pt-2 border-t border-text-muted/5 flex justify-between items-center">
                       <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-40">Node ID: {post.id.substring(0, 8)}</span>
                       <div className="flex gap-2">
                          <button
                            onClick={() => handleVideoAction(post)}
                            className="nm-button p-2.5 rounded-xl text-soft-blue"
                          >
                            <Video size={16} />
                          </button>
                         {post.status === 'queued' && (
                           <button 
                             onClick={() => setEditingPost(post)}
                             className="nm-button px-5 py-2 text-[10px] font-black uppercase text-soft-blue tracking-widest"
                           >
                              {t('creativeStudio')}
                           </button>
                         )}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
      {editingPost && (
        <AICreativeStudio 
          post={editingPost} 
          api={api} 
          onSave={handleSaveEdit} 
          onClose={() => setEditingPost(null)} 
          title="History Override Protocol"
        />
      )}

      {showVideoConfig && (
        <VideoConfigModal 
          api={api} 
          onConfirm={handleGenerateVideo} 
          onClose={() => setShowVideoConfig(false)} 
        />
      )}

      {showVideoPlayer && activePost?.imageUrl && (
        <VideoPlayerModal 
          url={activePost.imageUrl}
          onClose={() => setShowVideoPlayer(false)}
          onPublish={handlePublishVideo}
          isPublishing={isPublishingVideo}
          isPublished={!!activePost.fbPostId}
        />
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};
