import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, Info, ArrowLeft, Bot, Sparkles } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { CONFIG } from '../../config';

export const ResetPasswordView = ({ api, onSuccess }: { api: any, onSuccess: () => void }) => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(CONFIG.getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
        <div className="w-full max-w-md bg-card-bg/40 backdrop-blur-3xl p-10 rounded-[48px] border border-card-border/60 shadow-3xl text-center">
          <div className="w-20 h-20 bg-emerald-600/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">{t('passwordResetSuccess')}</h2>
          <button
            onClick={onSuccess}
            className="w-full bg-indigo-600 hover:bg-white hover:text-slate-950 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all"
          >
            {t('backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-card-bg/40 backdrop-blur-3xl p-10 rounded-[48px] border border-card-border/60 shadow-3xl relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
              <Bot className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Reset Password</h1>
          </div>
          <p className="text-text-secondary font-bold text-xs uppercase tracking-widest">
            {t('newPassword')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 group">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-purple-400 transition-colors" />
              <input
                type="password"
                required
                className="w-full bg-app-bg border-2 border-card-border rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-bold"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">{t('confirmPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-purple-400 transition-colors" />
              <input
                type="password"
                required
                className="w-full bg-app-bg border-2 border-card-border rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:ring-4 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-bold"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-5 bg-red-600/10 border-2 border-red-900/50 text-red-400 text-xs font-black uppercase tracking-widest rounded-2xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-indigo-600 hover:bg-white hover:text-slate-950 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 disabled:opacity-30"
          >
            {loading ? t('loading') : t('resetPassword')}
          </button>
        </form>

        <button
          onClick={onSuccess}
          className="w-full mt-8 text-text-secondary hover:text-white transition-all text-xs font-black uppercase tracking-[0.3em] py-2 flex items-center justify-center group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          {t('backToLogin')}
        </button>
      </div>

      <footer className="mt-12 text-slate-700 text-xs font-black uppercase tracking-[0.5em] flex items-center">
         <Info className="w-4 h-4 mr-2" />
         Secure Reset Protocol
      </footer>
    </div>
  );
};
