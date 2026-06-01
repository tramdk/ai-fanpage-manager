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

  const handleTemplateChange = (id: string) => {
    const defaults = TEMPLATE_DEFAULTS[id] || {};
    setConfig(prev => ({ ...prev, templateId: id, ...defaults }));
  };

  const filteredVoices = options.voices.filter(v => v.provider === config.ttsProvider);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl md:max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-none ring-0 rounded-[2.5rem]" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Neural Synthesis Configuration</DialogTitle>
          <DialogDescription>Configure details for voiceover template synthesis</DialogDescription>
        </DialogHeader>

        <div className="relative w-full rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full -mr-20 -mt-20 pointer-events-none" />
          
          <div className="p-8 sm:p-10 flex flex-col gap-8 relative z-10">
            
            {/* Header Area */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Play size={20} className="fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Neural Synthesis Studio</h3>
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-1">Configure Video & Voiceover Protocol</p>
                </div>
              </div>
              <Button onClick={onClose} variant="ghost" size="icon" className="w-10 h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-all">
                <X size={16} />
              </Button>
            </div>

            {/* Config Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Template Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Layers size={12} className="text-blue-500" /> Cinematic Template
                </label>
                <Select value={config.templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full h-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 justify-between">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                    {options.templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* BGM Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Music size={12} className="text-blue-500" /> Audio Atmosphere (BGM)
                </label>
                <Select 
                  value={config.bgmAssetId} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, bgmAssetId: val }))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 justify-between">
                    <SelectValue placeholder="Select BGM" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                    <SelectItem value="none" className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">No Atmosphere (Silent)</SelectItem>
                    {!loading && options.bgm.map(m => (
                      <SelectItem key={m.id} value={m.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TTS Provider (Model) Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Cpu size={12} className="text-blue-500" /> Neural Engine (Model)
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
                  <SelectTrigger className="w-full h-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 justify-between">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                    {options.providers.map(p => (
                      <SelectItem key={p} value={p} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        {p.toUpperCase()} Engine
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                  <Mic size={12} className="text-blue-500" /> Vocal Signature (Voice)
                </label>
                <Select 
                  value={config.ttsVoiceId} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, ttsVoiceId: val }))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full h-12 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 justify-between">
                    <SelectValue placeholder="Select voice signature" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-950 dark:text-zinc-50">
                    {filteredVoices.map(v => (
                      <SelectItem key={v.id} value={v.voiceId || v.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info Message Box */}
            <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 flex items-start gap-4 border-l-4 border-l-blue-500">
              <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-900 dark:text-zinc-100 font-bold uppercase tracking-wider">Synthesis Protocol Info</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal font-medium">
                  Sanitization active. Template "{config.templateId.toUpperCase()}" loaded with optimal neural parameters.
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-end pt-4 gap-4">
              <Button onClick={onClose} variant="ghost" className="border border-zinc-200 dark:border-zinc-800 rounded-xl px-6 py-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent h-auto text-xs font-bold uppercase tracking-wider active:scale-95 transition-all">
                Cancel
              </Button>
              <Button 
                onClick={() => onConfirm(config)} 
                className="border border-blue-500/20 rounded-xl px-8 py-3 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-xs tracking-wider hover:scale-[1.01] active:scale-[0.98] transition-all h-auto"
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
