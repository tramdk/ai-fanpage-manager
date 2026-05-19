import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, Info, ArrowLeft, Bot, Loader2 } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { CONFIG } from '../../config';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Background sync with AuthView */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] size-[60%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] size-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-75"></div>
      </div>

      {success ? (
        <Card className="w-full max-w-md bg-card-bg/40 backdrop-blur-3xl p-6 sm:p-8 rounded-xl border-white/10 shadow-3xl text-center relative z-10 animate-in zoom-in-95 duration-500">
          <CardHeader className="p-0 mb-6 flex flex-col items-center gap-2">
            <div className="size-20 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center mb-2">
              <CheckCircle className="size-10" />
            </div>
            <CardTitle className="text-2xl font-bold text-white leading-tight">
              {t('passwordResetSuccess')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Button
              onClick={onSuccess}
              className="w-full bg-indigo-600 hover:bg-white hover:text-indigo-950 text-white py-6 rounded-lg font-bold uppercase tracking-[0.2em] text-[10px] h-auto"
            >
              {t('backToLogin')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md bg-card-bg/40 backdrop-blur-3xl p-6 sm:p-10 rounded-xl border-white/10 shadow-3xl relative z-10 animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center p-0 mb-10 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-600 text-white rounded-lg">
                <Bot className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-white ">Reset Password</CardTitle>
            </div>
            <CardDescription className="text-[#6B7280] dark:text-gray-400 font-bold text-xs uppercase leading-loose">
              {t('newPassword')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="newPassword" className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-1">
                    {t('newPassword')}
                  </FieldLabel>
                  <div className="relative group/input flex items-center">
                    <Lock className="absolute left-4 size-5 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-purple-400 transition-colors" />
                    <Input
                      id="newPassword"
                      type="password"
                      required
                      className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword" className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-1">
                    {t('confirmPassword')}
                  </FieldLabel>
                  <div className="relative group/input flex items-center">
                    <Lock className="absolute left-4 size-5 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-purple-400 transition-colors" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </Field>
              </FieldGroup>

              {error && (
                <Alert variant="destructive" className="bg-red-600/10 border-red-900/50 text-red-400 p-5 rounded-lg animate-in shake duration-500">
                  <AlertDescription className="text-xs font-bold uppercase text-center leading-relaxed">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-indigo-600 hover:bg-white hover:text-indigo-950 text-white py-6 rounded-lg font-bold uppercase tracking-[0.2em] text-[10px] h-auto transition-all"
              >
                {loading ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  t('resetPassword')
                )}
              </Button>
            </form>

            <Button
              variant="ghost"
              onClick={onSuccess}
              className="w-full mt-8 text-[#6B7280] dark:text-gray-400 hover:text-white transition-all text-xs font-bold uppercase tracking-[0.3em] py-2 flex items-center justify-center gap-2 group h-auto bg-transparent border-0 hover:bg-transparent"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              {t('backToLogin')}
            </Button>
          </CardContent>
        </Card>
      )}

      <footer className="mt-12 text-slate-700 text-xs font-bold uppercase tracking-[0.5em] flex items-center gap-2 animate-in fade-in duration-1000">
         <Info className="size-4" />
         Secure Reset Protocol
      </footer>
    </div>
  );
};
