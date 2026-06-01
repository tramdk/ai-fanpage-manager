import React, { useState, useEffect } from 'react';
import { History, X, Info, Sliders, Sparkles, Upload, Clock, Activity, Target, Layers, Video, AlertCircle, Loader2, Lock } from 'lucide-react';
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
    topic: 150,
    date: 130,
    studio: 90,
    logic: 360,
    status: 120,
    actions: 140
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
    
    if (cleanUrl.startsWith('[') || cleanUrl.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanUrl);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        const videoItem = items.find(item => {
          const val = item.data || item.url || '';
          return val.includes('/video/') || val.endsWith('.mp4') || val.endsWith('.webm') || val.includes('autoreels_videos');
        });

        if (videoItem) {
          cleanUrl = videoItem.data || videoItem.url;
        } else if (items.length > 0) {
          cleanUrl = items[0].data || items[0].url || '';
        }
      } catch (e) {
        console.warn('Failed to parse imageUrl as JSON, using raw string');
      }
    }

    setActivePost({ ...post, imageUrl: cleanUrl });
    
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
        setActivePost(prev => prev ? { ...prev, imageUrl: res.videoUrl } : null);
        setShowVideoPlayer(true);
        return;
      }

      toast.dismiss();
      toast.success('Synthesis Protocol Active: ' + res.videoId);

      const poll = setInterval(async () => {
        try {
          const status = await api.ai.getVideoStatus(res.videoId);
          if (status.status === 'ready' || status.videoUrl) {
            clearInterval(poll);
            toast.success('Synthesis Successful!');
            setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, imageUrl: status.videoUrl } : p));
            setActivePost(prev => prev ? { ...prev, imageUrl: status.videoUrl } : null);
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

  const handlePublishVideo = async (targetFanpageId?: string) => {
    const fId = targetFanpageId || activePost?.fanpageId;
    if (!activePost?.imageUrl || !fId) {
      toast.error('Please select a target Fanpage first.');
      return;
    }
    setIsPublishingVideo(true);
    toast.loading('Deploying to Facebook...');
    try {
      await api.ai.publishVideo(fId, activePost.imageUrl, activePost.content);
      toast.dismiss();
      toast.success('Deployed: Video published to Fanpage!');
      setPosts(prev => prev.map(p => p.id === activePost.id ? { ...p, fbPostId: 'published', status: 'published', fanpageId: fId } : p));
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
      <div className="flex flex-col items-center justify-center p-32 gap-4 text-zinc-400">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest">Accessing Node Registries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 p-8 max-w-2xl mx-auto flex items-start gap-6">
        <AlertCircle size={24} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-extrabold uppercase text-[10px] tracking-widest mb-1 opacity-70">Neural Network Disruption</div>
          <p className="text-sm font-semibold leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 font-sans antialiased text-[#09090b] dark:text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Asymmetric Activity Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-950 dark:to-zinc-900/50 p-8 sm:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t('activityFeed')}</h2>
              <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-1">System Synchronisation Logs</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            <span>Total Nodes: {posts.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid View Container */}
      <div className="rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center justify-center text-zinc-400/50 gap-4">
            <History size={48} className="opacity-20" />
            <p className="text-xs font-extrabold uppercase tracking-widest">{t('noData')}</p>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            
            {/* Desktop Dynamic Grid Table */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed relative">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-900/80 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20">
                    {[
                      { id: 'fanpage', label: t('fanpages') },
                      { id: 'topic', label: t('topicsKeywords') },
                      { id: 'date', label: t('lastSync') },
                      { id: 'studio', label: 'Media' },
                      { id: 'logic', label: 'Generated Copy / Draft' },
                      { id: 'status', label: t('statusActive') },
                      { id: 'actions', label: t('quickActions'), alignRight: true }
                    ].map((col) => (
                      <th 
                        key={col.id} 
                        style={{ width: columnWidths[col.id as keyof typeof columnWidths] }}
                        className="px-6 py-5 relative group"
                      >
                        <div className={`flex items-center ${col.alignRight ? 'justify-end' : ''}`}>
                          {col.label}
                        </div>
                        <div 
                          onMouseDown={() => setResizing(col.id)}
                          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/40 transition-colors z-20 ${resizing === col.id ? 'bg-blue-500' : ''}`}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {posts.map((post) => (
                    <tr key={post.id} className="group hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 transition-all duration-300">
                      
                      {/* Fanpage Node */}
                      <td className="px-6 py-5 truncate">
                         <div className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">{post.fanpageName || 'Direct Campaign'}</div>
                         <div className="text-[9px] font-mono font-extrabold text-zinc-400 uppercase tracking-wider mt-1">NODE {post.id.substring(0, 8)}</div>
                      </td>

                      {/* Topic */}
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/10 uppercase tracking-wider">
                          {post.topic}
                        </span>
                      </td>

                      {/* Sync Date */}
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-50 font-mono">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-[9px] text-zinc-400 font-semibold mt-1">
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Studio Media Asset */}
                      <td className="px-6 py-5">
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
                          
                          if (parsed.length === 0) {
                            return (
                              <div className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-sm flex items-center justify-center text-[8px] font-bold uppercase text-zinc-300 dark:text-zinc-700 bg-zinc-50 dark:bg-zinc-900 italic">
                                None
                              </div>
                            );
                          }

                          const mediaUrl = parsed[0].data || parsed[0].url || '';
                          const isVideo = mediaUrl.includes('/video/') || mediaUrl.includes('autoreels_videos') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('.mp4?');

                          return (
                            <div 
                              onClick={() => isVideo ? handleVideoAction(post) : undefined}
                              className={`w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-sm group-hover:scale-105 transition-all duration-300 bg-zinc-950 flex items-center justify-center ${isVideo ? 'cursor-pointer hover:border-blue-500/40 active:scale-95' : ''}`}
                              title={isVideo ? "View/Play Video" : undefined}
                            >
                              {isVideo ? (
                                <>
                                  <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                    <Video size={12} className="text-white" />
                                  </div>
                                </>
                              ) : (
                                <img src={mediaUrl} className="w-full h-full object-cover" alt="Node media" />
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Copy Preview */}
                      <td className="px-6 py-5 text-xs text-zinc-500 dark:text-zinc-400 font-medium italic truncate" title={post.content}>
                        "{post.content || 'Empty automated generation'}"
                      </td>

                      {/* Status Node Badge */}
                      <td className="px-6 py-5">
                         <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-wider ${
                           post.status === 'published' 
                             ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                             : post.status === 'failed' 
                               ? 'border-red-500/20 bg-red-500/10 text-red-600' 
                               : 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                         }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              post.status === 'published' ? 'bg-emerald-500 animate-pulse' : post.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-bounce'
                            }`} />
                            <span>{post.status}</span>
                         </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2.5">
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
                            const mediaUrl = parsed.length > 0 ? (parsed[0].data || parsed[0].url || '') : '';
                            const isVideo = mediaUrl.includes('/video/') || mediaUrl.includes('autoreels_videos') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('.mp4?');
                            
                            return !isVideo ? (
                              <button
                                onClick={() => handleVideoAction(post)}
                                className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-blue-500 hover:border-blue-500/20 active:scale-95 transition-all"
                                title="Generate AI Video"
                              >
                                <Video size={16} className={isGeneratingVideo && activePost?.id === post.id ? 'animate-bounce text-blue-500' : ''} />
                              </button>
                            ) : null;
                          })()}
                          
                          {post.status === 'queued' ? (
                            <button
                              onClick={() => setEditingPost(post)}
                              className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-blue-500 hover:border-blue-500/20 active:scale-95 transition-all"
                              title={t('creativeStudio')}
                            >
                              <Sparkles size={16} />
                            </button>
                          ) : (
                            <div 
                              className="w-9 h-9 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl flex items-center justify-center text-zinc-300 dark:text-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/10"
                              title="Locked"
                            >
                              <Lock size={15} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Adaptive Card View */}
            <div className="md:hidden overflow-y-auto p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-950/20">
               {posts.map((post) => (
                 <div key={post.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                           {(() => {
                              let parsed: any[] = [];
                              if (post.imageUrl) {
                                try { parsed = JSON.parse(post.imageUrl); if (!Array.isArray(parsed)) parsed = [{ data: post.imageUrl }]; } 
                                catch (e) { parsed = [{ data: post.imageUrl }]; }
                              }
                              
                              if (parsed.length === 0) {
                                return <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-shrink-0 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[8px] uppercase text-zinc-400 italic">None</div>;
                              }

                              const mediaUrl = parsed[0].data || parsed[0].url || '';
                              const isVideo = mediaUrl.includes('/video/') || mediaUrl.includes('autoreels_videos') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('.mp4?');

                              return (
                               <div 
                                 onClick={() => isVideo ? handleVideoAction(post) : undefined}
                                 className={`w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-shrink-0 relative bg-zinc-950 flex items-center justify-center ${isVideo ? 'cursor-pointer hover:border-blue-500/40 active:scale-95' : ''}`}
                                 title={isVideo ? "View/Play Video" : undefined}
                               >
                                   {isVideo ? (
                                     <>
                                       <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                       <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                         <Video size={14} className="text-white" />
                                       </div>
                                     </>
                                   ) : (
                                     <img src={mediaUrl} className="w-full h-full object-cover" alt="Card media" />
                                   )}
                                </div>
                              );
                           })()}
                          <div>
                             <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">{post.fanpageName || 'Direct Campaign'}</h4>
                             <p className="text-[9px] text-zinc-400 font-semibold mt-1">{new Date(post.createdAt).toLocaleDateString()} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                       </div>
                       
                       <div className={`w-2.5 h-2.5 rounded-full ${
                         post.status === 'published' ? 'bg-emerald-500 animate-pulse' : post.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-bounce'
                       }`} />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/10 uppercase tracking-wider">{post.topic}</span>
                       <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">{post.status}</span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed italic border-l border-zinc-200 dark:border-zinc-800 pl-3 py-0.5">
                       "{post.content?.substring(0, 80)}{post.content?.length > 80 ? '...' : ''}"
                    </p>

                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                       <span className="text-[9px] font-mono font-extrabold text-zinc-400 uppercase tracking-wider">NODE: {post.id.substring(0, 8)}</span>
                        <div className="flex gap-2">
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
                            const mediaUrl = parsed.length > 0 ? (parsed[0].data || parsed[0].url || '') : '';
                            const isVideo = mediaUrl.includes('/video/') || mediaUrl.includes('autoreels_videos') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.webm') || mediaUrl.includes('.mp4?');
                            
                            return !isVideo ? (
                              <button
                                onClick={() => handleVideoAction(post)}
                                className="w-8 h-8 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-500"
                              >
                                <Video size={14} />
                              </button>
                            ) : null;
                          })()}
                          {post.status === 'queued' ? (
                            <button 
                              onClick={() => setEditingPost(post)}
                              className="w-8 h-8 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-blue-500 hover:border-blue-500/20 active:scale-95 transition-all"
                              title={t('creativeStudio')}
                            >
                              <Sparkles size={14} />
                            </button>
                          ) : (
                            <div 
                              className="w-8 h-8 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl flex items-center justify-center text-zinc-300 dark:text-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/10"
                              title="Locked"
                            >
                              <Lock size={13} />
                            </div>
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
          api={api}
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};
