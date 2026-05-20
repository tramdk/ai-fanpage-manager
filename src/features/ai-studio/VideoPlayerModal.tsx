import React from 'react';
import { X, Share2, Download, Cloud, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VideoPlayerModalProps {
  url: string;
  onClose: () => void;
  onPublish: () => void;
  isPublishing: boolean;
  isPublished?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ url, onClose, onPublish, isPublishing, isPublished }) => {
  // Ultra-safe URL extractor
  const getCleanUrl = (input: string) => {
    if (!input) return '';
    if (input.startsWith('[') || input.startsWith('{')) {
      try {
        const parsed = JSON.parse(input);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        
        // 1. Prioritize real video links
        const video = items.find(i => {
          const val = (i.data || i.url || '').toLowerCase();
          return val.includes('/video/') || val.includes('autoreels_videos') || val.endsWith('.mp4') || val.endsWith('.webm') || i.type === 'video';
        });
        
        if (video) return video.data || video.url;
 
        // 2. If no video found, but we have items, return the first one (fallback)
        return items[0].data || items[0].url;
      } catch (e) { return input; }
    }
    return input;
  };

  const cleanUrl = getCleanUrl(url);

  return (
    <Dialog open={!!url} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl sm:max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Video Preview</DialogTitle>
          <DialogDescription>Previewing the generated AI Video</DialogDescription>
        </DialogHeader>

        <div className="relative w-full nm-flat rounded-xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row">
          {/* Video Side */}
          <div className="flex-1 w-full md:w-[500px] min-w-[280px] md:min-w-[450px] bg-slate-950 flex items-center justify-center min-h-[400px] md:min-h-[500px]">
            <video 
              src={cleanUrl}
              controls 
              autoPlay 
              muted
              playsInline
              className="max-h-[70vh] w-full"
              style={{ filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Action Side */}
          <div className="w-full md:w-80 p-10 flex flex-col justify-between bg-app-bg/50 relative">
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#111827] dark:text-gray-100 ">Preview</h3>
                  <p className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 uppercase mt-1">Neural Output V1.0</p>
                </div>
                <Button onClick={onClose} variant="ghost" size="icon" className="size-10 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-all">
                  <X className="size-[18px]" />
                </Button>
              </div>

              <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-6 rounded-xl flex flex-col gap-4">
                <div className="flex items-center gap-4 text-[#6B7280] dark:text-gray-400">
                  <Cloud className="size-4" />
                  <span className="text-[10px] font-bold uppercase">Cloud persistent Link</span>
                </div>
                <p className="text-[9px] break-all opacity-40 font-mono line-clamp-3">{cleanUrl}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-12">
              <Button 
                onClick={onPublish}
                disabled={isPublishing || isPublished}
                className={`w-full py-5 font-bold uppercase text-[11px] tracking-[0.2em] h-auto rounded-lg ${
                  isPublished 
                    ? 'text-[#6B7280] dark:text-gray-400 opacity-60 cursor-not-allowed bg-transparent border-0' 
                    : 'bg-gradient-to-r from-soft-blue/20 to-indigo-600/20 border-soft-blue/30 text-[#2563EB] dark:text-blue-400 hover:'
                }`}
              >
                {isPublished ? (
                  <>
                    <CheckCircle data-icon="inline-start" className="text-emerald-500" />
                    Đã đăng FB
                  </>
                ) : (
                  <>
                    <Share2 data-icon="inline-start" className={isPublishing ? 'animate-pulse' : ''} />
                    {isPublishing ? 'Deploying...' : 'Publish to FB'}
                  </>
                )}
              </Button>

              <a 
                href={url} 
                download 
                target="_blank" 
                rel="noreferrer"
                className="w-full border border-[#D1D5DB] dark:border-white/12 rounded-lg py-5 text-[#6B7280] dark:text-gray-400 font-bold uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:text-[#111827] dark:text-gray-100 rounded-lg h-auto"
              >
                <Download className="size-4" />
                Download Source
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
