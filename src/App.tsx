import React, { useState, useCallback, useEffect, useTransition, useMemo } from 'react';
import {
  LayoutDashboard, Facebook, Settings, Bell, Search, Menu,
  Activity, History, User as UserIcon, Clock, Bot, LogOut,
  Plus, X, Sparkles, Loader2, Workflow, Sun, Moon, CheckCircle2, ListChecks
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
const ApprovalsView = React.lazy(() => import('./features/approvals/ApprovalsView').then(m => ({ default: m.ApprovalsView })));
const SettingsView = React.lazy(() => import('./features/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const AuthView = React.lazy(() => import('./features/auth/AuthView').then(m => ({ default: m.AuthView })));
const CampaignStudioView = React.lazy(() => import('./features/studio/CampaignStudioView').then(m => ({ default: m.CampaignStudioView })));
const StrategyWorkflowView = React.lazy(() => import('./features/strategy/StrategyWorkflowView'));
const ForcePasswordChangeView = React.lazy(() => import('./features/auth/ForcePasswordChangeView').then(m => ({ default: m.ForcePasswordChangeView })));
const VideoQueueView = React.lazy(() => import('./features/ai-studio/VideoQueueView'));
const ResetPasswordView = React.lazy(() => import('./features/auth/ResetPasswordView').then(m => ({ default: m.ResetPasswordView })));

// [rerender-memo-with-default-value] - Hoist static constants outside component
const GET_NAV_ITEMS = (t: any, role?: string) => [
  { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, path: '/dashboard' },
  { id: 'fanpages', label: t('fanpages'), icon: Facebook, path: '/fanpages' },
  { id: 'automation', label: t('automation'), icon: Clock, path: '/automation' },
  { id: 'studio', label: t('studio'), icon: Sparkles, path: '/studio' },
  { id: 'strategy', label: t('strategy'), icon: Workflow, path: '/strategy' },
  { id: 'ai-content', label: t('aiContent'), icon: Bot, path: '/ai-content' },
  { id: 'video-queue', label: 'Video Queue', icon: ListChecks, path: '/video-queue' },
  { id: 'approvals', label: t('approvals'), icon: CheckCircle2, path: '/approvals' },
  { id: 'history', label: t('history'), icon: History, path: '/history' },
  ...(role === 'admin' ? [{ id: 'admin', label: t('admin'), icon: UserIcon, path: '/admin' }] : []),
  { id: 'settings', label: t('settings'), icon: Settings, path: '/settings' },
];

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = useMemo(() => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  }, [location.pathname]);

  const [isPending, startTransition] = useTransition();

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'dark');
  
  // Handle resize for sidebar defaults (Mobile only)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      console.log('[App.tsx] Received postMessage:', event.data);
      // Validate origin if needed, but for now we accept from our own popup
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('🚀 Facebook Connection Success Message Received:', event.data.payload);
        toast.success(t('connectSuccess') || 'Kết nối Fanpage thành công!');
        fetchData(); // Automatically refresh fanpages list
      } else if (event.data?.type === 'FACEBOOK_AUTH_ERROR') {
        console.error('❌ Facebook Connection Error Message Received:', event.data.error);
        toast.error('Facebook Error: ' + event.data.error);
      }
    };
    
    // Fallback check for redirect-based success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true') {
      toast.success('Authentication completed via redirect.');
      fetchData();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchData, t]);

  const handleConnectFacebook = useCallback(async (fbAppRecordId?: string) => {
    try {
      // [REDIRECT-TO-SETTINGS] If no apps configured, go to settings instead of modal
      if (fbApps.length === 0) {
        navigate('/settings');
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
        if (data.requires_config) { navigate('/settings'); return; }
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

  const handleTabChange = (tabId: string) => {
    const item = navItems.find(i => i.id === tabId);
    if (item) {
      startTransition(() => {
        navigate(item.path);
        setPreSelectedFanpageId(undefined);
      });
    }
  };

  // [rerender-memo] - Memoize view rendering
  const content = useMemo(() => {
    return (
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-96 space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em]">{t('optimizing')}</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView api={api} onViewLog={() => navigate('/history')} />} />
          <Route path="/fanpages" element={<FanpageView fanpages={fanpages} onConnect={() => handleConnectFacebook()} onConfigure={(id) => { setPreSelectedFanpageId(id); navigate('/automation'); }} api={api} />} />
          <Route path="/strategy" element={<StrategyWorkflowView api={api} fanpages={fanpages} />} />
          <Route path="/automation" element={<AutomationView fanpages={fanpages} api={api} initialFanpageId={preSelectedFanpageId} />} />
          <Route path="/ai-content" element={<AIContentView fanpages={fanpages} api={api} />} />
          <Route path="/video-queue" element={<VideoQueueView api={api} />} />
          <Route path="/approvals" element={<ApprovalsView api={api} />} />
          <Route path="/history" element={<HistoryView api={api} />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminView api={api} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<SettingsView api={api} />} />
          <Route path="/studio" element={<CampaignStudioView api={api} />} />
          <Route path="/planner" element={<CampaignStudioView api={api} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </React.Suspense>
    );
  }, [api, fanpages, handleConnectFacebook, preSelectedFanpageId, user?.role, navigate, t]);

  const navItems = useMemo(() => GET_NAV_ITEMS(t, user?.role), [t, user?.role]);

  if (!token) {
    const isResetPath = location.pathname === '/reset-password';
    
    return (
      <>
        <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
        <React.Suspense fallback={<div className="min-h-screen bg-app-bg flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordView api={api} onSuccess={() => navigate('/')} />} />
            <Route path="*" element={<AuthView onLogin={handleLogin} />} />
          </Routes>
        </React.Suspense>
      </>
    );
  }

  if (user?.requirePasswordChange) {
    return (
      <>
        <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
        <ForcePasswordChangeView api={api} user={user} onSuccess={(updatedUser) => setUser(updatedUser)} />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-app-bg flex font-sans selection:bg-soft-blue/30 p-2 sm:p-4 lg:p-6 gap-4 relative">
      <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Width for Desktop, Overlay for Mobile */}
      <aside 
        className={`
        nm-sidebar h-[calc(100vh-16px)] sm:h-full transition-all duration-500 z-[100] flex flex-col overflow-hidden
        ${isMobileMenuOpen 
          ? 'fixed top-2 left-2 bottom-2 shadow-2xl translate-x-0 w-64 p-4 flex' 
          : 'fixed -translate-x-full lg:relative lg:translate-x-0 w-0 lg:w-64 lg:p-4 lg:flex invisible lg:visible opacity-0 lg:opacity-100'}
      `}>
        <div className="h-16 flex items-center justify-between mb-6 px-2">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-soft-blue to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <div className="w-48 ml-4 transition-all duration-500">
              <h1 className="text-xl sm:text-2xl font-black text-text-primary leading-none tracking-tight truncate">TDK AI</h1>
              <p className="text-[10px] font-semibold text-text-muted mt-1.5 truncate">AI Content Manager</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-text-muted hover:text-soft-pink lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 sm:space-y-4 px-1 sm:px-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isExpanded = true; // Always expanded on desktop now
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center transition-all duration-300 group relative p-3 rounded-xl
                  ${isActive
                    ? 'nm-button-active text-white font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}
                  space-x-3
                `}
              >
                <div className="flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div className="w-48 opacity-100 transition-all duration-500 overflow-hidden whitespace-nowrap">
                  <span className="text-sm font-semibold tracking-tight">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="pt-6 sm:pt-8 mt-auto border-t border-text-muted/10">
          <button onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')} className="w-full flex items-center p-2.5 bg-white/5 border border-white/10 rounded-xl hover:scale-[1.02] transition-all mb-4 space-x-3">
            <div className="w-7 h-7 rounded-lg bg-app-bg flex items-center justify-center text-base shrink-0 shadow-inner">{language === 'en' ? '🇺🇸' : '🇻🇳'}</div>
            <div className="w-40 opacity-100 transition-all duration-500 overflow-hidden whitespace-nowrap">
              <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest">{language === 'en' ? 'English' : 'Tiếng Việt'}</p>
            </div>
          </button>
          
          <div className="bg-black/20 backdrop-blur-md transition-all duration-500 rounded-[20px] sm:rounded-[24px] p-3 sm:p-5 space-y-3 sm:space-y-5">
            <div className="flex items-center gap-3 sm:gap-4 transition-all duration-500 overflow-hidden">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg font-bold text-xs sm:text-base shrink-0">{user?.name?.charAt(0) || 'U'}</div>
              <div className="flex-1 min-w-0 opacity-100 transition-all duration-500">
                <p className="text-xs sm:text-sm font-bold text-text-primary truncate">{user?.name || 'User'}</p>
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">{user?.role === 'admin' ? t('admin') : 'User'}</p>
              </div>
              <button onClick={handleLogout} className="text-text-muted hover:text-soft-pink transition-colors shrink-0"><LogOut size={16} /></button>
            </div>
            <div className="max-h-20 opacity-100 transition-all duration-500 overflow-hidden">
              <button className="w-full bg-gradient-to-r from-soft-blue to-indigo-600 text-white py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold tracking-wide shadow-lg hover:brightness-110 transition-all mt-2">
                {t('upgrade')}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 sm:h-24 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 sm:gap-12 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue transition-all shrink-0"
            >
               <Menu size={20} />
            </button>
            <div className="relative group w-full max-w-sm sm:max-w-xl">
              <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder={t('searching')}
                className="nm-input pl-10 sm:pl-16 py-2 sm:py-4 text-[10px] sm:text-sm font-medium text-text-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-8 ml-4 shrink-0">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 sm:w-14 sm:h-14 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue transition-all"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="w-10 h-10 sm:w-14 sm:h-14 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue transition-all hidden xs:flex">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <div className={`flex-1 transition-all duration-500 overflow-y-auto custom-scrollbar p-4 sm:p-0 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
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
              <h3 className="text-2xl font-black text-text-primary tracking-tight">{t('connectNewPage')}</h3>
              <p className="text-xs font-bold text-text-secondary mt-2">{t('chooseAppBridge')}</p>
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
                    <p className="text-[9px] text-text-secondary mt-1">APP ID: {app.appId}</p>
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
