import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle2, Clock, Activity, TrendingUp, Users, DollarSign, BarChart3, ChevronRight, Zap, Target, Layers } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { Post } from '../../types';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';

export const DashboardView = ({ api, onViewLog }: { api: ApiService, onViewLog?: () => void }) => {
  const [stats, setStats] = useState({ totalFanpages: 0, totalPosts: 0, scheduledPosts: 0, totalWorkflows: 0, activeTopics: 0, growth: 0 });
  const [trends, setTrends] = useState<number[]>([]);
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
    <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-1000">
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
          { label: 'Total Nodes', val: stats.totalFanpages, icon: <Users size={32} />, color: 'text-soft-blue', bg: 'bg-soft-blue/5', trend: `+${stats.growth}%`, since: 'last week' },
          { label: 'Processed Data', val: stats.totalPosts, icon: <Zap size={32} />, color: 'text-soft-pink', bg: 'bg-soft-pink/5', trend: '+8.1%', since: 'last month' },
          { label: 'Scheduled Ops', val: stats.scheduledPosts, icon: <Clock size={32} />, color: 'text-indigo-500', bg: 'bg-indigo-500/5', trend: '+2.4%', since: 'sync completed' }
        ].map((s, idx) => (
          <div key={idx} className="nm-flat p-6 sm:p-10 flex flex-col justify-between min-h-[220px] sm:h-64 group cursor-pointer hover:scale-[1.02] transition-all rounded-[32px] sm:rounded-[48px]">
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
          
          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-8 px-2 sm:px-6 h-48 sm:h-72 mb-6 sm:mb-10">
             {trends.length > 0 ? trends.map((count, i) => {
               const max = Math.max(...trends, 1);
               const height = Math.max((count / max) * 100, 8); 
               const isActive = i === 3;
               return (
                 <div key={i} className="flex-1 flex flex-col items-center gap-3 sm:gap-6">
                    <div className="w-full relative group">
                      <div className={`w-full rounded-lg sm:rounded-[24px] transition-all duration-1000 ${isActive ? 'bg-soft-blue shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'nm-flat bg-soft-blue/10'}`} style={{ height: `${height}%` }}>
                         {isActive && <div className="absolute -top-10 left-1/2 -translate-x-1/2 nm-flat px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-black text-soft-blue">{count}</div>}
                      </div>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest opacity-40">{['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</span>
                 </div>
               );
             }) : (
               <div className="w-full h-full flex items-center justify-center nm-inset rounded-[24px] sm:rounded-[32px]">
                 <p className="text-[10px] sm:text-sm font-black text-text-muted uppercase tracking-[0.4em] opacity-20 animate-pulse">Neural data loading...</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Activity & Goals */}
        <div className="space-y-6 sm:space-y-12">
          <div className="nm-flat p-6 sm:p-10 flex flex-col h-[350px] sm:h-[450px] rounded-[40px] sm:rounded-[56px]">
             <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <Activity size={20} className="text-soft-blue" />
                  <h3 className="text-xl font-black text-text-primary tracking-tight uppercase">{t('recentActivity')}</h3>
               </div>
               <button onClick={onViewLog} className="w-10 h-10 nm-button flex items-center justify-center text-soft-blue hover:scale-110 transition-all">
                  <ChevronRight size={18} />
               </button>
             </div>
             
             <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-4">
                {recentPosts.slice(0, 6).map((post, idx) => (
                  <div key={idx} className="flex items-center gap-6 group cursor-pointer hover:translate-x-2 transition-all">
                    <div className="w-14 h-14 nm-flat flex items-center justify-center p-1 rounded-2xl">
                       <div className="w-full h-full rounded-xl nm-inset flex items-center justify-center">
                          <Layers size={16} className="text-soft-blue opacity-60 group-hover:opacity-100 transition-opacity" />
                       </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-text-primary truncate uppercase tracking-tight group-hover:text-soft-blue transition-colors">{post.topic}</p>
                      <div className="flex items-center gap-2 mt-1.5 opacity-50">
                         <Clock size={10} />
                         <p className="text-[9px] font-black text-text-muted uppercase">{new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {recentPosts.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 opacity-20">
                      <Layers size={40} className="mb-4" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">No tactical feed available</p>
                   </div>
                )}
             </div>
          </div>

          <div className="nm-flat bg-soft-blue p-10 rounded-[56px] relative overflow-hidden group">
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="text-2xl font-black tracking-tighter text-white uppercase">Neural Goal</h4>
                  <div className="nm-flat bg-white/20 px-4 py-2 rounded-2xl">
                     <span className="text-xs font-black text-white">82%</span>
                  </div>
               </div>
               <p className="text-sm font-bold text-white/80 leading-relaxed mb-8">System performance has reached <span className="text-white">82%</span> of weekly tactical threshold.</p>
               <div className="h-4 w-full nm-inset bg-black/10 rounded-full overflow-hidden p-1">
                  <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ width: '82%' }} />
               </div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[80px] -mr-24 -mt-24 rounded-full group-hover:scale-150 transition-all duration-1000" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 blur-[60px] -ml-16 -mb-16 rounded-full" />
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};
