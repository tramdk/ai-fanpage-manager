import { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, 
  Clock, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Video, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  postId: string;
  videoId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function VideoQueueView({ api }: { api: any }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const data = await api.ai.getVideoQueue();
      setItems(data);
    } catch (err: any) {
      toast.error('Failed to fetch video queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchQueue(true), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="nm-flat p-8 rounded-full">
           <Loader2 className="w-12 h-12 text-soft-blue animate-spin" />
        </div>
        <p className="text-xs font-black text-text-secondary uppercase tracking-[0.4em] animate-pulse">Syncing Queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight">Video Generation Queue</h2>
          <p className="text-xs font-bold text-text-secondary mt-2 flex items-center gap-2">
            <Clock size={14} className="text-soft-blue" />
            Background processing for high-volume AI factory
          </p>
        </div>
        <button 
          onClick={() => fetchQueue(true)}
          disabled={refreshing}
          className="nm-button px-6 py-3 flex items-center gap-3 text-xs font-bold text-soft-blue hover:text-indigo-600 active:scale-95 transition-all"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="nm-flat p-20 rounded-[32px] text-center">
          <div className="w-20 h-20 nm-inset bg-app-bg rounded-2xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-text-primary mb-3">All Clear!</h3>
          <p className="text-xs font-bold text-text-muted max-w-xs mx-auto">
            No videos are currently being rendered. Everything is synced and ready to publish.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="nm-flat p-6 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-6 group hover:nm-flat-hover transition-all duration-300"
            >
              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className="w-14 h-14 nm-inset bg-app-bg rounded-xl flex items-center justify-center text-soft-blue shrink-0">
                  <Video size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Video ID</p>
                    <span className="px-2 py-0.5 nm-flat-sm text-[9px] font-black text-soft-blue rounded-md">{item.videoId}</span>
                  </div>
                  <h4 className="text-sm font-bold text-text-primary truncate">Processing for Post: {item.postId.split('-')[0]}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                      <Clock size={10} />
                      Started {new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                    <div className="flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-soft-blue animate-pulse"></span>
                       <span className="text-[9px] font-black text-soft-blue uppercase tracking-widest">{item.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-white/10">
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-text-muted mr-4">
                  <span>View Details</span>
                  <ChevronRight size={12} />
                </div>
                <button className="nm-button p-4 text-text-muted hover:text-soft-pink transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          <div className="mt-8 flex items-center gap-3 p-6 nm-inset bg-white/5 rounded-2xl">
            <AlertCircle size={20} className="text-amber-500 shrink-0" />
            <p className="text-[10px] font-bold text-text-secondary leading-relaxed">
              Items are automatically removed from this queue once rendering is complete. 
              Items stuck for more than 2 hours are cleared automatically by the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
