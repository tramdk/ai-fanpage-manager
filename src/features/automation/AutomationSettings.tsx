import React from 'react';
import { Sliders, X, Plus, Cpu } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AutomationConfig {
  tone: string;
  keywords: string;
  instructions: string;
}

interface AutomationSettingsProps {
  config: AutomationConfig;
  onChange: (config: AutomationConfig) => void;
  show: boolean;
  onToggle: () => void;
}

export const AutomationSettings: React.FC<AutomationSettingsProps> = ({ config, onChange, show, onToggle }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em] ml-4">Automation Layer</label>
      <button 
        onClick={onToggle} 
        className={`w-full border border-[#D1D5DB] dark:border-white/12 rounded-lg px-8 py-5 flex items-center justify-between font-bold text-[10px] uppercase transition-all ${show ? 'text-[#2563EB] dark:text-blue-400 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg' : 'text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400'}`}
      >
        <div className="flex items-center gap-4">
          <Cpu size={20} className={show ? 'text-[#2563EB] dark:text-blue-400' : 'text-[#6B7280] dark:text-gray-400'} /> 
          {show ? t('cancelProtocol') : t('configureAutomation')}
        </div>
        {show ? <X size={20} /> : <Plus size={20} />}
      </button>

      {show && (
        <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 sm:p-12 animate-in slide-in-from-top-4 duration-500 space-y-10 rounded-xl sm:rounded-xl">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Tone */}
             <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Neural Tone / Ngữ điệu</label>
                
                  <Select value={config.tone} onValueChange={(val) => onChange({ ...config, tone: val })}>
                   <SelectTrigger className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all justify-between [&>span]:line-clamp-1">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="professional and elegant" >Professional & Elegant</SelectItem>
                      <SelectItem value="fun and energetic" >Fun & Energetic</SelectItem>
                      <SelectItem value="storytelling" >Storytelling</SelectItem>
                      <SelectItem value="direct and promotional" >Direct & Promotional</SelectItem>
                      <SelectItem value="urgent and compelling" >Urgent & Compelling</SelectItem>
                      <SelectItem value="empathetic" >Empathetic / Sâu lắng</SelectItem>
                   </SelectContent>
                 </Select>
                  
                
             </div>
             
             {/* Keywords */}
             <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Neural Keywords / Từ khóa</label>
                <Input 
                   type="text"
                   placeholder="e.g. sale, premium, summer..."
                   className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" 
                   value={config.keywords} 
                   onChange={e => onChange({ ...config, keywords: e.target.value })}
                 />
             </div>
           </div>

           {/* Instructions */}
           <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] block ml-4">Strategic Instructions / Chỉ dẫn phụ</label>
              <Textarea 
                 className="w-full min-h-[140px] p-4 font-bold text-sm resize-none custom-scrollbar rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all" 
                 rows={3}
                 placeholder="e.g. Hãy thêm call to action (kêu gọi hành động) ở cuối bài, sử dụng nhiều emoji..."
                 value={config.instructions} 
                 onChange={e => onChange({ ...config, instructions: e.target.value })}
               />
           </div>
        </div>
      )}
    </div>
  );
};
