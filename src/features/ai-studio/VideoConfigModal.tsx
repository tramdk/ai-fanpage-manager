import React, { useState, useEffect } from 'react';
import { X, Play, Music, Mic, Layers, Info, Cpu } from 'lucide-react';
import { ApiService } from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface VideoConfigModalProps {
  onConfirm: (config: any) => void;
  onClose: () => void;
  api: ApiService;
}

export const VideoConfigModal: React.FC<VideoConfigModalProps> = ({ onConfirm, onClose, api }) => {
  const [options, setOptions] = useState<{ voices: any[], providers: string[], bgm: any[], templates: any[] }>({ 
    voices: [], 
    providers: ['edge', 'azure', 'google'], 
    bgm: [],
    templates: [
      { id: 'modern', name: 'Modern (Smooth & Fast)' },
      { id: 'bold', name: 'Bold (Dynamic Energy)' },
      { id: 'classic', name: 'Classic (Minimalist)' },
      { id: 'cinematic', name: 'Cinematic (Epic Drama)' }
    ]
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
        const templates = (data.templates && data.templates.length > 0) ? data.templates : options.templates;
        
        setOptions({ voices, providers, bgm, templates });
        
        // Initial setup for the first available template
        const firstTemplateId = templates[0]?.id || 'modern';
        const defaults = TEMPLATE_DEFAULTS[firstTemplateId] || TEMPLATE_DEFAULTS['modern'];
        setConfig(prev => ({ ...prev, templateId: firstTemplateId, ...defaults }));
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
    setConfig(prev => ({ ...prev, templateId: id, ...defaults }));
  };

  const filteredVoices = options.voices.filter(v => v.provider === config.ttsProvider);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl sm:max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Neural Synthesis Configuration</DialogTitle>
          <DialogDescription>Configure details for voiceover template synthesis</DialogDescription>
        </DialogHeader>

        <div className="relative w-full nm-flat rounded-xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute top-0 right-0 size-64 bg-[#2563EB]/10 blur-[100px] -mr-32 -mt-32"></div>
          
          <div className="p-10 sm:p-16 flex flex-col gap-10 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="size-16 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-lg">
                  <Play className="size-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100 ">Neural Synthesis Studio</h3>
                  <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em] mt-1">Configure Generation Protocol</p>
                </div>
              </div>
              <Button onClick={onClose} variant="ghost" size="icon" className="size-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-all">
                <X className="size-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {/* Template Selection */}
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-4 flex items-center gap-2">
                  <Layers className="size-3.5 text-[#2563EB] dark:text-blue-400" /> Cinematic Template
                </label>
                <Select value={config.templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full h-auto bg-slate-900 border-2 border-white/5 rounded-lg p-4 text-white font-bold">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950/95 border border-white/10 rounded-lg">
                    {options.templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-white hover:bg-slate-800">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* BGM Selection */}
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-4 flex items-center gap-2">
                  <Music className="size-3.5 text-[#2563EB] dark:text-blue-400" /> Audio Atmosphere (BGM)
                </label>
                <Select 
                  value={config.bgmAssetId} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, bgmAssetId: val }))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-auto bg-slate-900 border-2 border-white/5 rounded-lg p-4 text-white font-bold">
                    <SelectValue placeholder="Select BGM" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950/95 border border-white/10 rounded-lg">
                    <SelectItem value="none" className="text-white hover:bg-slate-800">No Atmosphere (Silent)</SelectItem>
                    {!loading && options.bgm.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-white hover:bg-slate-800">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TTS Provider (Model) Selection */}
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-4 flex items-center gap-2">
                  <Cpu className="size-3.5 text-[#2563EB] dark:text-blue-400" /> Neural Engine (Model)
                </label>
                <Select 
                  value={config.ttsProvider} 
                  onValueChange={(val) => {
                    const firstVoiceOfProvider = options.voices.find(v => v.provider === val);
                    setConfig(prev => ({ 
                      ...prev, 
                      ttsProvider: val, 
                      ttsVoiceId: firstVoiceOfProvider ? (firstVoiceOfProvider.voiceId || firstVoiceOfProvider.id) : '' 
                    }));
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-auto bg-slate-900 border-2 border-white/5 rounded-lg p-4 text-white font-bold">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950/95 border border-white/10 rounded-lg">
                    {options.providers.map(p => (
                      <SelectItem key={p} value={p} className="text-white hover:bg-slate-800">
                        {p.toUpperCase()} Engine
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-4 flex items-center gap-2">
                  <Mic className="size-3.5 text-[#2563EB] dark:text-blue-400" /> Vocal Signature (Voice)
                </label>
                <Select 
                  value={config.ttsVoiceId} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, ttsVoiceId: val }))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-auto bg-slate-900 border-2 border-white/5 rounded-lg p-4 text-white font-bold">
                    <SelectValue placeholder="Select voice signature" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950/95 border border-white/10 rounded-lg">
                    {filteredVoices.map(v => (
                      <SelectItem key={v.id} value={v.voiceId || v.id} className="text-white hover:bg-slate-800">
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 rounded-xl flex items-start gap-6 border-l border-soft-blue/40">
              <Info className="size-5 text-[#2563EB] dark:text-blue-400 mt-1 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="text-[11px] text-[#111827] dark:text-gray-100 font-bold uppercase">Synthesis Protocol Info</p>
                <p className="text-[10px] text-[#6B7280] dark:text-gray-400 leading-relaxed font-medium uppercase">
                  Sanitization active. Template "{config.templateId.toUpperCase()}" loaded with optimal neural parameters.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6 gap-6">
              <Button onClick={onClose} variant="ghost" className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-10 py-5 text-[#6B7280] dark:text-gray-400 font-bold uppercase text-[11px] tracking-normal hover:text-soft-pink h-auto rounded-lg">
                Cancel
              </Button>
              <Button 
                onClick={() => onConfirm(config)} 
                className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-14 py-5 bg-gradient-to-r from-soft-blue/20 to-indigo-600/20 border-soft-blue/30 text-[#2563EB] dark:text-blue-400 font-bold uppercase text-[11px] tracking-[0.2em] hover: transition-all h-auto rounded-lg"
              >
                Initiate Synthesis
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
