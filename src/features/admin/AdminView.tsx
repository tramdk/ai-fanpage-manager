import React, { useState, useEffect, useCallback } from 'react';
import { User, CheckCircle, Shield, Sliders, Info, AlertTriangle, Trash2, Mail, Lock, RefreshCw, XCircle, MoreVertical, ShieldCheck, UserMinus, Key } from 'lucide-react';
import { ApiService } from '../../api';
import { useLanguage } from '../../LanguageContext';

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
      console.warn(err);
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
      console.warn(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke all credentials for this user? This is a high-security administrative action.')) return;
    try {
      await api.admin.revokeCredentials(id);
      fetchUsers();
    } catch (err) {
      console.warn(err);
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
      console.warn(err);
      alert('Lỗi hệ thống khi reset mật khẩu');
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-96 gap-6">
      <RefreshCw className="w-12 h-12 text-soft-blue animate-spin" />
      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">{t('loading')}</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Header Panel */}
      <div className="nm-flat p-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 nm-flat flex items-center justify-center text-soft-blue">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-primary uppercase tracking-tighter">{t('admin')}</h2>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mt-2">{t('adminSecurityProtocol')}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
           <div className="nm-inset px-8 py-4 flex items-center gap-3">
              <User size={16} className="text-soft-blue" />
              <span className="text-xs font-black text-text-primary uppercase">Active Nodes: {users.length}</span>
           </div>
           <button onClick={fetchUsers} className="w-14 h-14 nm-button flex items-center justify-center text-soft-blue">
             <RefreshCw size={20} />
           </button>
        </div>
      </div>

      {/* User Table Panel */}
      <div className="nm-flat overflow-hidden">
        <div className="px-10 py-8 border-b border-text-muted/10 flex justify-between items-center">
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('userManagement')}</h3>
          <div className="flex gap-4">
             {/* Filter placeholder for UI completeness */}
             <div className="nm-inset px-6 py-2 rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest hidden sm:block">
                All Roles
             </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="text-text-muted text-[10px] font-black uppercase tracking-widest">
                <th className="px-10 py-8">{t('officialName')}</th>
                <th className="px-10 py-8">Access Level</th>
                <th className="px-10 py-8">Neural Status</th>
                <th className="px-10 py-8 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-muted/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/30 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 nm-flat p-0.5 flex items-center justify-center">
                         <div className="w-full h-full rounded-xl bg-soft-blue/5 flex items-center justify-center text-soft-blue font-black text-lg">
                           {u.name.charAt(0)}
                         </div>
                      </div>
                      <div>
                        <div className="text-sm font-black text-text-primary uppercase tracking-tight">{u.name}</div>
                        <div className="text-[11px] font-medium text-text-secondary mt-1">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`nm-flat-sm px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] ${u.role === 'admin' ? 'text-soft-pink' : 'text-text-muted'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-2xl nm-inset text-[10px] font-black uppercase tracking-widest ${u.status === 'active' ? 'text-emerald-500' : 'text-soft-pink'}`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${u.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-soft-pink shadow-[0_0_8px_rgba(255,106,149,0.5)]'}`}></div>
                      {u.status}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleUpdateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                        className="w-12 h-12 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue"
                        title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                      >
                        {u.status === 'active' ? <UserMinus size={18} /> : <CheckCircle size={18} />}
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="w-12 h-12 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue"
                        title="Reset Password"
                      >
                        <Key size={18} />
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          className="px-6 py-3 nm-button bg-soft-pink text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:brightness-110"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-20 text-center text-text-muted">
             <User size={48} className="mx-auto mb-6 opacity-20" />
             <p className="text-[11px] font-black uppercase tracking-[0.2em]">No neural units registered</p>
          </div>
        )}
      </div>
    </div>
  );
};
