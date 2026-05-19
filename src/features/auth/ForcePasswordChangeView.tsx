import React, { useState } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ForcePasswordChangeViewProps {
  api: any;
  onSuccess: (userData: any) => void;
  user: any;
}

export const ForcePasswordChangeView: React.FC<ForcePasswordChangeViewProps> = ({ api, onSuccess, user }) => {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await api.fetch('/api/users/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      setSuccess(true);
      
      // Successfully updated
      setTimeout(async () => {
        try {
          onSuccess(newPassword); // Pass the new password back
        } catch (e) {
          window.location.reload();
        }
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Lỗi cập nhật mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordMismatch = newPassword !== confirmPassword && confirmPassword.length > 0;
  const isPasswordTooShort = newPassword.length < 6 && newPassword.length > 0;

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Background sync with AuthView */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-75"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="glass-card rounded-xl border-white/10 shadow-3xl bg-card-bg/40 backdrop-blur-3xl p-6 sm:p-8 animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center p-0 mb-8 flex flex-col items-center gap-2">
            <div className="size-16 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4 ring-8 ring-indigo-600/5">
              {success ? <CheckCircle2 className="size-8 text-emerald-400" /> : <ShieldCheck className="size-8" />}
            </div>
            <CardTitle className="text-2xl font-bold text-white ">
              {success ? 'Xác thực thành công' : 'Bảo mật Master Node'}
            </CardTitle>
            <CardDescription className="text-[#6B7280] dark:text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              {success ? 'Đang chuyển hướng vào hệ thống...' : 'Bắt buộc thay đổi mật khẩu mặc định'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {!success ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <FieldGroup className="gap-5">
                  <Field data-invalid={error && currentPassword.length === 0 ? "true" : undefined}>
                    <FieldLabel htmlFor="currentPassword" className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-2">
                      Mật khẩu mặc định hiện tại
                    </FieldLabel>
                    <div className="relative group/input flex items-center">
                      <Lock className="absolute left-4 size-4 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-red-400 transition-colors" />
                      <Input
                        id="currentPassword"
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </Field>

                  <Field data-invalid={isPasswordTooShort ? "true" : undefined}>
                    <FieldLabel htmlFor="newPassword" className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-2">
                      Mật khẩu bảo mật mới
                    </FieldLabel>
                    <div className="relative group/input flex items-center">
                      <Lock className="absolute left-4 size-4 text-[#6B7280] dark:text-gray-400 group-focus-within/input:text-emerald-400 transition-colors" />
                      <Input
                        id="newPassword"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all pl-12"
                        placeholder="Tối thiểu 6 ký tự"
                        aria-invalid={isPasswordTooShort ? "true" : undefined}
                      />
                    </div>
                    {isPasswordTooShort && (
                      <FieldDescription className="text-destructive text-[10px] font-semibold mt-1">
                        Mật khẩu phải chứa ít nhất 6 ký tự.
                      </FieldDescription>
                    )}
                  </Field>

                  <Field data-invalid={isPasswordMismatch ? "true" : undefined}>
                    <FieldLabel htmlFor="confirmPassword" className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-2">
                      Xác nhận mật khẩu
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                      placeholder="Nhập lại mật khẩu mới"
                      aria-invalid={isPasswordMismatch ? "true" : undefined}
                    />
                    {isPasswordMismatch && (
                      <FieldDescription className="text-destructive text-[10px] font-semibold mt-1">
                        Mật khẩu xác nhận không khớp.
                      </FieldDescription>
                    )}
                  </Field>
                </FieldGroup>

                {error && (
                  <Alert variant="destructive" className="bg-red-600/10 border-red-900/50 text-red-400 p-4 rounded-xl animate-in shake duration-500">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-[10px] font-bold uppercase leading-relaxed">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-white hover:text-indigo-950 text-white py-6 rounded-lg font-bold uppercase tracking-[0.2em] text-[10px] h-auto shadow-3xl shadow-indigo-900/20"
                >
                  {loading ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <>
                      Kích hoạt quyền truy cập
                      <ArrowRight data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="py-10 flex flex-col items-center gap-6">
                <div className="relative size-16">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[#6B7280] dark:text-gray-400 text-xs font-bold uppercase animate-pulse">Initializing Neural Secure Tunnel...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
