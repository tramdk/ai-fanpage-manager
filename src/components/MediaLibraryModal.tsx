import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, Search, History as HistoryIcon, Loader2, Cloud, Check, Play } from 'lucide-react';
import { ApiService } from '../api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xl" 
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full max-w-5xl h-[85vh] flex flex-col rounded-[2.5rem] relative z-10 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
               <ImageIcon size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Media Vault</h2>
               <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-1">Strategic Asset Repository</p>
             </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-all">
             <X size={16} />
           </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-72 border-r border-zinc-100 dark:border-zinc-900 p-6 space-y-8 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20">
             
             {/* Upload Portal */}
             <div className="space-y-3">
               <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block ml-1">Upload Portal</label>
               <div className="relative group">
                 <input 
                   type="file" 
                   accept="image/*,video/*"
                   disabled={uploading}
                   onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                   className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed" 
                 />
                 <div className={`w-full h-36 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 transition-all flex flex-col items-center justify-center gap-3 p-4 text-center ${uploading ? 'animate-pulse' : 'group-hover:border-blue-500/40 group-hover:bg-blue-500/5'}`}>
                   {uploading ? (
                     <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                   ) : (
                     <Upload className="w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                   )}
                   <div>
                     <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider block">{uploading ? 'Processing...' : 'Upload Local'}</span>
                     <p className="text-[8px] text-zinc-400 mt-1">Images or Videos</p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Search Filter */}
             <div className="space-y-3">
               <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block ml-1">Filter Assets</label>
               <div className="relative">
                 <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                 <Input 
                   type="text" 
                   placeholder="Search by name..." 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 pl-11 pr-4 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                 />
               </div>
             </div>

             {/* Cloud Status indicator */}
             <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5">
                  <Cloud size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Cloud Sync Active</span>
                </div>
             </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-zinc-50/20 dark:bg-zinc-950/10">
             {loading ? (
               <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
                 <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                 <p className="text-[10px] font-extrabold uppercase tracking-widest">Accessing Secure Vault...</p>
               </div>
             ) : filtered.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-40 gap-4">
                 <HistoryIcon size={36} />
                 <span className="text-[10px] font-extrabold uppercase tracking-wider">Zero Assets Detected</span>
               </div>
             ) : (
               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filtered.map((file, idx) => (
                   <motion.div 
                     key={idx}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.03, type: "spring", stiffness: 100 }}
                     onClick={() => onSelect(file.url)}
                     className="group cursor-pointer space-y-3"
                   >
                     <div className="aspect-square rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden relative group-hover:scale-[1.02] hover:border-blue-500/30 shadow-sm transition-all duration-300">
                         {file.url.includes('/video/') || file.url.endsWith('.mp4') || file.url.endsWith('.webm') ? (
                           <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center gap-3">
                             <div className="w-12 h-12 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform active:scale-95">
                               <Play size={18} className="fill-current" />
                             </div>
                             <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-widest">Video Asset</span>
                           </div>
                         ) : (
                           <img 
                             src={file.url} 
                             className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                             alt={file.name}
                             onError={(e) => {
                               (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80';
                             }}
                           />
                         )}
                         <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white shadow-lg">
                              <Check size={16} />
                            </div>
                         </div>
                      </div>
                      <div className="px-1">
                         <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate uppercase tracking-tight">{file.name.split('-').slice(1).join('-') || file.name}</p>
                         <p className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-widest mt-1">
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
