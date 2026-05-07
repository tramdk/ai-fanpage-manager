import React, { useState } from 'react';
import { Facebook, ExternalLink, Settings, Plus, LayoutGrid, List, RefreshCw, Trash2, Key, X, Info, ChevronRight, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { Fanpage } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiService } from '../../api';

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
          <div className="w-16 h-16 nm-flat flex items-center justify-center text-soft-blue">
            <Facebook size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase">{t('fanpages')}</h2>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mt-2">{t('managePages')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 w-full lg:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-14 h-14 nm-button flex items-center justify-center text-soft-blue disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw size={22} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <div className="nm-inset p-1.5 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-12 h-12 rounded-2xl transition-all duration-300 flex items-center justify-center
                ${viewMode === 'grid' ? 'nm-button text-soft-blue' : 'text-text-muted hover:text-text-primary'}
              `}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-12 h-12 rounded-2xl transition-all duration-300 flex items-center justify-center
                ${viewMode === 'list' ? 'nm-button text-soft-blue' : 'text-text-muted hover:text-text-primary'}
              `}
            >
              <List size={20} />
            </button>
          </div>

          <button
            onClick={onConnect}
            className="bg-soft-blue text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-4"
          >
            <Plus size={18} />
            <span>{t('connectNewPage')}</span>
          </button>
        </div>
      </div>

      {fanpages.length === 0 ? (
        <div className="nm-inset p-32 text-center rounded-[60px]">
          <Facebook size={64} className="mx-auto mb-8 text-text-muted opacity-10" />
          <p className="text-sm font-black text-text-muted uppercase tracking-[0.3em]">{t('noData')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {fanpages.map((page) => {
            const isExpired = page.status === 'expired';
            return (
              <div key={page.id} className="nm-flat flex flex-col group transition-all duration-500 hover:scale-[1.02]">
                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 nm-inset flex items-center justify-center text-soft-blue">
                      <Facebook size={28} />
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl nm-inset text-[9px] font-black uppercase tracking-widest ${isExpired ? 'text-soft-pink' : 'text-emerald-500'}`}>
                      {isExpired ? 'TOKEN EXPIRED' : 'ACTIVE'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-xl font-black uppercase tracking-tight truncate ${isExpired ? 'text-text-muted line-through opacity-50' : 'text-text-primary'}`}>
                      {page.name}
                    </h3>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">Page ID: {page.pageId}</p>
                  </div>
                </div>

                <div className="px-8 py-4 nm-inset mx-8 rounded-2xl flex items-center justify-between">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{t('lastSync')}</span>
                  <span className="text-[10px] font-black text-text-primary italic">{new Date(page.connectedAt).toLocaleDateString()}</span>
                </div>

                <div className="p-8 pt-6 grid grid-cols-2 gap-4">
                  {isExpired ? (
                    <button
                      onClick={() => openTokenModal(page.id, page.name)}
                      className="col-span-2 bg-soft-pink text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-3 animate-pulse"
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
                        className="nm-button p-4 flex items-center justify-center text-text-primary hover:text-soft-blue"
                        title={t('viewOnFB')}
                      >
                        <Globe size={18} />
                      </a>
                      <button
                        onClick={() => onConfigure(page.id)}
                        className="nm-button p-4 flex items-center justify-center text-text-primary hover:text-soft-blue"
                        title={t('configureAutomation')}
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => openTokenModal(page.id, page.name)}
                        className="col-span-2 nm-button p-4 flex items-center justify-center text-soft-blue text-[10px] font-black uppercase tracking-widest gap-3"
                      >
                        <Key size={16} />
                        <span>Update Access Token</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(page.id, page.name)}
                    className="col-span-2 p-3 text-[9px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-soft-pink transition-colors"
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
                <tr className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
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
                        <div className="w-14 h-14 nm-inset flex items-center justify-center text-soft-blue">
                          <Facebook size={24} />
                        </div>
                        <div>
                          <h3 className={`text-base font-black uppercase tracking-tight leading-tight ${page.status === 'expired' ? 'text-text-muted line-through opacity-50' : 'text-text-primary'}`}>{page.name}</h3>
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">ID: {page.pageId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-xs font-black text-text-primary italic">{new Date(page.connectedAt).toLocaleDateString()}</div>
                      <div className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">LAST SYNC</div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={`nm-inset px-5 py-2 rounded-2xl inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${page.status === 'expired' ? 'text-soft-pink' : 'text-emerald-500'}`}>
                         <div className={`w-2 h-2 rounded-full ${page.status === 'expired' ? 'bg-soft-pink animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                         {page.status || 'active'}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-4">
                          <button onClick={() => onConfigure(page.id)} className="w-11 h-11 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue">
                             <Settings size={18} />
                          </button>
                          <button onClick={() => openTokenModal(page.id, page.name)} className="w-11 h-11 nm-button flex items-center justify-center text-text-secondary hover:text-soft-blue">
                             <Key size={18} />
                          </button>
                          <button onClick={() => handleDelete(page.id, page.name)} className="w-11 h-11 nm-button flex items-center justify-center text-text-secondary hover:text-soft-pink">
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
            <button onClick={() => setShowTokenModal(false)} className="absolute top-8 right-8 w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-pink transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-6 mb-10">
               <div className="w-16 h-16 nm-flat flex items-center justify-center text-soft-blue">
                  <ShieldCheck size={32} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight leading-none">Update Access Token</h3>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-2">Updating Access: {targetPage?.name}</p>
               </div>
            </div>

            <div className="space-y-8">
              <div className="nm-inset p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-3 text-soft-blue">
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Update Instructions</span>
                </div>

                <div className="space-y-4">
                  {[
                    "Access Meta Developers & Graph API Explorer.",
                    "Authorize: pages_manage_posts, pages_read_engagement.",
                    "Select Fanpage.",
                    "Copy the long-lived Page Access Token."
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-lg nm-flat flex flex-shrink-0 items-center justify-center text-[10px] font-black text-soft-blue">{i + 1}</div>
                      <p className="text-[11px] font-bold text-text-secondary pt-0.5 leading-relaxed uppercase tracking-tight">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleUpdateTokenSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-3">Page Access Token</label>
                  <textarea
                    required
                    className="nm-input min-h-[120px] font-mono text-xs p-6"
                    placeholder="EAA..."
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                  />
                </div>

                <div className="flex gap-6">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="flex-1 nm-button py-5 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingToken || !newToken.trim()}
                    className="flex-[2] bg-soft-blue text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
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
