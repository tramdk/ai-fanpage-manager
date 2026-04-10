import React from 'react';
import { Sliders, X, Plus } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

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
    <div className="space-y-4">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">Automation Layer</label>
      <button onClick={onToggle} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 flex items-center justify-between font-bold text-[10px] uppercase tracking-widest text-emerald-500 hover:bg-slate-700 transition-all">
        <div className="flex items-center"><Sliders size={18} className="mr-3" /> {show ? t('cancelProtocol') : t('configureAutomation')}</div>
        {show ? <X size={18} /> : <Plus size={18} />}
      </button>

      {show && (
        <div className="p-8 border border-slate-700 rounded-[24px] bg-slate-900/50 animate-in slide-in-from-top-2 duration-300 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Tone */}
             <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-3 ml-2">Tone / Ngữ điệu</label>
                <select 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all" 
                  value={config.tone} 
                  onChange={e => onChange({ ...config, tone: e.target.value })}
                >
                   <option value="professional and elegant">Professional & Elegant</option>
                   <option value="fun and energetic">Fun & Energetic</option>
                   <option value="storytelling">Storytelling</option>
                   <option value="direct and promotional">Direct & Promotional</option>
                   <option value="urgent and compelling">Urgent & Compelling</option>
                   <option value="empathetic">Empathetic / Sâu lắng</option>
                </select>
             </div>
             
             {/* Keywords */}
             <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-3 ml-2">Keywords / Từ khóa</label>
                <input 
                  type="text"
                  placeholder="Ví dụ: sale, premium, summer..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-600" 
                  value={config.keywords} 
                  onChange={e => onChange({ ...config, keywords: e.target.value })}
                />
             </div>
           </div>

           {/* Instructions */}
           <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-3 ml-2">Additional Instructions / Chỉ dẫn phụ</label>
              <textarea 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-xs font-medium text-slate-300 outline-none focus:border-emerald-500/50 transition-all resize-none placeholder:text-slate-600" 
                rows={3}
                placeholder="Ví dụ: Hãy thêm call to action (kêu gọi hành động) ở cuối bài, sử dụng nhiều emoji..."
                value={config.instructions} 
                onChange={e => onChange({ ...config, instructions: e.target.value })}
              />
           </div>
        </div>
      )}
    </div>
  );
};
