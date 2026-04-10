import React, { useState, useCallback, useEffect, useTransition, useMemo } from 'react';
import {
  LayoutDashboard, Facebook, Settings, Bell, Search, Menu, 
  Activity, History, User as UserIcon, Clock, Bot, LogOut, 
  Plus, X, Sparkles, Loader2
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { CONFIG } from './config';
import { useApiService } from './hooks/useApiService';

// --- TYPES ---
import { User, Fanpage, AuthFetch } from './types';

// --- COMPONENTS ---
import { DashboardView } from './components/DashboardView';
import { FanpageView } from './components/FanpageView';
import { AutomationView } from './components/AutomationView';
import { AIContentView } from './components/AIContentView';
import { HistoryView } from './components/HistoryView';
import { AdminView } from './components/AdminView';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import CampaignPlannerView from './components/CampaignPlannerView';
import { ForcePasswordChangeView } from './components/ForcePasswordChangeView';

// [rerender-memo-with-default-value] - Hoist static constants outside component
const GET_NAV_ITEMS = (t: any, role?: string) => [
  { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
  { id: 'fanpages', label: t('fanpages'), icon: Facebook },
  { id: 'automation', label: t('automation'), icon: Clock },
  { id: 'planner', label: 'AI Planner', icon: Sparkles },
  { id: 'ai-content', label: t('aiContent'), icon: Bot },
  { id: 'history', label: t('history'), icon: History },
  ...(role === 'admin' ? [{ id: 'admin', label: t('admin'), icon: UserIcon }] : []),
  { id: 'settings', label: t('settings'), icon: Settings },
];

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPending, startTransition] = useTransition(); // [rerender-transitions]
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fanpages, setFanpages] = useState<Fanpage[]>([]);
  const [preSelectedFanpageId, setPreSelectedFanpageId] = useState<string | undefined>(undefined);
  const { language, setLanguage, t } = useLanguage();

  // Modals & Dynamic State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configAppId, setConfigAppId] = useState('');
  const [configAppSecret, setConfigAppSecret] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [fbApps, setFbApps] = useState<{ id: string, appId: string, name: string }[]>([]);
  const [showAppPicker, setShowAppPicker] = useState(false);

  // [rerender-functional-setstate] - Stable callback for authFetch
  const authFetch: AuthFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers as any);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(CONFIG.getApiUrl(url), { ...options, headers } as any);
  }, [token]);

  const api = useApiService(authFetch);

  const handleLogin = useCallback((newToken: string, userData: any) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null); setUser(null); setFanpages([]);
  }, []);

  // [async-parallel] - Start user verification
  useEffect(() => {
    if (!token) return;
    api.users.getMe()
      .then(data => setUser(data))
      .catch(() => handleLogout());
  }, [token, api, handleLogout]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // [async-parallel] - Parallelize initial fetches
      const [fanpagesData, fbAppsData] = await Promise.all([
        api.fanpages.list(),
        api.fbApps.list()
      ]);
      setFanpages(fanpagesData);
      setFbApps(fbAppsData);
    } catch (err) { console.error('Bootstrap Error', err); }
  }, [token, api]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // [OAUTH-OBSERVER] Listen for Facebook Auth results from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('Facebook Connection Success:', event.data.payload);
        fetchData(); // Automatically refresh fanpages list
      } else if (event.data?.type === 'FACEBOOK_AUTH_ERROR') {
        alert('Facebook Error: ' + event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchData]);

  const handleConnectFacebook = useCallback(async (fbAppRecordId?: string) => {
    try {
      // [REDIRECT-TO-SETTINGS] If no apps configured, go to settings instead of modal
      if (fbApps.length === 0) {
        setActiveTab('settings');
        return;
      }

      if (!fbAppRecordId && fbApps.length > 1) { setShowAppPicker(true); return; }
      const actualId = fbAppRecordId || (fbApps.length === 1 ? fbApps[0].id : undefined);

      const origin = encodeURIComponent(window.location.origin);
      let url = `/api/auth/facebook/url?origin=${origin}&token=${token}`;
      if (actualId) url += `&fbAppRecordId=${actualId}`;

      const res = await api.fetch(url);
      const data = await res.json();

      if (!res.ok) {
        if (data.requires_config) { setActiveTab('settings'); return; }
        throw new Error(data.error);
      }

      const { url: authUrl } = data;
      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(authUrl, 'facebook_oauth', `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`);
      setShowAppPicker(false);
    } catch (err: any) { alert(err.message || 'Connect Error'); }
  }, [fbApps, token, authFetch]);

  const handleTabChange = (tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
      setPreSelectedFanpageId(undefined);
    });
  };

  // [rerender-memo] - Memoize view rendering
  const content = useMemo(() => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView api={api} />;
      case 'fanpages': return <FanpageView fanpages={fanpages} onConnect={() => handleConnectFacebook()} onConfigure={(id) => { setPreSelectedFanpageId(id); handleTabChange('automation'); }} api={api} />;
      case 'automation': return <AutomationView fanpages={fanpages} api={api} initialFanpageId={preSelectedFanpageId} />;
      case 'ai-content': return <AIContentView fanpages={fanpages} api={api} />;
      case 'history': return <HistoryView api={api} />;
      case 'admin': return user?.role === 'admin' ? <AdminView api={api} /> : <DashboardView api={api} />;
      case 'settings': return <SettingsView api={api} />;
      case 'planner': return <CampaignPlannerView api={api} />;
      default: return null;
    }
  }, [activeTab, api, fanpages, handleConnectFacebook, preSelectedFanpageId, user?.role]);

  const navItems = useMemo(() => GET_NAV_ITEMS(t, user?.role), [t, user?.role]);

  if (!token) return <AuthView onLogin={handleLogin} />;
  
  if (user?.requirePasswordChange) {
    return <ForcePasswordChangeView api={api} user={user} onSuccess={(updatedUser) => setUser(updatedUser)} />;
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configAppId || !configAppSecret) return;
    setConfigLoading(true);
    setConfigError('');
    try {
      await api.fbApps.create({ appId: configAppId, appSecret: configAppSecret });
      await fetchData();
      setShowConfigModal(false);
      setConfigAppId('');
      setConfigAppSecret('');
      handleConnectFacebook(); // Retry connection
    } catch (err: any) {
      setConfigError(err.message || 'Config Error');
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans selection:bg-emerald-500/30">
      <aside className={`bg-slate-950 text-slate-400 transition-all duration-300 flex flex-col fixed h-full z-[100] border-r border-slate-900 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
          {isSidebarOpen ? <span className="text-slate-50 font-black text-[10px] uppercase tracking-[0.4em]">Neural Ops</span> : null}
          <button onClick={() => setIsSidebarOpen(prev => !prev)} className="p-2.5 hover:bg-slate-900 rounded-xl transition-all mx-auto text-slate-500 hover:text-slate-300"><Menu size={16} /></button>
        </div>

        <nav className="flex-1 py-10 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon, isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => handleTabChange(item.id)} className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all relative group ${isActive ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-900/50 text-slate-500 hover:text-slate-300'} ${!isSidebarOpen ? 'justify-center' : 'space-x-3'}`}>
                {isActive && <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'group-hover:text-slate-300 transition-colors'} />
                {isSidebarOpen ? <span className={`font-bold text-[10px] uppercase tracking-widest ${isActive ? 'text-slate-50' : ''}`}>{item.label}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-900 space-y-4">
           <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className={`w-full flex items-center p-3 rounded-xl border border-slate-800 hover:bg-slate-900 transition-all ${!isSidebarOpen ? 'justify-center' : 'space-x-3'}`}>
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-base">{language === 'en' ? '🇺🇸' : '🇻🇳'}</div>
              {isSidebarOpen ? <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest transition-colors">{language === 'en' ? 'ENG' : 'VIE'}</p> : null}
           </button>
           <div className="flex items-center justify-between px-1">
              {isSidebarOpen ? (
                <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-500">{user?.name?.charAt(0) || 'U'}</div>
                   <div className="max-w-[100px]"><p className="text-[9px] font-bold text-slate-200 uppercase tracking-tight truncate">{user?.name || 'User'}</p></div>
                </div>
              ) : <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-emerald-500 mx-auto">{user?.name?.charAt(0) || 'U'}</div>}
              {isSidebarOpen ? <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><LogOut size={14} /></button> : null}
           </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 flex items-center justify-between px-10 sticky top-0 z-50">
           <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <h1 className="text-[10px] font-bold uppercase text-slate-50 tracking-[0.3em]">{navItems.find(i => i.id === activeTab)?.label}</h1>
              {isPending ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : null}
           </div>
           <div className="flex items-center gap-6">
              <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800 flex items-center px-4 gap-3 focus-within:border-emerald-500/30 transition-all">
                <Search size={14} className="text-slate-600" /> 
                <input type="text" className="bg-transparent text-[10px] font-bold outline-none w-44 text-slate-200 placeholder:text-slate-700" placeholder="Neural Search..." />
              </div>
              <button className="text-slate-600 hover:text-slate-300 transition-colors"><Bell size={16} /></button>
           </div>
        </header>

        <div className={`p-8 lg:p-10 flex-1 bg-slate-950 transition-all duration-500 ${isPending ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}>
          {content}
        </div>
      </main>

      {/* Modals */}
      {showAppPicker ? (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[200] p-6 text-white overflow-y-auto">
           <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 max-w-sm w-full animate-in zoom-in-95 duration-200 shadow-3xl">
              <h3 className="text-lg font-bold uppercase text-slate-50 mb-8 tracking-tight">Strategic Bridge</h3>
              <div className="space-y-3">
                 {fbApps.map(app => (
                    <button key={app.id} onClick={() => handleConnectFacebook(app.id)} className="w-full flex items-center justify-between p-6 bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-2xl border border-slate-700 transition-all font-bold text-[10px] uppercase tracking-widest">{app.name} <Plus size={14} /></button>
                 ))}
                 <button onClick={() => setShowAppPicker(false)} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-6 hover:text-slate-300 transition-colors uppercase">{t('cancel')}</button>
              </div>
           </div>
        </div>
      ) : null}

      {showConfigModal ? (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[200] p-6 text-white overflow-y-auto">
           <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 max-w-md w-full animate-in zoom-in-95 duration-200 shadow-3xl">
              <div className="flex justify-between items-center mb-10 px-2 text-white">
                 <h3 className="text-lg font-bold uppercase text-slate-50 tracking-tight">System Auth</h3>
                 <button onClick={() => setShowConfigModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveConfig} className="space-y-6">
                 <div className="space-y-3 px-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block ml-2">Application Hub ID</label>
                    <input 
                      type="text" 
                      required
                      value={configAppId}
                      onChange={(e) => setConfigAppId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all" 
                      placeholder="Facebook App ID"
                    />
                 </div>
                 <div className="space-y-3 px-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block ml-2">Application Hub Secret</label>
                    <input 
                      type="password" 
                      required
                      value={configAppSecret}
                      onChange={(e) => setConfigAppSecret(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all" 
                      placeholder="Facebook App Secret"
                    />
                 </div>
                 {configError && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl text-center">{configError}</div>}
                 <button 
                  type="submit"
                  disabled={configLoading}
                  className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                   {configLoading ? t('loading') : 'Authorize Node'}
                </button>
              </form>
           </div>
        </div>
      ) : null}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 2px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`}</style>
    </div>
  );
}
