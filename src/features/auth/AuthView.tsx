import React, { useState } from 'react';
import { Facebook, Mail, Lock, User, Bot, Sparkles, CheckCircle, Info, Clock, Loader2 } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { CONFIG } from '../../config';
import { ForcePasswordChangeView } from './ForcePasswordChangeView';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthView = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
        onLogin(data.user);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(CONFIG.getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

      setSuccess(t('resetEmailSent'));
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
                 onLogin(data.user);
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
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] size-[60%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] size-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-75"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Brand Side (Desktop Only) */}
        <div className="hidden lg:flex flex-col gap-10 animate-in slide-in-from-left-8 duration-700">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-2xl shadow-indigo-600/30 ring-8 ring-indigo-600/5">
                 <Bot className="size-10" />
              </div>
              <h1 className="text-xl font-bold text-white  uppercase">AI Fanpage<br/><span className="text-indigo-400">Manager v2</span></h1>
           </div>
           
           <div className="flex flex-col gap-8">
              <div className="flex items-start gap-6 group">
                 <div className="p-3 bg-card-bg border border-card-border text-indigo-400 rounded-lg group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">
                    <Sparkles className="size-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Automated Intelligence</h3>
                    <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Leverage sophisticated Gemini models to envision, draft, and schedule content without manual oversight.</p>
                 </div>
              </div>
              
              <div className="flex items-start gap-6 group">
                 <div className="p-3 bg-card-bg border border-card-border text-blue-400 rounded-lg group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                    <Facebook className="size-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Ecosystem Mastery</h3>
                    <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Direct API integration with the Facebook Graph for seamless publishing and audience synchronization.</p>
                 </div>
              </div>
              
              <div className="flex items-start gap-6 group">
                 <div className="p-3 bg-card-bg border border-card-border text-emerald-400 rounded-lg group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xl">
                    <Clock className="size-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">Strategic Scheduling</h3>
                    <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed text-sm max-w-sm font-medium opacity-80 group-hover:opacity-100 italic transition-opacity">Sophisticated batch queuing engine with manual override for total command over your post sequence.</p>
                 </div>
              </div>
           </div>

           <div className="pt-8 flex items-center gap-6 opacity-30">
              <div className="h-px flex-grow bg-accent-bg"></div>
              <p className="text-xs font-bold uppercase text-[#6B7280] dark:text-gray-400">Enterprise AI Engine</p>
              <div className="h-px flex-grow bg-accent-bg"></div>
           </div>
        </div>

        {/* Input Side */}
        <Card className="bg-card-bg/40 backdrop-blur-3xl p-6 sm:p-10 lg:p-14 rounded-xl border border-card-border/60 shadow-3xl ring-1 ring-white/5 animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center p-0 mb-10">
            <CardTitle className="text-2xl font-bold text-white mb-3 leading-tight">
              {isForgotPassword ? t('forgotPassword') : (isLogin ? t('welcomeBack') : t('initiateIdentity'))}
            </CardTitle>
            <CardDescription className="text-[#6B7280] dark:text-gray-400 font-bold text-xs uppercase leading-loose">
              {isForgotPassword ? t('email') : (isLogin ? t('login') : t('register'))}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="flex flex-col gap-6">
              <FieldGroup className="gap-5">
                 {!isLogin && !isForgotPassword && (
                  <Field>
                    <FieldLabel htmlFor="displayName" className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-1">
                      Master Account Name
                    </FieldLabel>
                    <div className="relative group/input flex items-center">
                      <User className="absolute left-4 size-5 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-indigo-400 transition-colors" />
                      <Input
                        id="displayName"
                        type="text"
                        required
                        className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                        placeholder="Full Display Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </Field>
                )}
                
                <Field>
                  <FieldLabel htmlFor="emailInput" className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-1">
                    Identity Secret (Email)
                  </FieldLabel>
                  <div className="relative group/input flex items-center">
                    <Mail className="absolute left-4 size-5 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-blue-400 transition-colors" />
                    <Input
                      id="emailInput"
                      type="email"
                      required
                      className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                      placeholder="name@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </Field>
 
                 {!isForgotPassword && (
                  <Field>
                    <div className="flex items-center justify-between ml-1">
                      <FieldLabel htmlFor="passwordInput" className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase">
                        Secure Passkey
                      </FieldLabel>
                      {isLogin && (
                        <button 
                          type="button"
                          onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                          className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors uppercase"
                        >
                          {t('forgotPassword')}
                        </button>
                      )}
                    </div>
                    <div className="relative group/input flex items-center">
                      <Lock className="absolute left-4 size-5 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-purple-400 transition-colors" />
                      <Input
                        id="passwordInput"
                        type="password"
                        required
                        className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </Field>
                )}
              </FieldGroup>

              {error && (
                <Alert variant="destructive" className="bg-red-600/10 border-red-900/50 text-red-400 p-5 rounded-lg animate-in shake duration-500">
                  <AlertDescription className="text-xs font-bold uppercase text-center leading-relaxed">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-emerald-600/10 border-emerald-900/50 text-emerald-400 p-5 rounded-lg animate-in fade-in duration-300">
                  <CheckCircle className="size-5" data-icon="inline-start" />
                  <AlertDescription className="text-xs font-bold uppercase leading-relaxed">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-white hover:text-indigo-950 text-white py-6 rounded-lg font-bold uppercase tracking-[0.2em] transition-all h-auto shadow-3xl shadow-indigo-900/20 hover:shadow-indigo-600/20"
              >
                {loading ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <span>{isForgotPassword ? t('sendResetLink') : (isLogin ? t('grantAccess') : t('initiateRegistration'))}</span>
                )}
              </Button>
            </form>

            <button
              onClick={() => { 
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsLogin(!isLogin); 
                }
                setError(''); 
                setSuccess(''); 
              }}
              className="w-full mt-8 text-[#6B7280] dark:text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-[0.3em] py-2 flex flex-col items-center gap-1 group"
            >
               <span className="opacity-40 group-hover:opacity-100 transition-opacity">
                 {isForgotPassword ? '' : (isLogin ? t('noIdentity') : t('alreadyAuthorized'))}
               </span>
               <span className="text-[#6B7280] dark:text-gray-400 group-hover:text-indigo-400 underline underline-offset-8 transition-all">
                 {isForgotPassword ? t('backToLogin') : (isLogin ? t('registerNew') : t('authenticateIdentity'))}
               </span>
            </button>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 text-slate-700 text-xs font-bold uppercase tracking-[0.5em] flex items-center gap-2 animate-in fade-in duration-1000">
         <Info className="size-4" />
         Secure Encrypted Tunnel • Node v20.x
      </footer>
    </div>
  );
};
