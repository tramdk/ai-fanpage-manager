import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Edit3, Eye, Clock, MessageSquare, Image as ImageIcon, Video, FileText, Filter, Search, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';

interface PendingApproval {
  id: string;
  workflowName: string;
  type: 'post' | 'image' | 'video';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  };
  createdAt: string;
}

export const ApprovalsView: React.FC<{ api: ApiService }> = ({ api }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'post' | 'image' | 'video'>('all');

  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        // Mock data for demonstration
        const mockData: PendingApproval[] = [
          {
            id: '1',
            workflowName: 'Daily Tech News',
            type: 'post',
            content: { text: 'AI is changing the world as we know it! Check out our latest post about the future of automation.' },
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            workflowName: 'Fashion Campaign',
            type: 'image',
            content: { 
              text: 'Summer Vibes 2026', 
              mediaUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400',
              mediaType: 'image'
            },
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: '3',
            workflowName: 'Product Launch Video',
            type: 'video',
            content: { 
              text: 'The new SuperWidget is here!', 
              mediaUrl: 'https://res.cloudinary.com/demo/video/upload/c_scale,w_400/dog.mp4',
              mediaType: 'video'
            },
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        setItems(mockData);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setItems(prev => prev.filter(item => item.id !== id));
    // toast.success(`Item ${action}ed`);
  };

  const filteredItems = items.filter(item => filter === 'all' || item.type === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Clock className="w-12 h-12 text-soft-blue animate-spin" />
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-text-primary uppercase tracking-tighter leading-none">{t('approvalsTitle') || 'Approval Center'}</h2>
          <p className="text-sm font-bold text-text-muted mt-3 uppercase tracking-widest opacity-60">Review generated content before publishing</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="nm-inset p-1.5 flex items-center gap-1">
              {(['all', 'post', 'image', 'video'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                    ${filter === f ? 'nm-button text-soft-blue' : 'text-text-muted hover:text-text-primary'}
                  `}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredItems.length === 0 ? (
          <div className="nm-inset p-20 text-center rounded-[48px]">
            <CheckCircle2 size={48} className="mx-auto mb-6 text-emerald-500/20" />
            <p className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Queue Clean • No items pending</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="nm-flat rounded-[48px] overflow-hidden group hover:scale-[1.005] transition-all duration-500">
              <div className="flex flex-col lg:flex-row">
                {/* Media Preview */}
                {item.content.mediaUrl ? (
                  <div className="lg:w-80 w-full h-64 lg:h-auto bg-black flex items-center justify-center relative overflow-hidden shrink-0">
                    {item.content.mediaType === 'video' ? (
                      <video src={item.content.mediaUrl} className="w-full h-full object-cover opacity-80" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    ) : (
                      <img src={item.content.mediaUrl} alt="Preview" className="w-full h-full object-cover opacity-90" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 nm-flat p-3 rounded-xl text-white">
                      {item.content.mediaType === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
                    </div>
                  </div>
                ) : (
                  <div className="lg:w-80 w-full h-64 lg:h-auto nm-inset flex items-center justify-center shrink-0">
                    <FileText size={48} className="text-soft-blue/20" />
                  </div>
                )}

                {/* Content Details */}
                <div className="flex-1 p-8 lg:p-12 flex flex-col justify-between gap-10">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="nm-inset px-4 py-1.5 rounded-xl text-[9px] font-black text-soft-blue uppercase tracking-widest">{item.workflowName}</span>
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} />
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-lg font-bold text-text-primary leading-relaxed line-clamp-3">
                         {item.content.text}
                       </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-text-muted/5">
                    <button onClick={() => handleAction(item.id, 'approve')} className="flex-1 min-w-[140px] nm-button bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                    <button onClick={() => handleAction(item.id, 'reject')} className="flex-1 min-w-[140px] nm-button bg-soft-pink/10 text-soft-pink hover:bg-soft-pink hover:text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                      <XCircle size={16} />
                      Reject
                    </button>
                    <button className="w-14 h-14 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue">
                      <Edit3 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
