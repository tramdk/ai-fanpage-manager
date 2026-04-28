import React, { useState, useCallback, useEffect, useTransition, useMemo } from 'react';
import {
  LayoutDashboard, Facebook, Settings, Bell, Search, Menu,
  Activity, History, User as UserIcon, Clock, Bot, LogOut,
  Plus, X, Sparkles, Loader2, Workflow, Sun, Moon
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { CONFIG } from './config';
import { useApiService } from './hooks/useApiService';
import { Toaster, toast } from 'sonner';

// --- TYPES ---
import { User, Fanpage, AuthFetch } from './types';

// --- COMPONENT MAP (Lazy Loading) ---
const DashboardView = React.lazy(() => import('./features/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const FanpageView = React.lazy(() => import('./features/fanpages/FanpageView').then(m => ({ default: m.FanpageView })));
const AutomationView = React.lazy(() => import('./features/automation/AutomationView').then(m => ({ default: m.AutomationView })));
const AIContentView = React.lazy(() => import('./features/ai-studio/AIContentView').then(m => ({ default: m.AIContentView })));
const HistoryView = React.lazy(() => import('./features/history/HistoryView').then(m => ({ default: m.HistoryView })));
const AdminView = React.lazy(() => import('./features/admin/AdminView').then(m => ({ default: m.AdminView })));
const SettingsView = React.lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const AuthView = React.lazy(() => import('./features/auth/AuthView').then(m => ({ default: m.AuthView })));
const CampaignStudioView = React.lazy(() => import('./features/studio/CampaignStudioView').then(m => ({ default: m.CampaignStudioView })));
const StrategyWorkflowView = React.lazy(() => import('./features/strategy/StrategyWorkflowView'));
const ForcePasswordChangeView = React.lazy(() => import('./features/auth/ForcePasswordChangeView').then(m => ({ default: m.ForcePasswordChangeView })));

// [rerender-memo-with-default-value] - Hoist static constants outside component
const GET_NAV_ITEMS = (t: any, role?: string) => [
  { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
  { id: 'fanpages', label: t('fanpages'), icon: Facebook },
  { id: 'automation', label: t('automation'), icon: Clock },
  { id: 'studio', label: 'Campaign Studio', icon: Sparkles },
  { id: 'strategy', label: 'Strategy Workflow', icon: Workflow },
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'dark');
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

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // [async-parallel] - Parallelize initial bootstrap fetches
      const [userData, fanpagesData, fbAppsData] = await Promise.all([
        api.users.getMe(),
        api.fanpages.list(),
        api.fbApps.list()
      ]);
      setUser(userData);
      setFanpages(fanpagesData);
      setFbApps(fbAppsData);
    } catch (err: any) {
      console.warn('Bootstrap Error:', err?.message || 'Unknown Error');
      // If unauthorized or forbidden, logout
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        handleLogout();
      }
    }
  }, [token, api, handleLogout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // [OAUTH-OBSERVER] Listen for Facebook Auth results from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('Facebook Connection Success:', event.data.payload);
        fetchData(); // Automatically refresh fanpages list
      } else if (event.data?.type === 'FACEBOOK_AUTH_ERROR') {
        toast.error('Facebook Error: ' + event.data.error);
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
    } catch (err: any) { toast.error(err.message || 'Connect Error'); }
  }, [fbApps, token, authFetch]);

  const handleTabChange = (tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
      setPreSelectedFanpageId(undefined);
    });
  };

  // [rerender-memo] - Memoize view rendering
  const content = useMemo(() => {
    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-96 space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em]">Optimizing Neural Bridge...</p>
        </div>
      }>
        {(() => {
          switch (activeTab) {
            case 'dashboard': return <DashboardView api={api} onViewLog={() => handleTabChange('history')} />;
            case 'fanpages': return <FanpageView fanpages={fanpages} onConnect={() => handleConnectFacebook()} onConfigure={(id) => { setPreSelectedFanpageId(id); handleTabChange('automation'); }} api={api} />;
            case 'automation': return <AutomationView fanpages={fanpages} api={api} initialFanpageId={preSelectedFanpageId} />;
            case 'ai-content': return <AIContentView fanpages={fanpages} api={api} />;
            case 'history': return <HistoryView api={api} />;
            case 'admin': return user?.role === 'admin' ? <AdminView api={api} /> : <DashboardView api={api} onViewLog={() => handleTabChange('history')} />;
            case 'settings': return <SettingsView api={api} />;
            case 'studio': return <CampaignStudioView api={api} />;
            case 'planner': return <CampaignStudioView api={api} />;
            case 'strategy': return <StrategyWorkflowView api={api} />;
            default: return null;
          }
        })()}
      </React.Suspense>
    );
  }, [activeTab, api, fanpages, handleConnectFacebook, preSelectedFanpageId, user?.role]);

  const navItems = useMemo(() => GET_NAV_ITEMS(t, user?.role), [t, user?.role]);

  if (!token) return <AuthView onLogin={handleLogin} />;

  if (user?.requirePasswordChange) {
    return <ForcePasswordChangeView api={api} user={user} onSuccess={(updatedUser) => setUser(updatedUser)} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-app-bg flex font-sans selection:bg-soft-blue/30 p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 lg:gap-8">
      <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />

      {/* Sidebar - Auto-collapses on small heights/widths if possible, but keep current toggle logic */}
      <aside className={`nm-sidebar h-full transition-all duration-500 z-[100] flex flex-col p-4 sm:p-6 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="h-16 sm:h-20 flex items-center px-2 sm:px-4 mb-6 sm:mb-10">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-soft-blue rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
            <Bot size={20} className="text-white" />
          </div>
          {isSidebarOpen && (
            <div className="ml-4 truncate">
              <h1 className="text-xl sm:text-2xl font-black text-text-primary leading-none tracking-tight truncate">TDK AI</h1>
              <p className="text-[10px] font-semibold text-text-muted mt-1.5 truncate">Management Engine</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 sm:space-y-4 px-1 sm:px-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center transition-all duration-300 group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl
                  ${isActive
                    ? 'nm-button-active text-soft-blue font-bold'
                    : 'text-text-secondary hover:text-text-primary'}
                  ${!isSidebarOpen ? 'justify-center' : 'space-x-4 sm:space-x-5'}
                `}
              >
                <Icon size={isSidebarOpen ? 20 : 22} />
                {isSidebarOpen && <span className="text-sm font-semibold tracking-tight truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 sm:pt-8 mt-auto border-t border-text-muted/10">
          <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className={`w-full flex items-center p-2.5 nm-flat-sm hover:scale-[1.02] transition-all mb-4 sm:mb-8 ${!isSidebarOpen ? 'justify-center' : 'space-x-3 sm:space-x-4'}`}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-app-bg nm-inset flex items-center justify-center text-base sm:text-lg">{language === 'en' ? '🇺🇸' : '🇻🇳'}</div>
            {isSidebarOpen && <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest">{language === 'en' ? 'English' : 'Tiếng Việt'}</p>}
          </button>

          <div className="nm-inset p-3 sm:p-5 space-y-3 sm:space-y-5 rounded-[20px] sm:rounded-[24px]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-app-bg nm-inset flex items-center justify-center text-soft-blue shadow-sm font-bold text-xs sm:text-base">{user?.name?.charAt(0) || 'U'}</div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-text-primary truncate">{user?.name || 'User'}</p>
                  <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Admin</p>
                </div>
              )}
              {isSidebarOpen && <button onClick={handleLogout} className="text-text-muted hover:text-soft-pink transition-colors"><LogOut size={16} /></button>}
            </div>
            {isSidebarOpen && (
              <button className="w-full bg-soft-blue text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-wide shadow-lg hover:brightness-110 transition-all">
                Upgrade
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 sm:gap-8 min-w-0">
        <header className="h-16 sm:h-24 flex items-center justify-between px-2 sm:px-4">
          <div className="flex items-center gap-4 sm:gap-12 flex-1 min-w-0">
            <div className="relative group w-full max-w-xl">
              <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search..."
                className="nm-input pl-10 sm:pl-16 py-2.5 sm:py-4 text-xs sm:text-sm font-medium text-text-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-8 ml-4">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 sm:w-14 sm:h-14 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue transition-all"
            >
              {theme === 'light' ? <Moon size={18} sm:size={22} /> : <Sun size={18} sm:size={22} />}
            </button>
            <button className="w-10 h-10 sm:w-14 sm:h-14 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue transition-all hidden xs:flex">
              <Bell size={18} sm:size={22} />
            </button>
          </div>
        </header>

        <div className={`flex-1 transition-all duration-500 overflow-y-auto custom-scrollbar pr-4 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          {content}
        </div>
      </div>

      {/* Modals - Adapted for Neumorphism */}
      {showAppPicker && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[200] p-6">
          <div className="nm-flat p-12 max-w-md w-full animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setShowAppPicker(false)} className="absolute top-8 right-8 text-text-muted hover:text-text-primary transition-colors"><X size={24} /></button>
            <div className="mb-10 text-center">
              <div className="w-16 h-16 nm-flat text-soft-blue flex items-center justify-center mx-auto mb-6">
                <Facebook size={32} />
              </div>
              <h3 className="text-2xl font-black text-text-primary tracking-tight">Strategic Bridge</h3>
              <p className="text-xs font-bold text-text-secondary mt-2">Connect your application endpoint</p>
            </div>
            <div className="space-y-4">
              {fbApps.map(app => (
                <button
                  key={app.id}
                  onClick={() => handleConnectFacebook(app.id)}
                  className="w-full flex items-center justify-between p-6 nm-button hover:text-soft-blue group"
                >
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest">{app.name}</p>
                    <p className="text-[9px] text-text-secondary mt-1">ENDPOINT ID: {app.appId}</p>
                  </div>
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
