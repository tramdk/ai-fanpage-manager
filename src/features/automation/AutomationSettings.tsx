import React from 'react';
import { Sliders, X, Plus, Cpu } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

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
      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-4">Automation Layer</label>
      <button 
        onClick={onToggle} 
        className={`w-full nm-button px-8 py-5 flex items-center justify-between font-black text-[10px] uppercase tracking-widest transition-all ${show ? 'text-soft-blue nm-inset' : 'text-text-primary hover:text-soft-blue'}`}
      >
        <div className="flex items-center gap-4">
          <Cpu size={20} className={show ? 'text-soft-blue' : 'text-text-muted'} /> 
          {show ? t('cancelProtocol') : t('configureAutomation')}
        </div>
        {show ? <X size={20} /> : <Plus size={20} />}
      </button>

      {show && (
        <div className="nm-inset p-8 sm:p-12 animate-in slide-in-from-top-4 duration-500 space-y-10 rounded-[40px] sm:rounded-[48px]">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Tone */}
             <div className="space-y-4">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block ml-4">Neural Tone / Ngữ điệu</label>
                <div className="relative group">
                  <select 
                    className="nm-input font-bold appearance-none cursor-pointer text-text-primary pr-12" 
                    value={config.tone} 
                    onChange={e => onChange({ ...config, tone: e.target.value })}
                  >
                     <option value="professional and elegant" className="bg-app-bg text-text-primary">Professional & Elegant</option>
                     <option value="fun and energetic" className="bg-app-bg text-text-primary">Fun & Energetic</option>
                     <option value="storytelling" className="bg-app-bg text-text-primary">Storytelling</option>
                     <option value="direct and promotional" className="bg-app-bg text-text-primary">Direct & Promotional</option>
                     <option value="urgent and compelling" className="bg-app-bg text-text-primary">Urgent & Compelling</option>
                     <option value="empathetic" className="bg-app-bg text-text-primary">Empathetic / Sâu lắng</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-soft-blue transition-colors">
                    <Sliders size={16} />
                  </div>
                </div>
             </div>
             
             {/* Keywords */}
             <div className="space-y-4">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block ml-4">Neural Keywords / Từ khóa</label>
                <input 
                  type="text"
                  placeholder="e.g. sale, premium, summer..."
                  className="nm-input font-bold text-text-primary" 
                  value={config.keywords} 
                  onChange={e => onChange({ ...config, keywords: e.target.value })}
                />
             </div>
           </div>

           {/* Instructions */}
           <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block ml-4">Strategic Instructions / Chỉ dẫn phụ</label>
              <textarea 
                className="nm-input font-bold text-text-primary resize-none min-h-[140px] pt-4" 
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
