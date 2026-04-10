import React, { useState, useEffect } from 'react';
import { History, X, Info, Sliders, Sparkles, Upload } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { AICreativeStudio } from './AICreativeStudio';
import { ApiService } from '../api';
import { Post } from '../types';
import { useLanguage } from '../LanguageContext';

export const HistoryView = ({ api }: { api: ApiService }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  // NEW: State for Edit Modal
  const [editingPost, setEditingPost] = useState<Post | null>(null);

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

  const handleSaveEdit = async (data: { content: string, media: any[] }) => {
    if (!editingPost) return;
    try {
      const resp = await api.posts.update(editingPost.id, {
        content: data.content,
        imageUrl: data.media.length > 0 ? JSON.stringify(data.media) : null
      });

      if (resp.error) throw new Error(resp.error);

      setPosts(posts.map(p => p.id === editingPost.id ? { 
        ...p, 
        content: data.content, 
        imageUrl: data.media.length > 0 ? JSON.stringify(data.media) : null 
      } : p));
      setEditingPost(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl animate-in shake duration-500">
        <div className="font-bold uppercase text-[10px] tracking-widest mb-1">System Error</div>
        <p className="text-xs font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/10">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-50 uppercase tracking-tight">{t('activityFeed')}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time system synchronization monitor</p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            Nodes: {posts.length}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[32px] border border-slate-800 shadow-3xl overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-24 text-center">
            <History className="w-16 h-16 mx-auto mb-8 text-slate-800" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em]">{t('noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                  <th className="px-8 py-5">{t('fanpages')}</th>
                  <th className="px-8 py-5">{t('topicsKeywords')}</th>
                  <th className="px-8 py-5">{t('lastSync')}</th>
                  <th className="px-8 py-5">{t('creativeStudio')}</th>
                  <th className="px-8 py-5">{t('promptInstructions')}</th>
                  <th className="px-8 py-5">{t('statusActive')}</th>
                  <th className="px-8 py-5 text-right pr-12">{t('quickActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-800/30 transition-all duration-300 group">
                    <td className="px-8 py-6 text-[11px] font-bold text-slate-400">{post.fanpageName || 'System Generated'}</td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        {post.topic}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[11px] font-bold text-slate-300 font-mono">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase mt-1 tracking-wider">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-8 py-6">
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
                        return parsed.length > 0 ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-xl group-hover:border-emerald-500/50 transition-all">
                            <img src={parsed[0].data} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-700">
                            <span className="text-[8px] text-slate-600 uppercase font-bold">None</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-500 max-w-xs truncate font-medium italic" title={post.content}>
                      "{post.content ? (post.content.length > 60 ? post.content.substring(0, 60) + '...' : post.content) : 'Empty automated generation'}"
                    </td>
                    <td className="px-8 py-6"><StatusBadge status={post.status} /></td>
                    <td className="px-8 py-6 text-right pr-12">
                      {post.status === 'queued' ? (
                        <button
                          onClick={() => setEditingPost(post)}
                          className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
                        >
                          {t('creativeStudio')}
                        </button>
                      ) : (
                        <button className="text-[9px] uppercase font-bold text-slate-700 tracking-widest cursor-not-allowed">
                          Locked
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingPost && (
        <AICreativeStudio 
          post={editingPost} 
          api={api} 
          onSave={handleSaveEdit} 
          onClose={() => setEditingPost(null)} 
        />
      )}
    </div>
  );
};
