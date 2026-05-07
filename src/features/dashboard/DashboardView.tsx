import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle2, Clock, Activity, TrendingUp, Users, DollarSign, BarChart3, ChevronRight, Zap, Target, Layers, Video } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { Post } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';

export const DashboardView = ({ api, onViewLog }: { api: ApiService, onViewLog?: () => void }) => {
  const [stats, setStats] = useState({ 
    totalFanpages: 0, 
    totalPosts: 0, 
    scheduledPosts: 0, 
    errorPosts: 0,
    totalSchedules: 0,
    totalVideos: 0,
    totalWorkflows: 0, 
    activeTopics: 0, 
    growth: 0 
  });
  const [trends, setTrends] = useState<{ label: string, created: number, published: number }[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overview, workflows, topics] = await Promise.all([
          api.dashboard.getOverview(period),
          api.workflows.list(),
          api.topics.list()
        ]);

        setStats({
          ...overview.stats,
          totalWorkflows: workflows.length,
          activeTopics: topics.length
        });
        setTrends(overview.trends || []);
        setRecentPosts(overview.recentPosts);
      } catch (err) {
        console.warn('Failed to fetch dashboard data', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [api, period]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[600px] gap-8">
        <div className="relative">
          <Activity className="w-16 h-16 text-soft-blue animate-pulse opacity-40" />
          <div className="absolute inset-0 border-4 border-soft-blue/10 border-t-soft-blue rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Syncing Tactile Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 h-[calc(100vh-120px)] overflow-y-auto pr-4 custom-scrollbar pb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-3">
          <h2 className="text-5xl font-black text-text-primary tracking-tighter leading-none">{t('workspaceOverview')}</h2>
          <div className="flex items-center gap-4">
             <div className="h-1.5 w-16 bg-soft-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
             <p className="text-sm font-semibold text-text-muted tracking-wide">{t('workspaceSub')}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-12">
        {[
          { label: t('activeFanpages'), val: stats.totalFanpages, icon: <Target size={32} />, color: 'text-soft-blue', bg: 'bg-soft-blue/5', trend: `${stats.growth > 0 ? '+' : ''}${stats.growth}%`, since: t('growthComparison') },
          { label: t('statusPublished'), val: stats.totalPosts, icon: <Zap size={32} />, color: 'text-soft-pink', bg: 'bg-soft-pink/5', trend: stats.errorPosts > 0 ? `-${stats.errorPosts} errors` : 'Stable', since: 'operational health' },
          { label: t('aiInteractions'), val: stats.totalVideos, icon: <Video size={32} />, color: 'text-indigo-500', bg: 'bg-indigo-500/5', trend: `Active`, since: 'neural synthesis' },
          { label: t('totalWorkflows'), val: stats.totalSchedules, icon: <Activity size={32} />, color: 'text-emerald-500', bg: 'bg-emerald-500/5', trend: 'Running', since: 'scheduled ops' },
          { label: t('statusQueued'), val: stats.scheduledPosts, icon: <Clock size={32} />, color: 'text-amber-500', bg: 'bg-amber-500/5', trend: 'Queued', since: 'awaiting sync' },
          { label: t('totalWorkflows'), val: stats.totalWorkflows, icon: <Layers size={32} />, color: 'text-purple-500', bg: 'bg-purple-500/5', trend: 'Active', since: 'system architecture' }
        ].map((s, idx) => (
          <div key={idx} className="nm-flat p-6 sm:p-10 flex flex-col justify-between min-h-[200px] group cursor-pointer hover:scale-[1.02] transition-all rounded-[32px] sm:rounded-[40px]">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] sm:text-sm font-bold text-text-muted uppercase tracking-widest mb-1 sm:mb-2 opacity-60">{s.label}</p>
                  <h3 className="text-4xl sm:text-6xl font-black text-text-primary tracking-tighter">{s.val.toLocaleString()}</h3>
               </div>
               <div className={`w-14 h-14 sm:w-20 sm:h-20 nm-flat flex items-center justify-center ${s.bg} group-hover:scale-110 transition-transform duration-500`}>
                 <div className={s.color}>{s.icon}</div>
               </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-0">
               <div className="nm-inset px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="text-[10px] sm:text-sm font-bold text-emerald-500">{s.trend}</span>
               </div>
               <span className="text-[10px] sm:text-sm font-semibold text-text-muted opacity-80">{s.since}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-12">
        {/* Performance Trend Chart */}
        <div className="lg:col-span-1 xl:col-span-2 nm-flat p-6 sm:p-12 flex flex-col rounded-[40px] sm:rounded-[64px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 sm:mb-16">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">{t('performanceTrends')}</h3>
              <p className="text-sm sm:text-base font-semibold text-text-muted mt-1 sm:mt-2 opacity-80">Monthly tactical overview and data growth</p>
            </div>
            <div className="nm-inset p-1.5 sm:p-2 flex gap-1 sm:gap-2 rounded-2xl sm:rounded-3xl self-start sm:self-auto">
              {['week', 'month'].map(p => (
                <button 
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-8 py-3 text-[10px] font-black uppercase rounded-2xl transition-all ${period === p ? 'nm-flat text-soft-blue' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {t(p)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-4 h-48 sm:h-60 mb-4 sm:mb-6">
             {trends.length > 0 ? trends.map((item, i) => {
               const max = Math.max(...trends.map(t => Math.max(t.created, t.published)), 1);
               const createdHeight = (item.created / max) * 100;
               const publishedHeight = (item.published / max) * 100;
               
               return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-3 sm:gap-6">
                    <div className="w-full relative group flex items-end justify-center gap-1 sm:gap-2 h-[80%]">
                      {/* Created Column */}
                      <div 
                        className="w-2 sm:w-6 bg-soft-blue/20 nm-flat rounded-t-md sm:rounded-t-xl transition-all duration-1000 relative group/bar" 
                        style={{ height: `${Math.max(createdHeight, 4)}%` }}
                      >
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-soft-blue text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 whitespace-nowrap">
                           Created: {item.created}
                         </div>
                      </div>
                      {/* Published Column */}
                      <div 
                        className="w-2 sm:w-6 bg-emerald-500 rounded-t-md sm:rounded-t-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-1000 relative group/bar" 
                        style={{ height: `${Math.max(publishedHeight, 4)}%` }}
                      >
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 whitespace-nowrap">
                           Pub: {item.published}
                         </div>
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-black text-text-muted uppercase tracking-widest opacity-60">{item.label}</span>
                 </div>
               );
             }) : (
               <div className="w-full h-full flex items-center justify-center nm-inset rounded-[24px] sm:rounded-[32px]">
                 <p className="text-[10px] sm:text-sm font-black text-text-muted uppercase tracking-[0.4em] opacity-20 animate-pulse">Neural data loading...</p>
               </div>
             )}
          </div>

          {/* Chart Legend */}
          <div className="flex justify-center gap-8 pb-2">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-soft-blue/40 rounded-sm"></div>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('nodesCreated')}</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('nodesPublished')}</span>
             </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="nm-flat rounded-[48px] p-8 flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 nm-flat flex items-center justify-center text-soft-blue">
                   <Activity size={24} />
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">{t('recentActivity')}</h3>
             </div>
             <button className="w-12 h-12 nm-button flex items-center justify-center text-text-muted hover:text-soft-blue transition-all">
                <ChevronRight size={24} />
             </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
             {recentPosts.length > 0 ? recentPosts.map((post) => (
               <div key={post.id} className="nm-inset p-6 rounded-[32px] flex items-center gap-6 group hover:scale-[1.02] transition-all">
                  <div className="w-14 h-14 nm-flat flex items-center justify-center text-text-muted group-hover:text-soft-blue transition-colors rounded-2xl">
                     {post.hasVideo ? <Video size={24} /> : <Layers size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-black text-text-primary uppercase tracking-tight truncate">{post.topic}</h4>
                     <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                           <Clock size={12} /> {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="w-1 h-1 bg-text-muted/20 rounded-full"></div>
                        <span className="text-[10px] font-bold text-soft-blue uppercase tracking-widest">{post.fanpageName}</span>
                     </div>
                  </div>
               </div>
             )) : (
               <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Activity size={48} className="mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">{t('noData')}</p>
               </div>
             )}
          </div>

          <button onClick={onViewLog} className="mt-6 w-full nm-button py-4 text-[10px] font-black text-text-muted hover:text-soft-blue uppercase tracking-widest transition-all">
             {t('viewLog')}
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};
