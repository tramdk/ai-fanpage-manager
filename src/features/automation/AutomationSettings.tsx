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
        <div className="nm-inset p-10 animate-in slide-in-from-top-4 duration-500 space-y-10 rounded-[48px]">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Tone */}
             <div className="space-y-4">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Neural Tone / Ngữ điệu</label>
                <select 
                  className="nm-input font-bold" 
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
             <div className="space-y-4">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Neural Keywords / Từ khóa</label>
                <input 
                  type="text"
                  placeholder="e.g. sale, premium, summer..."
                  className="nm-input font-bold placeholder:text-text-muted/30" 
                  value={config.keywords} 
                  onChange={e => onChange({ ...config, keywords: e.target.value })}
                />
             </div>
           </div>

           {/* Instructions */}
           <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block ml-4">Strategic Instructions / Chỉ dẫn phụ</label>
              <textarea 
                className="nm-input font-bold resize-none min-h-[120px] pt-4" 
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
