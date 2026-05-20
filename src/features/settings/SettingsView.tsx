import React, { useState, useEffect, useCallback } from 'react';
import { Settings, User, Mail, Shield, AlertCircle, Info, RefreshCw, Key, Image as ImageIcon, Facebook, Trash2, Plus, Edit2, X, Bot, ShieldCheck, Fingerprint, Lock } from 'lucide-react';
import { User as UserType } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
         <RefreshCw className="size-12 text-[#2563EB] dark:text-blue-400 animate-spin" />
         <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em]">{t('loading')}</p>
      </div>
   );

   return (
      <div className="max-w-7xl mx-auto flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

         {/* Profile Header Card */}
         <div className="nm-flat p-10 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-10">
               <div className="size-24 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-xl">
                  <User className="size-11" />
               </div>
               <div className="flex-1 w-full text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                     <div>
                        <h2 className="text-xl font-bold text-[#111827] dark:text-gray-100 er uppercase">{user?.name}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mt-4">
                           <div className="flex items-center gap-2 text-[#6B7280] dark:text-gray-400 font-bold text-xs ">
                              <Mail className="size-3.5 text-soft-pink" />
                              {user?.email}
                           </div>
                           <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-4 py-1.5 rounded-xl text-[9px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">
                              {user?.role === 'admin' ? t('admin') : 'Tactical Unit'}
                           </div>
                        </div>
                     </div>
                     <Button
                        onClick={() => setShowEditModal(true)}
                        className="border border-[#D1D5DB] dark:border-white/12 rounded-lg px-10 py-5 flex items-center justify-center gap-4 group h-auto hover:bg-transparent"
                     >
                        <Settings className="group-hover:rotate-90 transition-transform duration-500 text-[#2563EB] dark:text-blue-400 size-5" />
                        <span className="text-[10px] font-bold uppercase">{t('profileSettings')}</span>
                     </Button>
                  </div>
               </div>
            </div>
         </div>

         {/* Facebook Bridges Section */}
         <div className="nm-flat p-10 lg:p-12 flex flex-col gap-12 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
               <div className="flex items-center gap-6">
                  <div className="size-20 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-lg">
                     <Facebook className="size-9" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100 ">{t('facebookApps')}</h3>
                     <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] mt-2">{t('authorizedBridges')}</p>
                  </div>
               </div>
               <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-6 max-w-sm rounded-xl">
                  <p className="text-[10px] text-[#6B7280] dark:text-gray-400 leading-relaxed font-bold  flex items-center gap-3">
                     <ShieldCheck className="text-emerald-500 size-5" />
                     {t('encryptionStatus')}
                  </p>
               </div>
            </div>

            {/* Setup Guide */}
            <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-10 rounded-xl flex flex-col gap-12">
               <div className="flex items-center gap-4">
                  <div className="size-12 nm-flat flex items-center justify-center text-soft-pink rounded-xl">
                     <Bot className="size-6" />
                  </div>
                  <h5 className="text-xs font-bold uppercase text-[#111827] dark:text-gray-100">{t('fbGuideTitle')}</h5>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-5 gap-10 relative">
                  {[1, 2, 3, 4, 5].map((step) => (
                     <div key={step} className="flex flex-col gap-6 group/step">
                        <div className="size-16 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-xl font-bold text-[#111827] dark:text-gray-100 group-hover/step:text-[#2563EB] dark:text-blue-400 transition-all rounded-lg">
                           {step}
                        </div>
                        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 group-hover/step:text-[#111827] dark:text-gray-100 transition-colors  leading-relaxed uppercase">
                           {(t as any)(`fbGuideStep${step}`)}
                        </p>
                     </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10">
               {/* List of Active Bridges */}
               <div className="flex flex-col gap-8">
                  <h4 className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] ml-2">{t('listManagement')}</h4>
                  {fbFetching ? (
                     <div className="p-24 text-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-xl">
                        <RefreshCw className="animate-spin text-[#2563EB] dark:text-blue-400 mx-auto mb-6 opacity-30 size-10" />
                        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('loading')}</p>
                     </div>
                  ) : fbApps.length === 0 ? (
                     <div className="p-24 text-center bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg rounded-xl">
                        <Facebook className="mx-auto mb-6 text-[#6B7280] dark:text-gray-400 opacity-10 size-12" />
                        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('noActiveBridges')}</p>
                     </div>
                  ) : (
                     <div className="flex flex-col gap-8">
                        {fbApps.map(app => (
                           <div key={app.id} className="p-8 nm-flat flex items-center justify-between group hover:scale-[1.01] transition-all rounded-xl">
                              <div className="flex items-center gap-6">
                                 <div className="size-14 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-xl">
                                    <Facebook className="size-6" />
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-bold text-[#111827] dark:text-gray-100 ">{app.name}</h4>
                                    <div className="flex items-center gap-4 mt-2">
                                       <span className="text-[9px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">ID: {app.appId}</span>
                                       <span className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase opacity-30">•</span>
                                       <span className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">Synced {new Date(app.createdAt).toLocaleDateString()}</span>
                                    </div>
                                 </div>
                              </div>
                              <Button
                                 onClick={() => { if (window.confirm(t('dismantleBridge'))) handleDeleteFbApp(app.id) }}
                                 className="size-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-all h-auto p-0 hover:bg-transparent"
                              >
                                 <Trash2 className="size-[18px]" />
                              </Button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* Configuration Form */}
               <div className="nm-flat p-10 rounded-lg flex flex-col gap-8">
                  <div className="flex items-center gap-4">
                     <div className="size-12 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400 rounded-xl">
                        <Plus className="size-6" />
                     </div>
                     <h4 className="text-lg font-bold text-[#111827] dark:text-gray-100 ">{t('bridgeConnection')}</h4>
                  </div>
                  <form onSubmit={handleAddFacebookApp} className="flex flex-col gap-8">
                     <FieldGroup className="gap-6">
                        <Field>
                           <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('protocolAlias')}</FieldLabel>
                           <Input
                              type="text"
                              required
                              className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                              placeholder="e.g. Content Bridge v1"
                              value={fbAppName}
                              onChange={(e) => setFbAppName(e.target.value)}
                           />
                        </Field>
                        <Field>
                           <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('appId')}</FieldLabel>
                           <Input
                              type="text"
                              required
                              className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                              placeholder="Meta App ID"
                              value={fbAppId}
                              onChange={(e) => setFbAppId(e.target.value)}
                           />
                        </Field>
                        <Field>
                           <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('appSecret')}</FieldLabel>
                           <Input
                              type="password"
                              required
                              className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                              placeholder="Meta App Secret"
                              value={fbAppSecret}
                              onChange={(e) => setFbAppSecret(e.target.value)}
                           />
                        </Field>
                     </FieldGroup>
  
                     <Button
                        type="submit"
                        disabled={isSavingFb}
                        className="w-full bg-[#2563EB] text-white py-6 rounded-xl font-bold uppercase text-xs shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4 disabled:opacity-50 h-auto"
                     >
                        {isSavingFb ? <RefreshCw className="size-5 animate-spin" /> : <Plus className="size-5" />}
                        <span>{t('saveAndConnect')}</span>
                     </Button>
                  </form>
               </div>
            </div>
         </div>

         {/* Security Modal */}
         <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) setShowEditModal(false); }}>
            <DialogContent className="max-w-4xl sm:max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none" showCloseButton={false}>
               <DialogHeader className="sr-only">
                  <DialogTitle>Identity & Credentials Protocol</DialogTitle>
                  <DialogDescription>Modify security configurations and name identity</DialogDescription>
               </DialogHeader>

               <div className="nm-flat max-w-4xl w-full p-12 relative rounded-xl animate-in zoom-in-95 duration-300">
                  <Button onClick={() => setShowEditModal(false)} variant="ghost" size="icon" className="absolute top-10 right-10 size-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-colors rounded-xl p-0 hover:bg-transparent">
                     <X className="size-6" />
                  </Button>

                  <div className="mb-12">
                     <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100 ">{t('identityManagement')}</h3>
                     <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em] mt-3">{t('adminSecurityProtocol')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     {/* Profile Form */}
                     <div className="flex flex-col gap-10">
                        <div className="flex items-center gap-4">
                           <Fingerprint className="text-[#2563EB] dark:text-blue-400 size-6" />
                           <h4 className="text-xs font-bold text-[#111827] dark:text-gray-100 uppercase">{t('profileSettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdateInfo} className="flex flex-col gap-8">
                           <FieldGroup className="gap-6">
                              <Field>
                                 <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('officialName')}</FieldLabel>
                                 <Input type="text" required className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" value={editName} onChange={(e) => setEditName(e.target.value)} />
                              </Field>
                              <Field className="opacity-60">
                                 <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('authorizedEmail')}</FieldLabel>
                                 <Input type="email" disabled readOnly className="flex h-12 w-full rounded-lg border border-white/10 bg-slate-200/20 dark:bg-slate-950/20 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" value={user?.email || ''} />
                              </Field>
                           </FieldGroup>
                           <Button type="submit" disabled={isSavingInfo} className="w-full bg-emerald-500 text-white py-5 rounded-xl font-bold uppercase text-[10px] tracking-normal shadow-xl hover:brightness-110 disabled:opacity-50 h-auto">
                              {isSavingInfo ? <RefreshCw className="animate-spin mx-auto size-4" /> : t('updateIdentity')}
                           </Button>
                        </form>
                     </div>

                     {/* Security Form */}
                     <div className="flex flex-col gap-10">
                        <div className="flex items-center gap-4">
                           <Lock className="text-soft-pink size-6" />
                           <h4 className="text-xs font-bold text-[#111827] dark:text-gray-100 uppercase">{t('securitySettings')}</h4>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-8">
                           <FieldGroup className="gap-6">
                              <Field>
                                 <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('currentPasskey')}</FieldLabel>
                                 <Input type="password" required className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                              </Field>
                              <Field>
                                 <FieldLabel className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">{t('newAuthorityToken')}</FieldLabel>
                                 <Input type="password" required className="flex h-12 w-full rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 px-6 py-3 text-sm font-bold text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                              </Field>
                           </FieldGroup>
                           <Button type="submit" disabled={isSaving} className="w-full bg-[#2563EB] text-white py-5 rounded-xl font-bold uppercase text-[10px] tracking-normal shadow-xl hover:brightness-110 disabled:opacity-50 h-auto">
                              {isSaving ? <RefreshCw className="animate-spin mx-auto size-4" /> : t('modifyAuthCredentials')}
                           </Button>
                        </form>
                     </div>
                  </div>
                  {(success || error) && (
                     <div className={`mt-12 p-6 rounded-xl bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[10px] font-bold uppercase text-center ${success ? 'text-emerald-500' : 'text-soft-pink'}`}>
                        {success || error}
                     </div>
                  )}
               </div>
            </DialogContent>
         </Dialog>
      </div>
   );
};
