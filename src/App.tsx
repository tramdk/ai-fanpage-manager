import React, { useState, useCallback, useEffect, useTransition, useMemo } from 'react';
import {
  LayoutDashboard, Facebook, Settings, Search, Menu,
  History, User as UserIcon, Clock, Bot, LogOut,
  Plus, X, Sparkles, Loader2, Workflow, Sun, Moon, CheckCircle2, ListChecks,
  ChevronDown, HelpCircle, Laptop
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { CONFIG } from './config';
import { useApiService } from './hooks/useApiService';
import { Toaster, toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = useMemo(() => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  }, [location.pathname]);

  const [isPending, startTransition] = useTransition();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(CONFIG.getApiUrl(url), {
      credentials: 'same-origin',
      ...options,
      headers
    } as any);
  }, []);

  const api = useApiService(authFetch);

  const handleLogout = useCallback(() => {
    setUser(null); setFanpages([]);
    fetch(CONFIG.getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const userData = await api.users.getMe();
      setUser(userData);
      
      const [fanpagesData, fbAppsData] = await Promise.all([
        api.fanpages.list(),
        api.fbApps.list()
      ]);
      setFanpages(fanpagesData);
      setFbApps(fbAppsData);
    } catch (err: any) {
      console.warn('Bootstrap Error:', err?.message || 'Unknown Error');
      setUser(null);
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        handleLogout();
      }
    } finally {
      setLoadingAuth(false);
    }
  }, [api, handleLogout]);

  const handleLogin = useCallback((userData: any) => {
    setUser(userData);
    fetchData();
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // [OAUTH-OBSERVER] Listen for Facebook Auth results from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('[App.tsx] Received postMessage:', event.data);
      if (event.data?.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('🚀 Facebook Connection Success Message Received:', event.data.payload);
        toast.success(t('connectSuccess') || 'Kết nối Fanpage thành công!');
        fetchData(); 
      } else if (event.data?.type === 'FACEBOOK_AUTH_ERROR') {
        console.error('❌ Facebook Connection Error Message Received:', event.data.error);
        toast.error('Facebook Connection Error: ' + event.data.error);
      }
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true') {
      toast.success('Authentication completed successfully.');
      fetchData();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchData, t]);

  const handleConnectFacebook = useCallback(async (fbAppRecordId?: string) => {
    try {
      if (fbApps.length === 0) {
        navigate('/settings');
        return;
      }

      if (!fbAppRecordId && fbApps.length > 1) { setShowAppPicker(true); return; }
      const actualId = fbAppRecordId || (fbApps.length === 1 ? fbApps[0].id : undefined);

      const origin = encodeURIComponent(window.location.origin);
      let url = `/api/auth/facebook/url?origin=${origin}`;
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
  }, [fbApps, api, navigate]);

  const handleTabChange = (tabId: string) => {
    const item = navItems.find(i => i.id === tabId);
    if (item) {
      startTransition(() => {
        navigate(item.path);
        setPreSelectedFanpageId(undefined);
      });
    }
  };
  const navItems = useMemo(() => GET_NAV_ITEMS(t, user?.role), [t, user?.role]);

  const navSections = useMemo(() => {
    const filteredItems = navItems.filter(item => item.id !== 'settings');
    const analyzeIds = ['dashboard', 'history'];
    const aiIds = ['studio', 'strategy', 'ai-content', 'video-queue'];
    
    return [
      {
        title: 'ANALYZE',
        items: filteredItems.filter(item => analyzeIds.includes(item.id))
      },
      {
        title: 'AI CREATIVE',
        items: filteredItems.filter(item => aiIds.includes(item.id))
      },
      {
        title: 'MANAGE',
        items: filteredItems.filter(item => !analyzeIds.includes(item.id) && !aiIds.includes(item.id))
      }
    ];
  }, [navItems]);

  if (loadingAuth) {
    return (
      <div className="min-h-[100dvh] bg-[#f9fafb] dark:bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-[10px] font-mono font-extrabold text-zinc-400 uppercase tracking-widest">Checking Authorization...</p>
      </div>
    );
  }

  if (!user) {
    const isResetPath = location.pathname === '/reset-password';
    
    return (
      <>
        <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
        <React.Suspense fallback={<div className="min-h-[100dvh] bg-[#f9fafb] dark:bg-[#09090b] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
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
    <div className="h-screen overflow-hidden bg-[#f9fafb] dark:bg-[#09090b] flex font-sans selection:bg-blue-500/10 p-0 gap-0 relative transition-colors duration-300">
      <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — Premium Sleek Left Navigation */}
      <aside 
        className={`
        h-full transition-all duration-300 z-[100] flex flex-col overflow-hidden shrink-0
        border-r border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] py-6 px-4
        ${isMobileMenuOpen 
          ? 'fixed top-0 left-0 bottom-0 shadow-2xl translate-x-0 w-[240px] flex' 
          : 'fixed -translate-x-full lg:relative lg:translate-x-0 w-0 lg:w-[240px] lg:flex invisible lg:visible opacity-0 lg:opacity-100'}
      `}>
        
        {/* User Profile Card */}
        <div className="flex items-center justify-between mb-8 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 hover:scale-[1.01] transition-all cursor-pointer group">
          <div className="flex items-center min-w-0 gap-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=3b82f6&color=fff&size=36&bold=true&font-size=0.4`}
              alt="user avatar"
              className="w-9 h-9 rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate leading-tight">{user?.name || 'User'}</h2>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{user?.email || 'admin@floral.com'}</p>
            </div>
          </div>
          <ChevronDown size={12} className="text-zinc-400 shrink-0 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* Navigation — Grouped by Monospace Section Labels */}
        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
          {navSections.map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.title} className="space-y-1">
                <h3 className="text-[9px] font-mono font-extrabold tracking-[2px] text-zinc-400 px-3 mb-2">
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleTabChange(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center transition-all duration-200 group relative px-3 py-2.5 rounded-xl space-x-3 active:scale-[0.98]
                          ${isActive
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-500/10'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 font-semibold'}
                        `}
                      >
                        <div className="flex-shrink-0">
                          <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors'} />
                        </div>
                        <span className="text-xs truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-900 space-y-1 shrink-0">
          <button
            onClick={() => {
              navigate('/settings');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center transition-all duration-200 px-3 py-2.5 rounded-xl space-x-3 active:scale-[0.98]
              ${activeTab === 'settings'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-500/10'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 font-semibold'}
            `}
          >
            <Settings size={16} strokeWidth={activeTab === 'settings' ? 2.5 : 1.8} className="text-zinc-400" />
            <span className="text-xs">{t('settings')}</span>
          </button>

          <div className="flex items-center px-3 py-2.5 rounded-xl space-x-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-all cursor-pointer font-semibold active:scale-[0.98]">
            <HelpCircle size={16} strokeWidth={1.8} className="text-zinc-400" />
            <span className="text-xs">Help Center</span>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Sleek App Header */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-[#09090b] border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all shrink-0 active:scale-95"
            >
               <Menu size={16} />
            </button>
            <div className="relative w-full max-w-sm sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('searching')}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 pl-10 pr-4 text-xs font-semibold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Quick Config widgets */}
          <div className="flex items-center gap-2.5 ml-4 shrink-0">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              className="h-9 px-3.5 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all gap-1.5 active:scale-95"
            >
              <span>{language === 'en' ? 'EN' : 'VI'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/5 transition-all active:scale-95"
              title={t('logout') || 'Đăng xuất'}
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Dynamic Route Container */}
        <div className={`flex-1 transition-opacity duration-300 overflow-y-auto custom-scrollbar p-6 sm:p-8 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          <AppRoutes
            api={api}
            fanpages={fanpages}
            handleConnectFacebook={handleConnectFacebook}
            preSelectedFanpageId={preSelectedFanpageId}
            setPreSelectedFanpageId={setPreSelectedFanpageId}
            user={user}
            navigate={navigate}
            t={t}
          />
        </div>
      </div>

      {/* App Connection Picker Dialog */}
      <Dialog open={showAppPicker} onOpenChange={setShowAppPicker}>
         <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
            <DialogHeader className="sr-only">
               <DialogTitle>{t('connectNewPage')}</DialogTitle>
               <DialogDescription>{t('chooseAppBridge')}</DialogDescription>
            </DialogHeader>
            <div className="relative w-full rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 sm:p-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
               <Button onClick={() => setShowAppPicker(false)} variant="ghost" size="icon" className="absolute top-6 right-6 w-9 h-9 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-all">
                  <X size={16} />
               </Button>
               <div className="mb-8 text-center">
                 <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 rounded-2xl">
                   <Facebook size={26} className="fill-current" />
                 </div>
                 <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">{t('connectNewPage')}</h3>
                 <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mt-1.5">{t('chooseAppBridge')}</p>
               </div>
               <div className="space-y-3">
                 {fbApps.map(app => (
                   <button
                     key={app.id}
                     onClick={() => handleConnectFacebook(app.id)}
                     className="w-full flex items-center justify-between p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl hover:border-blue-500/30 hover:bg-blue-500/5 text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all group active:scale-[0.99]"
                   >
                     <div className="text-left">
                       <p className="text-[10px] font-bold uppercase tracking-wider">{app.name}</p>
                       <p className="text-[9px] text-zinc-400 font-mono mt-1">APP ID: {app.appId}</p>
                     </div>
                     <Plus size={16} className="group-hover:rotate-90 transition-transform text-blue-600 dark:text-blue-400" />
                   </button>
                 ))}
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}

// --- APP ROUTES COMPONENT ---
interface AppRoutesProps {
  api: any;
  fanpages: Fanpage[];
  handleConnectFacebook: (fbAppRecordId?: string) => Promise<void>;
  preSelectedFanpageId?: string;
  setPreSelectedFanpageId: React.Dispatch<React.SetStateAction<string | undefined>>;
  user: User | null;
  navigate: ReturnType<typeof useNavigate>;
  t: (key: string) => string;
}

const AppRoutes = React.memo(function AppRoutes({
  api,
  fanpages,
  handleConnectFacebook,
  preSelectedFanpageId,
  setPreSelectedFanpageId,
  user,
  navigate,
  t
}: AppRoutesProps) {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center h-96 space-y-4 text-zinc-400 animate-pulse">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest">{t('optimizing')}</p>
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
});
