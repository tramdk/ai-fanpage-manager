import React, { useState } from 'react';
import { Facebook, Mail, Lock, User, Bot, Sparkles, CheckCircle, Info, Clock } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { CONFIG } from '../config';
import { ForcePasswordChangeView } from './ForcePasswordChangeView';

export const AuthView = ({ onLogin }: { onLogin: (token: string, user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showForceChange, setShowForceChange] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await fetch(CONFIG.getApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.status === 403 && data.error === 'PASSWORD_CHANGE_REQUIRED') {
        setSetupToken(data.setupToken);
        setTargetUser(data.user);
        setShowForceChange(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Identity verification failed');

      if (isLogin) {
        onLogin(data.token, data.user);
      } else {
        setSuccess(t('regSuccess'));
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForceChange) {
    return (
      <ForcePasswordChangeView 
        user={targetUser} 
        api={{
           fetch: (url: string, opts: any) => {
              const b = JSON.parse(opts.body);
              return fetch(CONFIG.getApiUrl('/api/auth/setup-password'), {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                    setupToken,
                    newPassword: b.newPassword
                 })
              });
           }
        }}
        onSuccess={async (newPassword) => {
           // Automated Login with new password
           try {
              const res = await fetch(CONFIG.getApiUrl('/api/auth/login'), {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ email: targetUser.email, password: newPassword })
              });
              const data = await res.json();
              if (res.ok) {
                 onLogin(data.token, data.user);
              } else {
                 window.location.reload();
              }
           } catch (e) {
              window.location.reload();
           }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-75"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Brand Side (Desktop Only) */}
        <div className="hidden lg:flex flex-col space-y-10 animate-in slide-in-from-left-8 duration-700">
           <div className="flex items-center space-x-4">
              <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-2xl shadow-indigo-600/30 ring-8 ring-indigo-600/5">
                 <Bot className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight uppercase">AI Fanpage<br/><span className="text-indigo-400">Manager v2</span></h1>
           </div>
           
           <div className="space-y-8">
              <div className="flex items-start space-x-6 group">
                 <div className="p-3 bg-slate-900 border border-slate-800 text-indigo-400 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">
                    <Sparkles className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Automated Intelligence</h3>
                    <p className="text-slate-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Leverage sophisticated Gemini models to envision, draft, and schedule content without manual oversight.</p>
                 </div>
              </div>
              
              <div className="flex items-start space-x-6 group">
                 <div className="p-3 bg-slate-900 border border-slate-800 text-blue-400 rounded-2xl group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                    <Facebook className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Ecosystem Mastery</h3>
                    <p className="text-slate-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Direct API integration with the Facebook Graph for seamless publishing and audience synchronization.</p>
                 </div>
              </div>
              
              <div className="flex items-start space-x-6 group">
                 <div className="p-3 bg-slate-900 border border-slate-800 text-emerald-400 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xl">
                    <Clock className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Strategic Scheduling</h3>
                    <p className="text-slate-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Sophisticated batch queuing engine with manual override for total command over your post sequence.</p>
                 </div>
              </div>
           </div>

           <div className="pt-8 flex items-center space-x-6 opacity-30">
              <div className="h-px flex-1 bg-slate-800"></div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Enterprise AI Engine</p>
              <div className="h-px flex-1 bg-slate-800"></div>
           </div>
        </div>

        {/* Input Side */}
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 lg:p-14 rounded-[48px] border border-slate-800/60 shadow-3xl ring-1 ring-white/5 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3">
              {isLogin ? t('welcomeBack') : t('initiateIdentity')}
            </h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-loose">
              {isLogin ? t('login') : t('register')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2 group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Master Account Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-bold placeholder:text-slate-700"
                    placeholder="Full Display Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Secret (Email)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-bold placeholder:text-slate-700"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Passkey</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-bold placeholder:text-slate-700"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-5 bg-red-600/10 border-2 border-red-900/50 text-red-400 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center text-center animate-in shake duration-500">
                {error}
              </div>
            )}

            {success && (
              <div className="p-5 bg-emerald-600/10 border-2 border-emerald-900/50 text-emerald-400 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center text-center leading-relaxed">
                <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-white hover:text-slate-950 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 disabled:opacity-30 shadow-3xl shadow-indigo-900/20 hover:shadow-indigo-600/20 group"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t('verifying')}</span>
                </div>
              ) : (
                <span>{isLogin ? t('grantAccess') : t('initiateRegistration')}</span>
              )}
            </button>
          </form>

          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="w-full mt-8 text-slate-600 hover:text-white transition-all text-xs font-black uppercase tracking-[0.3em] py-2 flex flex-col items-center group"
          >
             <span className="opacity-40 group-hover:opacity-100 transition-opacity mb-1">{isLogin ? t('noIdentity') : t('alreadyAuthorized')}</span>
             <span className="text-slate-400 group-hover:text-indigo-400 underline underline-offset-8 transition-all">{isLogin ? t('registerNew') : t('authenticateIdentity')}</span>
          </button>
        </div>
      </div>

      <footer className="mt-12 text-slate-700 text-xs font-black uppercase tracking-[0.5em] flex items-center animate-in fade-in duration-1000">
         <Info className="w-4 h-4 mr-2" />
         Secure Encrypted Tunnel • Node v20.x
      </footer>
    </div>
  );
};
