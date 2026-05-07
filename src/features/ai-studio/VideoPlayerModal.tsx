import React from 'react';
import { X, Share2, Download, Cloud, CheckCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl nm-flat rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row">
        {/* Video Side */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[400px]">
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
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Preview</h3>
                <p className="text-[10px] font-black text-soft-blue uppercase tracking-widest mt-1">Neural Output V1.0</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="nm-inset p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-4 text-text-muted">
                <Cloud size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Cloud persistent Link</span>
              </div>
              <p className="text-[9px] break-all opacity-40 font-mono line-clamp-3">{cleanUrl}</p>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <button 
              onClick={onPublish}
              disabled={isPublishing || isPublished}
              className={`w-full nm-button py-5 font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
                isPublished 
                  ? 'text-text-muted opacity-60 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-soft-blue/20 to-indigo-600/20 border-soft-blue/30 text-soft-blue hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
              }`}
            >
              {isPublished ? (
                <> <CheckCircle size={16} className="text-emerald-500" /> Đã đăng FB </>
              ) : (
                <> <Share2 size={16} className={isPublishing ? 'animate-pulse' : ''} /> {isPublishing ? 'Deploying...' : 'Publish to FB'} </>
              )}
            </button>

            <a 
              href={url} 
              download 
              target="_blank" 
              rel="noreferrer"
              className="w-full nm-button py-5 text-text-muted font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:text-text-primary"
            >
              <Download size={16} />
              Download Source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
