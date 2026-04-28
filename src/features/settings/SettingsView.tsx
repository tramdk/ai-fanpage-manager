import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, Mail, Shield, AlertCircle, Info, RefreshCw, Key, Image as ImageIcon, Facebook, Trash2, Plus, Edit2, X, Bot, ShieldCheck, Fingerprint, Lock } from 'lucide-react';
import { User as UserType } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';

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
            console.warn('Failed to fetch FB apps', err);
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
         setTimeout(() => setShowEditModal(false), 1500);
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
         setTimeout(() => setShowEditModal(false), 1500);
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

   if (loading) return (
      <div className="flex flex-col justify-center items-center h-96 gap-6">
         <RefreshCw className="w-12 h-12 text-soft-blue animate-spin" />
         <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">{t('loading')}</p>
      </div>
   );

   return (
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

         {/* Profile Header Card */}
         <div className="nm-flat p-10">
            <div className="flex flex-col md:flex-row items-center gap-10">
               <div className="w-24 h-24 nm-flat flex items-center justify-center text-soft-blue">
                  <User size={44} />
               </div>
               <div className="flex-1 w-full text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                     <div>
                        <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase">{user?.name}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4">
                           <div className="flex items-center gap-2 text-text-secondary font-bold text-xs uppercase tracking-tight">
                              <Mail size={14} className="text-soft-pink" />
                              {user?.email}
                           </div>
                           <div className="nm-inset px-4 py-1.5 rounded-xl text-[9px] font-black text-soft-blue uppercase tracking-widest">
                              {user?.role === 'admin' ? t('admin') : 'Tactical Unit'}
                           </div>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowEditModal(true)}
                        className="nm-button px-10 py-5 flex items-center justify-center gap-4 group"
                     >
                        <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500 text-soft-blue" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('profileSettings')}</span>
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Facebook Bridges Section */}
         <div className="nm-flat p-10 lg:p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 nm-flat flex items-center justify-center text-soft-blue">
                     <Facebook size={36} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight">{t('facebookApps')}</h3>
                     <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mt-2">{t('authorizedBridges')}</p>
                  </div>
               </div>
               <div className="nm-inset p-6 max-w-sm rounded-3xl">
                  <p className="text-[10px] text-text-secondary leading-relaxed font-bold uppercase tracking-tight">
                     <ShieldCheck size={18} className="inline-block mr-3 text-emerald-500" />
                     {t('encryptionStatus')}
                  </p>
               </div>
            </div>

            {/* Setup Guide */}
            <div className="nm-inset p-10 rounded-[48px]">
               <div className="flex items-center gap-4 mb-12">
                  <div className="w-12 h-12 nm-flat flex items-center justify-center text-soft-pink">
                     <Bot size={24} />
                  </div>
                  <h5 className="text-xs font-black uppercase tracking-widest text-text-primary">{t('fbGuideTitle')}</h5>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-5 gap-10 relative">
                  {[1, 2, 3, 4, 5].map((step) => (
                     <div key={step} className="space-y-6 group/step">
                        <div className="w-16 h-16 nm-button flex items-center justify-center text-xl font-black text-text-primary group-hover/step:text-soft-blue transition-all">
                           {step}
                        </div>
                        <p className="text-[10px] font-black text-text-muted group-hover/step:text-text-primary transition-colors tracking-tight leading-relaxed uppercase">
                           {(t as any)(`fbGuideStep${step}`)}
                        </p>
                     </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10">
               {/* List of Active Bridges */}
               <div className="space-y-8">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">{t('listManagement')}</h4>
                  {fbFetching ? (
                     <div className="p-24 text-center nm-inset">
                        <RefreshCw size={40} className="animate-spin text-soft-blue mx-auto mb-6 opacity-30" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('loading')}</p>
                     </div>
                  ) : fbApps.length === 0 ? (
                     <div className="p-24 text-center nm-inset">
                        <Facebook size={48} className="mx-auto mb-6 text-text-muted opacity-10" />
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('noActiveBridges')}</p>
                     </div>
                  ) : (
                     <div className="space-y-8">
                        {fbApps.map(app => (
                           <div key={app.id} className="p-8 nm-flat flex items-center justify-between group hover:scale-[1.01] transition-all">
                              <div className="flex items-center gap-6">
                                 <div className="w-14 h-14 nm-inset flex items-center justify-center text-soft-blue">
                                    <Facebook size={26} />
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">{app.name}</h4>
                                    <div className="flex items-center gap-4 mt-2">
                                       <span className="text-[9px] font-black text-soft-blue uppercase tracking-widest">ID: {app.appId}</span>
                                       <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-30">•</span>
                                       <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Synced {new Date(app.createdAt).toLocaleDateString()}</span>
                                    </div>
                                 </div>
                              </div>
                              <button
                                 onClick={() => { if (window.confirm(t('dismantleBridge'))) handleDeleteFbApp(app.id) }}
                                 className="w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-all"
                              >
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Configuration Form */}
               <div className="nm-flat p-10">
                  <div className="flex items-center gap-4 mb-12">
                     <div className="w-12 h-12 nm-flat flex items-center justify-center text-soft-blue">
                        <Plus size={24} />
                     </div>
                     <h4 className="text-lg font-black text-text-primary uppercase tracking-tight">{t('bridgeConnection')}</h4>
                  </div>
                  <form onSubmit={handleAddFacebookApp} className="space-y-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('protocolAlias')}</label>
                        <input
                           type="text"
                           required
                           className="nm-input font-bold"
                           placeholder="e.g. Content Bridge v1"
                           value={fbAppName}
                           onChange={(e) => setFbAppName(e.target.value)}
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('appId')}</label>
                        <input
                           type="text"
                           required
                           className="nm-input font-bold"
                           placeholder="Meta App ID"
                           value={fbAppId}
                           onChange={(e) => setFbAppId(e.target.value)}
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('appSecret')}</label>
                        <input
                           type="password"
                           required
                           className="nm-input font-bold"
                           placeholder="Meta App Secret"
                           value={fbAppSecret}
                           onChange={(e) => setFbAppSecret(e.target.value)}
                        />
                     </div>
  
                     <button
                        type="submit"
                        disabled={isSavingFb}
                        className="w-full bg-soft-blue text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                     >
                        {isSavingFb ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus size={20} />}
                        <span>{t('saveAndConnect')}</span>
                     </button>
                  </form>
               </div>
            </div>
         </div>

         {/* Security Modal */}
         {showEditModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[200] p-6 animate-in fade-in duration-300">
               <div className="nm-flat max-w-4xl w-full p-12 relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowEditModal(false)} className="absolute top-10 right-10 w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-colors">
                     <X size={24} />
                  </button>

                  <div className="mb-12">
                     <h3 className="text-3xl font-black text-text-primary uppercase tracking-tighter tracking-tight">{t('identityManagement')}</h3>
                     <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mt-3">{t('adminSecurityProtocol')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     {/* Profile Form */}
                     <div className="space-y-10">
                        <div className="flex items-center gap-4">
                           <Fingerprint size={24} className="text-soft-blue" />
                           <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">{t('profileSettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdateInfo} className="space-y-8">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('officialName')}</label>
                              <input type="text" required className="nm-input font-bold" value={editName} onChange={(e) => setEditName(e.target.value)} />
                           </div>
                           <div className="space-y-4 opacity-60">
                              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('authorizedEmail')}</label>
                              <input type="email" disabled className="nm-input font-bold bg-white/50" value={user?.email || ''} />
                           </div>
                           <button type="submit" disabled={isSavingInfo} className="w-full bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 disabled:opacity-50">
                              {isSavingInfo ? <RefreshCw className="animate-spin mx-auto" /> : t('updateIdentity')}
                           </button>
                        </form>
                     </div>

                     {/* Security Form */}
                     <div className="space-y-10">
                        <div className="flex items-center gap-4">
                           <Lock size={24} className="text-soft-pink" />
                           <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">{t('securitySettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="space-y-8">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('currentPasskey')}</label>
                              <input type="password" required className="nm-input font-bold" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">{t('newAuthorityToken')}</label>
                              <input type="password" required className="nm-input font-bold" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                           </div>
                           <button type="submit" disabled={isSaving} className="w-full bg-soft-blue text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:brightness-110 disabled:opacity-50">
                              {isSaving ? <RefreshCw className="animate-spin mx-auto" /> : t('modifyAuthCredentials')}
                           </button>
                        </form>
                     </div>
                  </div>
                  {(success || error) && (
                     <div className={`mt-12 p-6 rounded-3xl nm-inset text-[10px] font-black uppercase tracking-widest text-center ${success ? 'text-emerald-500' : 'text-soft-pink'}`}>
                        {success || error}
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
};
