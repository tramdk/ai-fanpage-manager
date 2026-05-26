import React, { useState, useCallback, useEffect, useTransition, useMemo } from 'react';
import {
  LayoutDashboard, Facebook, Settings, Bell, Search, Menu,
  Activity, History, User as UserIcon, Clock, Bot, LogOut,
  Plus, X, Sparkles, Loader2, Workflow, Sun, Moon, CheckCircle2, ListChecks,
  ChevronDown, HelpCircle
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  
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
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(CONFIG.getApiUrl(url), {
      credentials: 'same-origin',
      ...options,
      headers
    } as any);
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
    fetch(CONFIG.getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'same-origin' }).catch(() => {});
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
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
    <div className="h-screen overflow-hidden bg-app-bg flex font-sans selection:bg-blue-500/10 p-0 gap-0 relative transition-colors duration-300">
      <Toaster position="top-right" expand={true} richColors theme={theme === 'dark' ? 'dark' : 'light'} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-[90] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — Clean Minimal Flat */}
      <aside 
        className={`
        h-full transition-all duration-300 z-[100] flex flex-col overflow-hidden shrink-0
        border-r border-[#D1D5DB] dark:border-white/12 bg-white dark:bg-[#111318] py-5 px-4
        ${isMobileMenuOpen 
          ? 'fixed top-0 left-0 bottom-0 shadow-lg translate-x-0 w-[220px] flex' 
          : 'fixed -translate-x-full lg:relative lg:translate-x-0 w-0 lg:w-[220px] lg:flex invisible lg:visible opacity-0 lg:opacity-100'}
      `}>
        
        {/* User Profile — Clean Flat */}
        <div className="flex items-center justify-between mb-6 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
          <div className="flex items-center min-w-0 gap-3">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=2563EB&color=fff&size=36&bold=true&font-size=0.4`}
              alt="avatar"
              className="w-9 h-9 rounded-full shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827] dark:text-gray-100 truncate leading-tight">{user?.name || 'User'}</h2>
              <p className="text-[12px] text-[#6B7280] dark:text-gray-400 truncate">{user?.email || 'admin@floral.com'}</p>
            </div>
          </div>
          <ChevronDown size={14} className="text-[#6B7280] dark:text-gray-400 shrink-0 group-hover:text-[#2563EB] transition-colors" />
        </div>

        {/* Navigation — Grouped by section labels */}
        <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar">
          {navSections.map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.title} className="space-y-0.5">
                <h3 className="text-[11px] font-bold tracking-[1.5px] text-[#6B7280] dark:text-gray-400 uppercase px-3 mb-2">
                  {section.title}
                </h3>
                <nav className="space-y-0.5">
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
                        className={`w-full flex items-center transition-colors duration-200 group relative px-3 py-2.5 rounded-lg space-x-3
                          ${isActive
                            ? 'bg-[#F3F4F6] dark:bg-white/8 text-[#111827] dark:text-white font-semibold'
                            : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-200 hover:bg-[#F9FAFB] dark:hover:bg-white/5 font-medium'}
                        `}
                      >
                        <div className="flex-shrink-0">
                          <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-[#111827] dark:text-white' : ''} />
                        </div>
                        <span className="text-[14px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions — Clean Flat */}
        <div className="mt-auto pt-4 border-t border-[#D1D5DB] dark:border-white/12 space-y-0.5 shrink-0">
          {/* Settings */}
          <button
            onClick={() => {
              navigate('/settings');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center transition-colors duration-200 px-3 py-2.5 rounded-lg space-x-3
              ${activeTab === 'settings'
                ? 'bg-[#F3F4F6] dark:bg-white/8 text-[#111827] dark:text-white font-semibold'
                : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-200 hover:bg-[#F9FAFB] dark:hover:bg-white/5 font-medium'}
            `}
          >
            <Settings size={18} strokeWidth={activeTab === 'settings' ? 2 : 1.5} />
            <span className="text-[14px]">{t('settings')}</span>
          </button>

          {/* Help Center style link */}
          <div className="flex items-center px-3 py-2.5 rounded-lg space-x-3 text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-gray-200 hover:bg-[#F9FAFB] dark:hover:bg-white/5 transition-colors cursor-pointer font-medium">
            <HelpCircle size={18} strokeWidth={1.5} />
            <span className="text-[14px]">Help Center</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-[#111318] border-b border-[#D1D5DB] dark:border-white/12">
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-white/5 transition-colors shrink-0"
            >
               <Menu size={18} />
            </button>
            <div className="relative w-full max-w-sm sm:max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('searching')}
                className="flex h-10 w-full rounded-lg border border-[#D1D5DB] dark:border-white/12 bg-white dark:bg-white/8 pl-10 py-2 text-[14px] font-normal text-[#111827] dark:text-gray-100 placeholder:text-[#6B7280] dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              className="h-9 px-3 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[12px] font-semibold text-[#6B7280] dark:text-gray-400 hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-white/5 transition-colors gap-1.5"
            >
              {language === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-white/5 transition-colors"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title={t('logout') || 'Đăng xuất'}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className={`flex-1 transition-opacity duration-300 overflow-y-auto custom-scrollbar p-6 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
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

      {/* Modals - Adapted for Neumorphism */}
      <Dialog open={showAppPicker} onOpenChange={setShowAppPicker}>
         <DialogContent className="max-w-md sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
            <DialogHeader className="sr-only">
               <DialogTitle>{t('connectNewPage')}</DialogTitle>
               <DialogDescription>{t('chooseAppBridge')}</DialogDescription>
            </DialogHeader>
            <div className="nm-flat p-12 w-full animate-in zoom-in-95 duration-300 relative rounded-xl">
               <Button onClick={() => setShowAppPicker(false)} variant="ghost" size="icon" className="absolute top-8 right-8 size-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-colors rounded-xl p-0 hover:bg-transparent">
                  <X className="size-6" />
               </Button>
               <div className="mb-10 text-center">
                 <div className="w-16 h-16 nm-flat text-soft-blue flex items-center justify-center mx-auto mb-6 rounded-xl">
                   <Facebook size={32} />
                 </div>
                 <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100 tracking-tight uppercase">{t('connectNewPage')}</h3>
                 <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-widest mt-2">{t('chooseAppBridge')}</p>
               </div>
               <div className="space-y-4">
                 {fbApps.map(app => (
                   <button
                     key={app.id}
                     onClick={() => handleConnectFacebook(app.id)}
                     className="w-full flex items-center justify-between p-6 nm-button hover:text-[#2563EB] dark:hover:text-blue-400 group rounded-xl cursor-pointer"
                   >
                     <div className="text-left">
                       <p className="text-[11px] font-bold uppercase tracking-widest">{app.name}</p>
                       <p className="text-[9px] text-[#6B7280] dark:text-gray-400 mt-1">APP ID: {app.appId}</p>
                     </div>
                     <Plus size={18} className="group-hover:rotate-90 transition-transform text-[#2563EB] dark:text-blue-400" />
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
});
