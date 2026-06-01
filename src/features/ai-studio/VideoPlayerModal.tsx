import React, { useState, useEffect } from 'react';
import { X, Share2, Download, Cloud, CheckCircle, Copy, Check, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ApiService } from '../../api';

interface VideoPlayerModalProps {
  url: string;
  onClose: () => void;
  onPublish: (fanpageId: string) => void;
  isPublishing: boolean;
  isPublished?: boolean;
  api: ApiService;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ url, onClose, onPublish, isPublishing, isPublished, api }) => {
  const [copied, setCopied] = useState(false);
  const [fanpages, setFanpages] = useState<any[]>([]);
  const [selectedFanpageId, setSelectedFanpageId] = useState<string>('');

  useEffect(() => {
    api.fanpages.list()
      .then(data => {
        const activePages = data.filter((p: any) => p.status === 'active');
        setFanpages(activePages);
        if (activePages.length > 0) {
          setSelectedFanpageId(activePages[0].id);
        }
      })
      .catch(err => console.warn('Failed to load fanpages in modal', err));
  }, [api]);

  const getCleanUrl = (input: string) => {
    if (!input) return '';
    if (input.startsWith('[') || input.startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        const video = items.find(i => {
          const val = (i.data || i.url || '').toLowerCase();
          return val.includes('/video/') || val.includes('autoreels_videos') || val.endsWith('.mp4') || val.endsWith('.webm') || i.type === 'video';
        });
        
        if (video) return video.data || video.url;
        return items[0].data || items[0].url;
      } catch (e) { return input; }
    }
    return input;
  };

  const cleanUrl = getCleanUrl(url);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    toast.success('CDN Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishClick = () => {
    if (!selectedFanpageId) {
      toast.error('Select a target Fanpage first.');
      return;
    }
    onPublish(selectedFanpageId);
  };

  return (
    <Dialog open={!!url} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md md:max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-none ring-0 rounded-[2.5rem]" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Video Preview</DialogTitle>
          <DialogDescription>Previewing the generated AI Video</DialogDescription>
        </DialogHeader>

        <div className="relative w-full backdrop-blur-xl bg-zinc-900/90 dark:bg-zinc-950/95 border border-zinc-200/20 dark:border-zinc-800/80 rounded-[2.5rem] p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 animate-in zoom-in-95 duration-300">
          
          {/* Left Column: Vertical Video Port */}
          <div className="flex-1 flex flex-col gap-4">
            {/* 9:16 Video Player Body */}
            <div className="relative w-full aspect-[9/16] max-h-[40vh] md:max-h-[65vh] rounded-[1.8rem] border border-zinc-200/20 dark:border-zinc-800/80 bg-black overflow-hidden shadow-2xl flex items-center justify-center group">
              <video 
                src={cleanUrl}
                controls 
                autoPlay 
                muted
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Visual Screen Glare Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-30" />
            </div>
          </div>

          {/* Right Column: Dynamic Options Panel */}
          <div className="w-full md:w-80 flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-5">
              {/* Header Bar */}
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Neural Player</h3>
                  <p className="text-[9px] font-extrabold text-blue-500 uppercase tracking-widest mt-0.5">9:16 Vertical Protocol</p>
                </div>
                
                <Button 
                  onClick={onClose} 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-zinc-400 hover:text-red-500 hover:border-red-500/20 active:scale-95 transition-all"
                >
                  <X size={14} />
                </Button>
              </div>

              {/* Fanpage Selection Protocol Dropdown */}
              <div className="bg-zinc-950/40 dark:bg-zinc-900/20 border border-zinc-200/20 dark:border-zinc-800/40 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Layers size={12} className="text-blue-500" />
                  <span className="text-[8px] font-extrabold uppercase tracking-wider">Target Facebook Destination</span>
                </div>
                <select
                  value={selectedFanpageId}
                  onChange={(e) => setSelectedFanpageId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-50 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  {fanpages.length === 0 ? (
                    <option value="">No Active Fanpages Available</option>
                  ) : (
                    fanpages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Content Info & Copy CDN Card */}
              <div className="bg-zinc-950/40 dark:bg-zinc-900/20 border border-zinc-200/20 dark:border-zinc-800/40 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Cloud size={12} className="text-blue-500" />
                    <span className="text-[8px] font-extrabold uppercase tracking-wider">Storage CDN Address</span>
                  </div>
                  <button 
                    onClick={handleCopyLink}
                    className="text-zinc-400 hover:text-blue-500 transition-colors"
                    title="Copy CDN Link"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-[9px] font-mono break-all opacity-50 line-clamp-1 leading-relaxed text-zinc-900 dark:text-zinc-100">{cleanUrl}</p>
              </div>
            </div>

            {/* Control Triggers */}
            <div className="grid grid-cols-5 gap-2 px-1">
              <Button 
                onClick={handlePublishClick}
                disabled={isPublishing || isPublished || !selectedFanpageId}
                className={`col-span-4 py-4 font-extrabold uppercase text-[10px] tracking-widest h-auto rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                  isPublished 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-not-allowed' 
                    : 'border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                }`}
              >
                {isPublished ? (
                  <>
                    <CheckCircle size={13} className="text-emerald-500" />
                    <span>Published to FB</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} className={isPublishing ? 'animate-pulse' : 'text-indigo-400'} />
                    <span>{isPublishing ? 'Deploying...' : 'Deploy to Fanpage'}</span>
                  </>
                )}
              </Button>

              <a 
                href={cleanUrl} 
                download="ai-generated-video.mp4" 
                target="_blank" 
                rel="noreferrer"
                className="col-span-1 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/10 active:scale-[0.98] transition-all"
                title="Download Source"
              >
                <Download size={14} />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
