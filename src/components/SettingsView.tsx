import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, Mail, Shield, AlertCircle, Info, RefreshCw, Key, Image as ImageIcon, Facebook, Trash2, Plus, Edit2, X, Bot } from 'lucide-react';
import { User as UserType } from '../types';
import { useLanguage } from '../LanguageContext';
import { ApiService } from '../api';

export const SettingsView = ({ api }: { api: ApiService }) => {
   const [user, setUser] = useState<UserType | null>(null);
   const [loading, setLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const { t } = useLanguage();

   // Modal State
   const [showEditModal, setShowEditModal] = useState(false);

   // Password fields
   const [oldPassword, setOldPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');

   // Personal Info fields
   const [editName, setEditName] = useState('');
   const [isSavingInfo, setIsSavingInfo] = useState(false);

   // Facebook Config fields
   const [fbApps, setFbApps] = useState<{ id: string, appId: string, name: string, createdAt: string }[]>([]);
   const [fbAppName, setFbAppName] = useState('');
   const [fbAppId, setFbAppId] = useState('');
   const [fbAppSecret, setFbAppSecret] = useState('');
   const [isSavingFb, setIsSavingFb] = useState(false);
   const [fbFetching, setFbFetching] = useState(true);

   const fetchAppsList = useCallback(() => {
      setFbFetching(true);
      api.fbApps.list()
         .then(data => {
            setFbApps(Array.isArray(data) ? data : []);
            setFbFetching(false);
         })
         .catch(err => {
            console.error('Failed to fetch FB apps', err);
            setFbFetching(false);
         });
   }, [api]);

   useEffect(() => {
      api.users.getMe()
         .then(data => {
            setUser(data);
            setEditName(data.name || '');
            setLoading(false);
         })
         .catch(() => setLoading(false));

      fetchAppsList();
   }, [api, fetchAppsList]);

   const handleUpdateInfo = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingInfo(true);
      setError('');
      setSuccess('');
      try {
         await api.users.updateProfile({ name: editName });
         setSuccess(t('updateIdentity'));
         setUser({ ...user!, name: editName });
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsSavingInfo(false);
      }
   };

   const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      setError('');
      setSuccess('');
      try {
         await api.users.updatePassword({ oldPassword, newPassword });
         setSuccess(t('updateIdentity'));
         setOldPassword('');
         setNewPassword('');
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsSaving(false);
      }
   };

   const handleAddFacebookApp = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingFb(true);
      setError('');
      setSuccess('');
      try {
         await api.fbApps.create({ appId: fbAppId, appSecret: fbAppSecret, name: fbAppName });
         setSuccess(t('updateIdentity'));
         setFbAppId('');
         setFbAppSecret('');
         setFbAppName('');
         fetchAppsList();
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsSavingFb(false);
      }
   };

   const handleDeleteFbApp = async (id: string) => {
      try {
         await api.fbApps.delete(id);
         setFbApps(fbApps.filter(a => a.id !== id));
         setSuccess(t('updateIdentity'));
      } catch (err: any) {
         setError(err.message);
      }
   };

   if (loading) return <div className="p-20 text-center animate-pulse text-emerald-500 font-bold uppercase tracking-widest text-[10px]">{t('loading')}</div>;

   return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

         {/* Profile Header Card */}
         <div className="bg-slate-900 rounded-[32px] p-8 lg:p-10 border border-slate-800 text-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
               <div className="w-20 h-20 rounded-[24px] bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner group hover:border-emerald-500/30 transition-all duration-500">
                  <User className="w-10 h-10 text-emerald-500" />
               </div>
               <div className="flex-1 w-full text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-between mb-2">
                     <h2 className="text-2xl font-bold tracking-tight uppercase truncate">{user?.name}</h2>
                     <button
                        onClick={() => setShowEditModal(true)}
                        className="hidden md:flex p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-xl border border-slate-700 transition-all active:scale-95"
                     >
                        <Edit2 className="w-4 h-4" />
                     </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                     <div className="flex items-center space-x-2 text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold truncate">{user?.email}</span>
                     </div>
                     <div className="flex items-center space-x-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{user?.role === 'admin' ? t('admin') : 'USER'}</span>
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowEditModal(true)} className="md:hidden w-full py-4 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">{t('modifyAuthCredentials')}</button>
            </div>
         </div>

         {/* Main Settings Body */}
         <div className="bg-slate-900 rounded-[32px] border border-slate-800 p-8 lg:p-12 overflow-hidden">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="flex items-center space-x-4">
                  <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                     <Facebook className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold text-slate-50 tracking-tight uppercase">{t('facebookApps')}</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('authorizedBridges')}</p>
                  </div>
               </div>
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl max-w-sm">
                  <p className="text-[9px] text-amber-500 leading-relaxed font-bold uppercase tracking-widest">
                     <Info className="w-3.5 h-3.5 inline-block mr-2 mb-0.5" />
                     {t('encryptionStatus')}
                  </p>
               </div>
            </div>

            {/* Step Guide */}
            <div className="mb-12 p-8 bg-slate-950 border border-slate-800 rounded-[28px] relative overflow-hidden group">
               <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-8">
                     <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <Bot className="w-4 h-4 text-emerald-500" />
                     </div>
                     <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t('fbGuideTitle')}</h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                     {[1, 2, 3, 4, 5].map((step) => (
                        <div key={step} className="flex md:flex-col md:items-start md:justify-between items-center space-x-4 md:space-x-0 md:space-y-4 bg-slate-900 p-5 rounded-[20px] border border-slate-800 hover:border-emerald-500/30 transition-all duration-500 group/step">
                           <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-emerald-500 shadow-xl group-hover/step:bg-emerald-500 group-hover/step:text-white transition-all duration-500">
                              {step}
                           </div>
                           <p className="text-[10px] font-bold text-slate-500 group-hover/step:text-slate-300 transition-colors duration-500 uppercase tracking-tight leading-tight">
                              {(t as any)(`fbGuideStep${step}`)}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* List of Apps */}
               <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-2">{t('listManagement')}</h4>
                  {fbFetching ? (
                     <div className="p-16 text-center bg-slate-950/50 rounded-[28px] border border-slate-800">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-800 mx-auto mb-4" />
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t('loading')}</p>
                     </div>
                  ) : fbApps.length === 0 ? (
                     <div className="p-16 text-center bg-slate-950/50 rounded-[28px] border border-slate-800">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800 text-slate-800">
                           <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('noActiveBridges')}</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {fbApps.map(app => (
                           <div key={app.id} className="p-6 bg-slate-950/50 border border-slate-800 rounded-[24px] hover:border-emerald-500/30 transition-all duration-500 group flex items-center justify-between">
                              <div className="flex items-center space-x-5">
                                 <div className="p-4 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl group-hover:text-emerald-500 transition-colors">
                                    <Facebook className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-tight">{app.name}</h4>
                                    <div className="flex items-center space-x-3 mt-1.5">
                                       <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ID: {app.appId}</span>
                                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('lastSync')}: {new Date(app.createdAt).toLocaleDateString()}</span>
                                    </div>
                                 </div>
                              </div>
                              {user?.role !== 'admin' && (
                                 <button
                                    onClick={() => { if (window.confirm(t('dismantleBridge'))) handleDeleteFbApp(app.id) }}
                                    className="p-2.5 text-slate-700 hover:text-red-500 transition-all"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Add Form */}
               <div className="bg-slate-950/50 rounded-[28px] p-8 border border-slate-800">
                  <div className="flex items-center space-x-3 mb-8 px-2">
                     <Plus className="w-4 h-4 text-emerald-500" />
                     <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('bridgeConnection')}</h4>
                  </div>
                  <form onSubmit={handleAddFacebookApp} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('protocolAlias')}</label>
                        <input
                           type="text"
                           required
                           className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                           placeholder="e.g. Marketing App v1"
                           value={fbAppName}
                           onChange={(e) => setFbAppName(e.target.value)}
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('appId')}</label>
                           <input
                              type="text"
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                              placeholder="App ID"
                              value={fbAppId}
                              onChange={(e) => setFbAppId(e.target.value)}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('appSecret')}</label>
                           <input
                              type="password"
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                              placeholder="App Secret"
                              value={fbAppSecret}
                              onChange={(e) => setFbAppSecret(e.target.value)}
                           />
                        </div>
                     </div>

                     <button
                        type="submit"
                        disabled={isSavingFb}
                        className="w-full bg-emerald-500 text-white font-bold uppercase tracking-widest text-[11px] py-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center space-x-3"
                     >
                        {isSavingFb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                        <span>{t('bridgeConnection')}</span>
                     </button>
                  </form>
               </div>
            </div>
         </div>

         {/* Security Modal */}
         {showEditModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
               <div className="bg-slate-900 rounded-[32px] border border-slate-800 shadow-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-10 relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 p-2 text-slate-600 hover:text-slate-400 transition-all"><X className="w-6 h-6" /></button>

                  <div className="mb-10">
                     <h3 className="text-xl font-bold text-slate-50 uppercase tracking-tight">{t('identityManagement')}</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('adminSecurityProtocol')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     {/* Profile Form */}
                     <div className="space-y-6">
                        <div className="flex items-center space-x-3 mb-4">
                           <User className="w-5 h-5 text-emerald-500" />
                           <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('profileSettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdateInfo} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('officialName')}</label>
                              <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={editName} onChange={(e) => setEditName(e.target.value)} />
                           </div>
                           <div className="space-y-2 opacity-40">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('authorizedEmail')}</label>
                              <input type="email" disabled className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-500" value={user?.email || ''} />
                           </div>
                           <button type="submit" disabled={isSavingInfo} className="w-full bg-slate-50 text-slate-950 p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-white transition-all">{isSavingInfo ? <RefreshCw className="animate-spin" /> : t('updateIdentity')}</button>
                        </form>
                     </div>

                     {/* Security Form */}
                     <div className="space-y-6">
                        <div className="flex items-center space-x-3 mb-4">
                           <Key className="w-5 h-5 text-red-500" />
                           <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('securitySettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('currentPasskey')}</label>
                              <input type="password" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-red-500/50" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-2">{t('newAuthorityToken')}</label>
                              <input type="password" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                           </div>
                           <button type="submit" disabled={isSaving} className="w-full bg-slate-50 text-slate-950 p-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-white transition-all">{isSaving ? <RefreshCw className="animate-spin" /> : t('modifyAuthCredentials')}</button>
                        </form>
                     </div>
                  </div>
                  {success && <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-xl text-center">{success}</div>}
                  {error && <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl text-center">{error}</div>}
               </div>
            </div>
         )}
      </div>
   );
};
