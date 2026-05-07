import React, { useState, useEffect } from 'react';
import { X, Play, Music, Mic, Layers, Info, Cpu } from 'lucide-react';
import { ApiService } from '../../api';

interface VideoConfigModalProps {
  onConfirm: (config: any) => void;
  onClose: () => void;
  api: ApiService;
}

export const VideoConfigModal: React.FC<VideoConfigModalProps> = ({ onConfirm, onClose, api }) => {
  const [options, setOptions] = useState<{ voices: any[], providers: string[], bgm: any[] }>({ 
    voices: [], 
    providers: ['edge', 'azure', 'google'], 
    bgm: [] 
  });
  const [loading, setLoading] = useState(true);
  
  const [config, setConfig] = useState({
    templateId: 'modern',
    ttsProvider: 'edge',
    ttsVoiceId: 'vi-VN-HoaiMyNeural',
    bgmAssetId: 'none'
  });

  const FALLBACK_VOICES = [
    { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My (Nữ)', provider: 'edge' },
    { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Nam)', provider: 'edge' },
    { id: 'vi-VN-AnNeural', name: 'An (Nữ)', provider: 'azure' },
    { id: 'vi-VN-HungNeural', name: 'Hùng (Nam)', provider: 'azure' }
  ];

  // Template-based default settings
  const TEMPLATE_DEFAULTS: Record<string, any> = {
    modern: { ttsProvider: 'edge', ttsVoiceId: 'vi-VN-HoaiMyNeural', bgmAssetId: 'none' },
    bold: { ttsProvider: 'edge', ttsVoiceId: 'vi-VN-NamMinhNeural', bgmAssetId: 'none' },
    cinematic: { ttsProvider: 'azure', ttsVoiceId: 'vi-VN-NamMinhNeural', bgmAssetId: 'none' },
    classic: { ttsProvider: 'edge', ttsVoiceId: 'vi-VN-HoaiMyNeural', bgmAssetId: 'none' }
  };

  useEffect(() => {
    api.ai.getVideoOptions()
      .then(data => {
        const voices = (data.voices && data.voices.length > 0) ? data.voices : FALLBACK_VOICES;
        const providers = (data.providers && data.providers.length > 0) ? data.providers : Array.from(new Set(voices.map((v: any) => v.provider)));
        const bgm = data.bgm || [];
        
        setOptions({ voices, providers, bgm });
        
        // Initial setup for 'modern' template
        const defaults = TEMPLATE_DEFAULTS['modern'];
        setConfig(prev => ({ ...prev, ...defaults }));
      })
      .catch(err => {
        console.warn('Failed to load video options, using fallbacks', err);
        setOptions(prev => ({ ...prev, voices: FALLBACK_VOICES, bgm: [] }));
      })
      .finally(() => setLoading(false));
  }, [api]);

  // Handle Template change and load defaults
  const handleTemplateChange = (id: string) => {
    const defaults = TEMPLATE_DEFAULTS[id] || {};
    setConfig({ ...config, templateId: id, ...defaults });
  };

  const filteredVoices = options.voices.filter(v => v.provider === config.ttsProvider);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-3xl nm-flat rounded-[48px] overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-soft-blue/10 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="p-10 sm:p-16 space-y-10 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 nm-inset flex items-center justify-center text-soft-blue rounded-2xl">
                <Play size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight">Neural Synthesis Studio</h3>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-1">Configure Generation Protocol</p>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {/* Template Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2">
                <Layers size={12} className="text-soft-blue" /> Cinematic Template
              </label>
              <select 
                className="nm-input font-bold text-text-primary"
                value={config.templateId}
                onChange={e => handleTemplateChange(e.target.value)}
              >
                <option value="modern" className="bg-app-bg">Modern (Smooth & Fast)</option>
                <option value="bold" className="bg-app-bg">Bold (Dynamic Energy)</option>
                <option value="classic" className="bg-app-bg">Classic (Minimalist)</option>
                <option value="cinematic" className="bg-app-bg">Cinematic (Epic Drama)</option>
              </select>
            </div>

            {/* BGM Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2">
                <Music size={12} className="text-soft-blue" /> Audio Atmosphere (BGM)
              </label>
              <select 
                className="nm-input font-bold text-text-primary"
                value={config.bgmAssetId}
                onChange={e => setConfig({ ...config, bgmAssetId: e.target.value })}
                disabled={loading}
              >
                <option value="none" className="bg-app-bg">No Atmosphere (Silent)</option>
                {!loading && options.bgm.map(m => (
                  <option key={m.id} value={m.id} className="bg-app-bg">{m.name}</option>
                ))}
              </select>
            </div>

            {/* TTS Provider (Model) Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2">
                <Cpu size={12} className="text-soft-blue" /> Neural Engine (Model)
              </label>
              <select 
                className="nm-input font-bold text-text-primary"
                value={config.ttsProvider}
                onChange={e => setConfig({ ...config, ttsProvider: e.target.value, ttsVoiceId: options.voices.find(v => v.provider === e.target.value)?.id || '' })}
                disabled={loading}
              >
                {options.providers.map(p => (
                  <option key={p} value={p} className="bg-app-bg">{p.toUpperCase()} Engine</option>
                ))}
              </select>
            </div>

            {/* Voice Selection */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-4 flex items-center gap-2">
                <Mic size={12} className="text-soft-blue" /> Vocal Signature (Voice)
              </label>
              <select 
                className="nm-input font-bold text-text-primary"
                value={config.ttsVoiceId}
                onChange={e => setConfig({ ...config, ttsVoiceId: e.target.value })}
                disabled={loading}
              >
                {filteredVoices.map(v => (
                  <option key={v.id} value={v.id} className="bg-app-bg">{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nm-inset p-8 rounded-3xl flex items-start gap-6 border-l-4 border-soft-blue">
            <Info size={20} className="text-soft-blue mt-1 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-[11px] text-text-primary font-black uppercase tracking-widest">Synthesis Protocol Info</p>
              <p className="text-[10px] text-text-muted leading-relaxed font-medium uppercase tracking-wider">
                Sanitization active. Template "{config.templateId.toUpperCase()}" loaded with optimal neural parameters.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-6 gap-6">
            <button onClick={onClose} className="nm-button px-10 py-5 text-text-muted font-black uppercase text-[11px] tracking-widest hover:text-soft-pink">
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(config)} 
              className="nm-button px-14 py-5 bg-gradient-to-r from-soft-blue/20 to-indigo-600/20 border-soft-blue/30 text-soft-blue font-black uppercase text-[11px] tracking-[0.2em] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all"
            >
              Initiate Synthesis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
