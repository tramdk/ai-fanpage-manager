import React, { useState, useEffect, useCallback } from 'react';
import { User, CheckCircle, Shield, Sliders, Info, AlertTriangle, Trash2, Mail, Lock, RefreshCw, XCircle } from 'lucide-react';
import { ApiService } from '../api';
import { useLanguage } from '../LanguageContext';

export const AdminView = ({ api }: { api: ApiService }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      await api.fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke all credentials for this user? This is a high-security administrative action.')) return;
    try {
      await api.admin.revokeCredentials(id);
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!window.confirm('Reset mật khẩu người dùng này về mặc định (password@123)? Người dùng sẽ bắt buộc phải đổi mật khẩu sau khi đăng nhập.')) return;
    try {
      const res = await api.fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đã reset mật khẩu thành công về: password@123');
        fetchUsers();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi hệ thống khi reset mật khẩu');
    }
  };

  if (loading) return (
    <div className="p-24 text-center">
      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('loading')}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 lg:p-10 shadow-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex items-center space-x-6">
          <div className="p-4 bg-emerald-500 text-white rounded-[24px] shadow-2xl">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-50 uppercase tracking-tight">{t('admin')}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('adminSecurityProtocol')}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden">
        <div className="px-8 py-6 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-50 uppercase tracking-widest">{t('userManagement')}</h3>
          <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            <Info className="w-3.5 h-3.5" />
            <span>{users.length} {t('authorizedBridges')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                <th className="px-8 py-4">{t('officialName')}</th>
                <th className="px-8 py-4">{t('role')}</th>
                <th className="px-8 py-4">{t('statusActive')}</th>
                <th className="px-8 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-500 font-bold text-base group-hover:border-emerald-500/30 transition-all">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-100 uppercase tracking-tight">{u.name}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleUpdateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                        className={`p-2 rounded-xl border transition-all active:scale-95 ${u.status === 'active' ? 'border-slate-800 text-amber-500/70 hover:bg-amber-500 hover:text-white hover:border-amber-500' : 'border-slate-800 text-emerald-500/70 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                          }`}
                        title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                      >
                        {u.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="p-2 rounded-xl border border-slate-800 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95"
                        title="Reset Password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          className="px-4 py-2 border border-slate-800 text-red-500/70 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                          title={t('revokeCredentials')}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
