import React, { useState } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

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

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      {/* Background sync with AuthView */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse duration-75"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card-bg/40 backdrop-blur-3xl p-10 rounded-[48px] border border-card-border/60 shadow-3xl ring-1 ring-white/5 animate-in zoom-in-95 duration-500">
          
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-indigo-600/5">
              {success ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
              {success ? 'Xác thực thành công' : 'Bảo mật Master Node'}
            </h2>
            <p className="text-text-secondary font-bold text-[10px] uppercase tracking-[0.3em]">
              {success ? 'Đang chuyển hướng vào hệ thống...' : 'Bắt buộc thay đổi mật khẩu mặc định'}
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Mật khẩu mặc định hiện tại</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-red-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-app-bg border-2 border-card-border rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-red-600 transition-all font-bold placeholder:text-slate-800 text-sm"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Mật khẩu bảo mật mới</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-emerald-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-app-bg border-2 border-card-border rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-emerald-600 transition-all font-bold placeholder:text-slate-800 text-sm"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-app-bg border-2 border-card-border rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-600 transition-all font-bold placeholder:text-slate-800 text-sm"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-600/10 border border-red-900/50 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center text-center animate-in shake duration-500">
                  <AlertCircle className="w-4 h-4 mr-2" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-white hover:text-slate-950 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all transform active:scale-95 disabled:opacity-30 shadow-3xl shadow-indigo-900/20 flex items-center justify-center space-x-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Kích hoạt quyền truy cập</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <div className="py-10 flex flex-col items-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-text-secondary text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Neural Secure Tunnel...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
