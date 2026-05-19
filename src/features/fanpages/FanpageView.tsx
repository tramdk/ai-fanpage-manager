import React, { useState } from 'react';
import { Facebook, ExternalLink, Settings, Plus, LayoutGrid, List, RefreshCw, Trash2, Key, X, Info, ChevronRight, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { Fanpage } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiService } from '../../api';
import { Textarea } from '@/components/ui/textarea';

export const FanpageView = ({ fanpages, onConnect, onConfigure, api }: { fanpages: Fanpage[], onConnect: () => void, onConfigure: (id: string) => void, api: ApiService }) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [targetPage, setTargetPage] = useState<{ id: string, name: string } | null>(null);
  const [newToken, setNewToken] = useState('');
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.fanpages.refresh();
      window.location.reload();
    } catch (err) {
      console.warn(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`${t('revokeCredentials')} ${name}?`)) return;
    try {
      await api.fanpages.revoke(id);
      window.location.reload();
    } catch (err) {
      console.warn(err);
    }
  };

  const openTokenModal = (id: string, name: string) => {
    setTargetPage({ id, name });
    setNewToken('');
    setShowTokenModal(true);
  };

  const handleUpdateTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPage || !newToken.trim()) return;

    setIsUpdatingToken(true);
    try {
      await api.fanpages.updateToken(targetPage.id, newToken.trim());
      setShowTokenModal(false);
      window.location.reload();
    } catch (err: any) {
      alert('Lỗi cập nhật Token: ' + err.message);
    } finally {
      setIsUpdatingToken(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      {/* Dynamic Header */}
      <div className="nm-flat p-10 flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400">
            <Facebook size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#111827] dark:text-gray-100 er uppercase">{t('fanpages')}</h2>
            <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] mt-2">{t('managePages')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 w-full lg:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-14 h-14 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400 disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw size={22} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-1.5 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-12 h-12 rounded-lg transition-all duration-300 flex items-center justify-center
                ${viewMode === 'grid' ? 'border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[#2563EB] dark:text-blue-400' : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:text-gray-100'}
              `}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-12 h-12 rounded-lg transition-all duration-300 flex items-center justify-center
                ${viewMode === 'list' ? 'border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[#2563EB] dark:text-blue-400' : 'text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:text-gray-100'}
              `}
            >
              <List size={20} />
            </button>
          </div>

          <button
            onClick={onConnect}
            className="bg-[#2563EB] text-white px-10 py-5 rounded-xl font-bold uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-4"
          >
            <Plus size={18} />
            <span>{t('connectNewPage')}</span>
          </button>
        </div>
      </div>

      {fanpages.length === 0 ? (
        <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-32 text-center rounded-[60px]">
          <Facebook size={64} className="mx-auto mb-8 text-[#6B7280] dark:text-gray-400 opacity-10" />
          <p className="text-sm font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.3em]">{t('noData')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {fanpages.map((page) => {
            const isExpired = page.status === 'expired';
            return (
              <div key={page.id} className="nm-flat flex flex-col group transition-all duration-500 hover:scale-[1.02]">
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                      <Facebook size={28} />
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg text-[9px] font-bold uppercase ${isExpired ? 'text-soft-pink' : 'text-emerald-500'}`}>
                      {isExpired ? 'TOKEN EXPIRED' : 'ACTIVE'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-xl font-bold  truncate ${isExpired ? 'text-[#6B7280] dark:text-gray-400 line-through opacity-50' : 'text-[#111827] dark:text-gray-100'}`}>
                      {page.name}
                    </h3>
                    <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase mt-2">Page ID: {page.pageId}</p>
                  </div>
                </div>

                <div className="px-8 py-4 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg mx-8 rounded-lg flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('lastSync')}</span>
                  <span className="text-[10px] font-bold text-[#111827] dark:text-gray-100 italic">{new Date(page.connectedAt).toLocaleDateString()}</span>
                </div>

                <div className="p-8 pt-6 grid grid-cols-2 gap-4">
                  {isExpired ? (
                    <button
                      onClick={() => openTokenModal(page.id, page.name)}
                      className="col-span-2 bg-soft-pink text-white py-4 rounded-lg text-[10px] font-bold uppercase shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-3 animate-pulse"
                    >
                      <RefreshCw size={14} />
                      <span>{t('reconnect') || 'Kết nối lại'}</span>
                    </button>
                  ) : (
                    <>
                      <a
                        href={`https://facebook.com/${page.pageId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="border border-[#D1D5DB] dark:border-white/12 rounded-lg p-4 flex items-center justify-center text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400"
                        title={t('viewOnFB')}
                      >
                        <Globe size={18} />
                      </a>
                      <button
                        onClick={() => onConfigure(page.id)}
                        className="border border-[#D1D5DB] dark:border-white/12 rounded-lg p-4 flex items-center justify-center text-[#111827] dark:text-gray-100 hover:text-[#2563EB] dark:text-blue-400"
                        title={t('configureAutomation')}
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => openTokenModal(page.id, page.name)}
                        className="col-span-2 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-4 flex items-center justify-center text-[#2563EB] dark:text-blue-400 text-[10px] font-bold uppercase gap-3"
                      >
                        <Key size={16} />
                        <span>Update Access Token</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(page.id, page.name)}
                    className="col-span-2 p-3 text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em] hover:text-soft-pink transition-colors"
                  >
                    {t('revokeCredentials')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="nm-flat overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[#6B7280] dark:text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <th className="px-10 py-8">{t('fanpages')}</th>
                  <th className="px-10 py-8">Last Sync</th>
                  <th className="px-10 py-8">Status</th>
                  <th className="px-10 py-8 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text-muted/5">
                {fanpages.map((page) => (
                  <tr key={page.id} className="hover:bg-white/30 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                          <Facebook size={24} />
                        </div>
                        <div>
                          <h3 className={`text-base font-bold  leading-tight ${page.status === 'expired' ? 'text-[#6B7280] dark:text-gray-400 line-through opacity-50' : 'text-[#111827] dark:text-gray-100'}`}>{page.name}</h3>
                          <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase mt-2">ID: {page.pageId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-xs font-bold text-[#111827] dark:text-gray-100 italic">{new Date(page.connectedAt).toLocaleDateString()}</div>
                      <div className="text-[9px] text-[#6B7280] dark:text-gray-400 font-bold uppercase mt-1">LAST SYNC</div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={`bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg px-5 py-2 rounded-lg inline-flex items-center gap-3 text-[10px] font-bold uppercase ${page.status === 'expired' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                         <div className={`w-2 h-2 rounded-full ${page.status === 'expired' ? 'bg-soft-pink animate-pulse' : 'bg-emerald-500 '}`} />
                         {page.status || 'active'}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-4">
                          <button onClick={() => onConfigure(page.id)} className="w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400">
                             <Settings size={18} />
                          </button>
                          <button onClick={() => openTokenModal(page.id, page.name)} className="w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400">
                             <Key size={18} />
                          </button>
                          <button onClick={() => handleDelete(page.id, page.name)} className="w-11 h-11 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Token Update Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-[200] p-6">
          <div className="nm-flat max-w-2xl w-full p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowTokenModal(false)} className="absolute top-8 right-8 w-12 h-12 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-soft-pink transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-6 mb-10">
               <div className="w-16 h-16 nm-flat flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                  <ShieldCheck size={32} />
               </div>
               <div>
                  <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100  leading-none">Update Access Token</h3>
                  <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase mt-2">Updating Access: {targetPage?.name}</p>
               </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-8 rounded-xl space-y-6">
                <div className="flex items-center gap-3 text-[#2563EB] dark:text-blue-400">
                  <Info size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Update Instructions</span>
                </div>

                <div className="space-y-4">
                  {[
                    "Access Meta Developers & Graph API Explorer.",
                    "Authorize: pages_manage_posts, pages_read_engagement.",
                    "Select Fanpage.",
                    "Copy the long-lived Page Access Token."
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-lg nm-flat flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-[#2563EB] dark:text-blue-400">{i + 1}</div>
                      <p className="text-[11px] font-bold text-[#6B7280] dark:text-gray-400 pt-0.5 leading-relaxed ">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleUpdateTokenSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase ml-3">Page Access Token</label>
                  <Textarea
                    required
                    className="w-full min-h-[120px] p-6 font-mono text-xs rounded-lg border border-black/10 dark:border-white/10 bg-slate-200/50 dark:bg-slate-950/40 text-slate-900 dark:text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
                    placeholder="EAA..."
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                  />
                </div>

                <div className="flex gap-6">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="flex-1 border border-[#D1D5DB] dark:border-white/12 rounded-lg py-5 text-[10px] font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingToken || !newToken.trim()}
                    className="flex-[2] bg-[#2563EB] text-white py-5 rounded-xl font-bold uppercase text-[11px] shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
                  >
                    {isUpdatingToken ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 size={20} />}
                    <span>{isUpdatingToken ? 'SAVING...' : 'UPDATE TOKEN'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
