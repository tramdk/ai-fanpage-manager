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

      <div className="nm-flat overflow-hidden">
        <div className="px-10 py-8 border-b border-text-muted/10 flex justify-between items-center">
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('userManagement')}</h3>
          <div className="flex gap-4">
             <div className="nm-inset px-6 py-2 rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest hidden sm:block">
                All Roles
             </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] border-b border-text-muted/5">
                  <th className="px-10 py-10">Unit Identification</th>
                  <th className="px-10 py-10">Access Credentials</th>
                  <th className="px-10 py-10">Protocol Status</th>
                  <th className="px-10 py-10 text-right">Admin Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-muted/5">
                {users.map((u) => (
                  <tr key={u.id} className="group hover:bg-soft-blue/5 transition-all duration-500">
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 nm-inset flex items-center justify-center text-soft-blue">
                          <User size={28} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-text-primary uppercase tracking-tight leading-tight">{u.name}</h3>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">UNIT_ID: {u.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <div className="text-sm font-black text-text-primary mb-1">{u.email}</div>
                      <div className={`text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-soft-blue' : 'text-text-muted'}`}>
                        {u.role === 'admin' ? 'COMMAND_AUTH' : 'Standard Logic'}
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <div className={`nm-inset px-5 py-2.5 rounded-2xl inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                         <div className={`w-2 h-2 rounded-full ${u.status === 'suspended' ? 'bg-soft-pink animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                         {u.status}
                      </div>
                    </td>
                    <td className="px-10 py-10 text-right">
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

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
             {users.map((u) => (
               <div key={u.id} className="nm-flat p-6 rounded-[32px] space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 nm-inset flex items-center justify-center text-soft-blue">
                           <User size={24} />
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">{u.name}</h4>
                           <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{u.role === 'admin' ? 'Administrator' : 'Standard User'}</p>
                        </div>
                     </div>
                     <div className={`nm-inset px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.status === 'suspended' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                        {u.status}
                     </div>
                  </div>

                  <div className="nm-inset p-4 rounded-2xl">
                     <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Access Credential</p>
                     <p className="text-xs font-bold text-text-primary truncate">{u.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => handleUpdateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                       className="nm-button py-4 text-[9px] font-black uppercase tracking-widest text-text-primary flex items-center justify-center gap-2"
                     >
                        {u.status === 'active' ? <><UserMinus size={14} /> Suspend</> : <><CheckCircle size={14} /> Activate</>}
                     </button>
                     <button 
                       onClick={() => handleResetPassword(u.id)}
                       className="nm-button py-4 text-[9px] font-black uppercase tracking-widest text-soft-blue flex items-center justify-center gap-2"
                     >
                        <Key size={14} /> Reset Pass
                     </button>
                     {u.role !== 'admin' && (
                       <button 
                         onClick={() => handleRevoke(u.id)}
                         className="col-span-2 nm-button py-4 bg-soft-pink text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                       >
                          <Trash2 size={14} /> Revoke access protocol
                       </button>
                     )}
                  </div>
               </div>
             ))}
          </div>

          {users.length === 0 && (
            <div className="p-20 text-center text-text-muted">
               <User size={48} className="mx-auto mb-6 opacity-20" />
               <p className="text-[11px] font-black uppercase tracking-[0.2em]">No neural units registered</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
