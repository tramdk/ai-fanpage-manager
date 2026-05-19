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
          <Activity className="w-16 h-16 text-[#2563EB] dark:text-blue-400 animate-pulse opacity-40" />
          <div className="absolute inset-0 border-4 border-soft-blue/10 border-t-soft-blue rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">Syncing Tactile Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#111827] dark:text-gray-100 ">{t('workspaceOverview')}</h2>
          <p className="text-[14px] text-[#6B7280] dark:text-gray-400">{t('workspaceSub')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { label: t('activeFanpages'), val: stats.totalFanpages, icon: <Target size={18} strokeWidth={1.5} />, trend: `${stats.growth > 0 ? '+' : ''}${stats.growth}%`, since: t('growthComparison') },
          { label: t('statusPublished'), val: stats.totalPosts, icon: <Zap size={18} strokeWidth={1.5} />, trend: stats.errorPosts > 0 ? `-${stats.errorPosts} errors` : 'Stable', since: 'operational health' },
          { label: t('aiInteractions'), val: stats.totalVideos, icon: <Video size={18} strokeWidth={1.5} />, trend: `Active`, since: 'neural synthesis' },
          { label: t('totalWorkflows'), val: stats.totalSchedules, icon: <Activity size={18} strokeWidth={1.5} />, trend: 'Running', since: 'scheduled ops' },
          { label: t('statusQueued'), val: stats.scheduledPosts, icon: <Clock size={18} strokeWidth={1.5} />, trend: 'Queued', since: 'awaiting sync' },
          { label: t('totalWorkflows'), val: stats.totalWorkflows, icon: <Layers size={18} strokeWidth={1.5} />, trend: 'Active', since: 'system architecture' }
        ].map((s, idx) => {
          const dotColors = ['bg-blue-500','bg-emerald-500','bg-indigo-500','bg-emerald-500','bg-amber-500','bg-purple-500'];
          const tagBg = ['bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300','bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300','bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300','bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300','bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300','bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300'];
          return (
            <div key={idx} className="nm-flat p-5 flex flex-col justify-between min-h-[140px]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-[#6B7280] dark:text-gray-400 mb-1 uppercase tracking-[1px]">{s.label}</p>
                  <h3 className="text-2xl font-bold text-[#111827] dark:text-gray-100">{s.val.toLocaleString()}</h3>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 flex items-center justify-center text-[#6B7280] dark:text-gray-400 shrink-0">
                  {s.icon}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 ${tagBg[idx]}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColors[idx]}`}></div>
                  <span className="text-[11px] font-semibold leading-none">{s.trend}</span>
                </div>
                <span className="text-[11px] text-[#6B7280] dark:text-gray-400">{s.since}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Performance Trend Chart */}
        <div className="lg:col-span-1 xl:col-span-2 nm-flat p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#111827] dark:text-gray-100">{t('performanceTrends')}</h3>
              <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">Monthly tactical overview and data growth</p>
            </div>
            <div className="border border-[#D1D5DB] dark:border-white/12 p-1 flex gap-1 rounded-lg self-start sm:self-auto">
              {['week', 'month'].map(p => (
                <button 
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${period === p ? 'bg-[#F3F4F6] dark:bg-white/8 text-[#111827] dark:text-white' : 'text-[#6B7280] hover:text-[#111827] dark:hover:text-gray-200'}`}
                >
                  {t(p)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 flex items-end justify-between gap-1 sm:gap-3 h-40 sm:h-48 mb-3">
             {trends.length > 0 ? trends.map((item, i) => {
               const max = Math.max(...trends.map(t => Math.max(t.created, t.published)), 1);
               const createdHeight = (item.created / max) * 100;
               const publishedHeight = (item.published / max) * 100;
               
               return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                    <div className="w-full relative group flex items-end justify-center gap-0.5 sm:gap-1 h-[80%]">
                      <div 
                        className="w-2 sm:w-4 bg-blue-100 dark:bg-blue-900/30 rounded-t transition-all duration-700 relative group/bar" 
                        style={{ height: `${Math.max(createdHeight, 4)}%` }}
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1D1F] text-white text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 whitespace-nowrap">
                           {item.created}
                         </div>
                      </div>
                      <div 
                        className="w-2 sm:w-4 bg-emerald-500 dark:bg-emerald-400 rounded-t transition-all duration-700 relative group/bar" 
                        style={{ height: `${Math.max(publishedHeight, 4)}%` }}
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1D1F] text-white text-[10px] font-medium px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 whitespace-nowrap">
                           {item.published}
                         </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-[#6B7280] dark:text-gray-400">{item.label}</span>
                 </div>
               );
             }) : (
               <div className="w-full h-full flex items-center justify-center">
                 <p className="text-[13px] text-[#6B7280] dark:text-gray-400">No data available</p>
               </div>
             )}
          </div>

          {/* Chart Legend */}
          <div className="flex justify-center gap-6 pt-2 border-t border-[#F3F4F6] dark:border-white/5">
             <div className="flex items-center gap-2 mt-2">
                <div className="w-2.5 h-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-sm"></div>
                <span className="text-[11px] font-medium text-[#6B7280] dark:text-gray-400">{t('nodesCreated')}</span>
             </div>
             <div className="flex items-center gap-2 mt-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-sm"></div>
                <span className="text-[11px] font-medium text-[#6B7280] dark:text-gray-400">{t('nodesPublished')}</span>
             </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="nm-flat p-5 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 flex items-center justify-center text-[#6B7280]">
                   <Activity size={16} strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-bold text-[#111827] dark:text-gray-100">{t('recentActivity')}</h3>
             </div>
             <button className="w-8 h-8 rounded-lg border border-[#D1D5DB] dark:border-white/12 flex items-center justify-center text-[#6B7280] hover:text-[#111827] dark:hover:text-gray-200 transition-colors">
                <ChevronRight size={16} />
             </button>
          </div>

          <div className="flex-1 divide-y divide-[#F3F4F6] dark:divide-white/5 overflow-y-auto pr-1 custom-scrollbar">
             {recentPosts.length > 0 ? recentPosts.map((post) => (
               <div key={post.id} className="py-3 flex items-center gap-3 hover:bg-[#F9FAFB] dark:hover:bg-white/3 transition-colors rounded-lg px-2 -mx-2">
                  <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 flex items-center justify-center text-[#6B7280] shrink-0">
                     {post.hasVideo ? <Video size={16} strokeWidth={1.5} /> : <Layers size={16} strokeWidth={1.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                     <h4 className="text-[13px] font-semibold text-[#111827] dark:text-gray-100 truncate">{post.topic}</h4>
                     <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-[#6B7280] dark:text-gray-400 flex items-center gap-1">
                           <Clock size={10} /> {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[11px] text-[#2563EB] dark:text-blue-400 font-medium">{post.fanpageName}</span>
                     </div>
                  </div>
               </div>
             )) : (
               <div className="flex flex-col items-center justify-center py-16">
                  <Activity size={32} className="mb-3 text-[#D1D5DB]" />
                  <p className="text-[12px] text-[#6B7280]">{t('noData')}</p>
               </div>
             )}
          </div>

          <button onClick={onViewLog} className="mt-3 w-full border border-[#D1D5DB] dark:border-white/12 rounded-lg py-2 text-[12px] font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-white/5 transition-colors">
             {t('viewLog')}
          </button>
        </div>
      </div>
    </div>
  );
};
