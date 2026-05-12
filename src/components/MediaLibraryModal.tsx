import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, Search, History as HistoryIcon, Loader2, Cloud, Check, Play } from 'lucide-react';
import { ApiService } from '../api';
import { toast } from 'sonner';

interface MediaFile {
  name: string;
  url: string;
  mtime: string;
}

interface MediaLibraryModalProps {
  api: ApiService;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ api, onSelect, onClose }) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await api.media.list();
      setFiles(data);
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const tid = toast.loading('Uploading media asset...');
    try {
      const res = await api.media.upload(file);
      toast.success('Asset synchronized', { id: tid });
      onSelect(res.cloudUrl);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: tid });
    } finally {
      setUploading(false);
    }
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-12">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="nm-flat w-full max-w-5xl h-[85vh] flex flex-col rounded-[40px] relative z-10 overflow-hidden border border-white/5"
      >
        {/* Header */}
        <div className="p-8 sm:p-10 border-b border-text-muted/5 flex items-center justify-between">
           <div>
             <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight flex items-center gap-4">
               <div className="p-3 nm-button text-soft-blue rounded-2xl">
                 <ImageIcon size={24} />
               </div>
               MEDIA <span className="text-text-muted font-medium">VAULT</span>
             </h2>
             <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-3 ml-1">Strategic Asset Repository</p>
           </div>
           <button onClick={onClose} className="w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-all">
             <X size={24} />
           </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-80 border-r border-text-muted/5 p-8 space-y-10 overflow-y-auto">
             <div className="space-y-4">
               <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 opacity-50">Upload Portal</label>
               <div className="relative group">
                 <input 
                   type="file" 
                   accept="image/*,video/*"
                   disabled={uploading}
                   onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                   className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed" 
                 />
                 <div className={`w-full h-40 rounded-[32px] nm-inset transition-all flex flex-col items-center justify-center gap-4 border-2 border-transparent ${uploading ? 'animate-pulse' : 'group-hover:border-soft-blue/30 group-hover:bg-soft-blue/5'}`}>
                   {uploading ? (
                     <Loader2 className="w-8 h-8 text-soft-blue animate-spin" />
                   ) : (
                     <Upload className="w-8 h-8 text-text-muted group-hover:text-soft-blue transition-colors" />
                   )}
                   <span className="text-[10px] font-black text-text-muted uppercase tracking-widest group-hover:text-soft-blue">{uploading ? 'Processing...' : 'Upload Local'}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-4">
               <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 opacity-50">Filter Node</label>
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
                 <input 
                    type="text" 
                    placeholder="Search artifacts..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="nm-input w-full pl-14 pr-6 py-4 text-xs text-text-primary"
                 />
               </div>
             </div>

             <div className="pt-8 border-t border-text-muted/5">
                <div className="flex items-center gap-3 text-text-muted">
                  <div className="w-6 h-6 nm-flat flex items-center justify-center text-green-500 rounded-lg">
                    <Cloud size={12} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Cloud sync Active</span>
                </div>
             </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-black/5">
             {loading ? (
               <div className="h-full flex flex-col items-center justify-center gap-6">
                 <Loader2 className="w-12 h-12 text-soft-blue animate-spin" />
                 <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Accessing Secure Vault...</p>
               </div>
             ) : filtered.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-text-muted gap-6 opacity-30">
                 <HistoryIcon size={48} />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Assets Detected</span>
               </div>
             ) : (
               <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {filtered.map((file, idx) => (
                   <motion.div 
                     key={idx}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.03 }}
                     onClick={() => onSelect(file.url)}
                     className="group cursor-pointer space-y-4"
                   >
                    <div className="aspect-square rounded-[32px] nm-flat overflow-hidden relative group-hover:scale-[1.02] transition-all duration-500">
                        {file.url.includes('/video/') || file.url.endsWith('.mp4') || file.url.endsWith('.webm') ? (
                          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 nm-button rounded-full flex items-center justify-center text-soft-blue group-hover:scale-110 transition-transform">
                              <Play size={24} fill="currentColor" />
                            </div>
                            <span className="text-[8px] font-black text-soft-blue uppercase tracking-[0.2em]">Video Asset</span>
                          </div>
                        ) : (
                          <img 
                            src={file.url} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" 
                            alt={file.name}
                            onError={(e) => {
                              (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-soft-blue/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                           <div className="nm-flat p-4 rounded-2xl text-white">
                             <Check size={24} />
                           </div>
                        </div>
                     </div>
                     <div className="px-2">
                        <p className="text-[10px] font-bold text-text-primary truncate uppercase tracking-tight">{file.name.split('-').slice(1).join('-') || file.name}</p>
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-50">
                          {new Date(file.mtime).toLocaleDateString()}
                        </p>
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
