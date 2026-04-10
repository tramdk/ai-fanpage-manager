import React, { useState } from 'react';
import { Facebook, ExternalLink, Settings, Plus, LayoutGrid, List, RefreshCw, Trash2, Key, X, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Fanpage } from '../types';
import { useLanguage } from '../LanguageContext';
import { StatusBadge } from './StatusBadge';
import { ApiService } from '../api';

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
      console.error(err);
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
      console.error(err);
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
      alert('Cập nhật Token thành công!');
      setShowTokenModal(false);
      window.location.reload();
    } catch (err: any) {
      alert('Lỗi cập nhật Token: ' + err.message);
    } finally {
      setIsUpdatingToken(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Dynamic Header */}
      <div className="bg-slate-900 rounded-[32px] border border-slate-800 p-8 lg:p-10 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="flex items-center space-x-6 mb-8 md:mb-0 relative z-10">
          <div className="p-4 bg-emerald-500 text-white rounded-[20px] shadow-xl shadow-emerald-500/20">
            <Facebook className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-50 tracking-tight uppercase leading-none">{t('fanpages')}</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{t('managePages')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto relative z-10">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-emerald-500 transition-all disabled:opacity-50 border border-slate-700"
            title={t('refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="bg-slate-800 p-1.5 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-emerald-500 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              title={t('gridView')}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-700 text-emerald-500 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              title={t('listView')}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onConnect}
            className="flex-1 md:flex-none bg-emerald-500 text-white px-8 py-4 rounded-[18px] font-bold uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-3"
          >
            <Plus className="w-4 h-4" />
            <span>{t('connectNewPage')}</span>
          </button>
        </div>
      </div>

      {fanpages.length === 0 ? (
        <div className="bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-800 p-24 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-slate-700 border border-slate-800">
            <Facebook className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">{t('noData')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fanpages.map((page) => (
            <div key={page.id} className="bg-slate-900 rounded-[32px] border border-slate-800 hover:border-emerald-500/30 transition-all duration-500 group overflow-hidden flex flex-col relative">
              <div className="p-8 pb-4 flex items-start justify-between">
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-slate-800 rounded-[20px] flex items-center justify-center border border-slate-700 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-500">
                    <Facebook className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-lg font-bold truncate uppercase tracking-tight leading-tight ${page.status === 'expired' ? 'text-red-500/80 line-through' : 'text-slate-50'}`}>{page.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                       ID: {page.id} {page.status === 'expired' && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[9px] font-black border border-red-500/20">EXPIRED</span>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-4 border-t border-slate-800/50 bg-slate-950/20 flex-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>{t('lastSync')}</span>
                  <span className="text-slate-300 font-mono italic">{new Date(page.connectedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-8 pt-4 grid grid-cols-2 gap-4">
                {page.status === 'expired' ? (
                  <button
                    onClick={() => openTokenModal(page.id, page.name)}
                    className="flex items-center justify-center space-x-2 p-3.5 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-red-600 transition-all shadow-lg shadow-red-500/20 col-span-2 animate-pulse"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('reconnect') || 'Kết nối lại'}</span>
                  </button>
                ) : (
                  <>
                  <a
                    href={`https://facebook.com/${page.pageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 p-3.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 hover:text-slate-950 transition-all border border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('viewOnFB')}</span>
                  </a>
                  <button
                    onClick={() => onConfigure(page.id)}
                    className="flex items-center justify-center space-x-2 p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{t('configureAutomation')}</span>
                  </button>
                  <button
                    onClick={() => openTokenModal(page.id, page.name)}
                    className="flex items-center justify-center space-x-2 p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 col-span-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Update Token</span>
                  </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-[28px] border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">{t('fanpages')}</th>
                  <th className="px-8 py-5">{t('lastSync')}</th>
                  <th className="px-8 py-5">{t('statusActive')}</th>
                  <th className="px-8 py-5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {fanpages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/30 transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                          <Facebook className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className={`text-base font-bold uppercase tracking-tight leading-tight ${page.status === 'expired' ? 'text-red-500/80 line-through' : 'text-slate-50'}`}>{page.name}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 italic">ID: {page.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-slate-300 font-mono italic">{new Date(page.connectedAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">CONNECTED AT</div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={page.status || 'active'} />
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                       {page.status === 'expired' ? (
                        <button
                          onClick={() => openTokenModal(page.id, page.name)}
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 hover:text-red-600 transition-all animate-pulse"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t('reconnect') || 'Kết nối lại'}</span>
                        </button>
                      ) : (
                        <>
                        <button
                          onClick={() => openTokenModal(page.id, page.name)}
                          className="inline-flex items-center justify-center p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                          title="Update Token"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://facebook.com/${page.pageId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-2.5 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-50 hover:text-slate-950 transition-all border border-slate-700"
                          title={t('viewOnFB')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onConfigure(page.id)}
                          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>{t('configureAutomation')}</span>
                        </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(page.id, page.name)}
                        className="inline-flex items-center justify-center p-2.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                        title={t('revoke')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[200] p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] shadow-3xl max-w-2xl w-full my-auto animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
            
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center relative z-10">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20"><Key size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-50 uppercase tracking-tight leading-none">Cập nhật Access Token</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Target Node: {targetPage?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowTokenModal(false)} className="p-2 text-slate-600 hover:text-slate-400 transition-all"><X size={24} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-10 space-y-8 relative z-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center space-x-3 text-emerald-500">
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hướng dẫn lấy Token vĩnh viễn</span>
                </div>
                
                <div className="space-y-4">
                  {[
                    "Truy cập Meta for Developers và mở Graph API Explorer.",
                    "Chọn App và User Access Token với các quyền: pages_manage_posts, pages_read_engagement, pages_show_list.",
                    "Tại mục 'User or Page', chọn đúng Fanpage để hệ thống tự động sinh Page Access Token.",
                    "Để lấy Token vĩnh viễn: Bạn cần lấy long-lived User Token (60 ngày) trước, sau đó dùng nó để lấy Page Token. Page Token này sẽ không bao giờ hết hạn."
                  ].map((step, i) => (
                    <div key={i} className="flex items-start space-x-4 group">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex flex-shrink-0 items-center justify-center text-[10px] font-black text-emerald-500 group-hover:border-emerald-500/50 transition-all">{i + 1}</div>
                      <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors pt-0.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-3xl border-l-4 border-l-amber-500/50 flex space-x-4">
                 <div className="text-amber-500"><Info size={20} /></div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-tight">
                    Lưu ý: Nếu bạn sử dụng App của riêng mình, Token sẽ an toàn hơn. Tuyệt đối không chia sẻ Token này cho người không có quyền quản trị.
                 </p>
              </div>

              <form onSubmit={handleUpdateTokenSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Nhập Access Token Mới</label>
                  <textarea 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-5 text-sm font-bold text-slate-200 outline-none focus:border-emerald-500/50 transition-all resize-none min-h-[120px] placeholder:text-slate-600" 
                    placeholder="Dán Page Access Token của bạn tại đây..."
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="flex-1 px-8 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingToken || !newToken.trim()}
                    className="flex-[2] bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-3 disabled:opacity-30"
                  >
                    {isUpdatingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isUpdatingToken ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
          <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}</style>
        </div>
      )}
    </div>
  );
};
