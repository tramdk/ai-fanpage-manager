import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle2, Clock, Activity } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Post } from '../types';
import { useLanguage } from '../LanguageContext';
import { ApiService } from '../api';

export const DashboardView = ({ api }: { api: ApiService }) => {
  const [stats, setStats] = useState({ totalFanpages: 0, totalPosts: 0, scheduledPosts: 0 });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await api.dashboard.getOverview();
        setStats(data.stats);
        setRecentPosts(data.recentPosts);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [api]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 p-8 rounded-[24px] border border-slate-800 flex items-center space-x-6 transition-all hover:border-emerald-500/50 group">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-[18px] group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <Facebook className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">{t('activeFanpages')}</p>
            <h3 className="text-3xl font-extrabold text-slate-50 mt-1">{stats.totalFanpages}</h3>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[24px] border border-slate-800 flex items-center space-x-6 transition-all hover:border-indigo-500/50 group">
          <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-[18px] group-hover:bg-indigo-500 group-hover:text-white transition-all">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">{t('statusActive')}</p>
            <h3 className="text-3xl font-extrabold text-slate-50 mt-1">{stats.totalPosts}</h3>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[24px] border border-slate-800 flex items-center space-x-6 transition-all hover:border-amber-500/50 group">
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-[18px] group-hover:bg-amber-600 group-hover:text-white transition-all">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">{t('scheduledPosts')}</p>
            <h3 className="text-3xl font-extrabold text-slate-50 mt-1">{stats.scheduledPosts}</h3>
          </div>
        </div>
      </div>

      {/* Recent Posts Table */}
      <div className="bg-slate-900 rounded-[28px] border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-xl font-bold text-slate-50 flex items-center tracking-tight">
            <Activity className="w-5 h-5 mr-3 text-emerald-500" />
            {t('history')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-5">{t('promptInstructions')}</th>
                <th className="px-10 py-5">{t('topicsKeywords')}</th>
                <th className="px-10 py-5">{t('fanpages')}</th>
                <th className="px-10 py-5">{t('lastSync')}</th>
                <th className="px-10 py-5 text-right">{t('statusActive')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center text-slate-600">
                    <p className="text-base font-bold uppercase tracking-widest">{t('noData')}</p>
                  </td>
                </tr>
              ) : (
                recentPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-800/40 transition-all group">
                    <td className="px-10 py-7 text-sm font-medium text-slate-400 max-w-xs truncate group-hover:text-slate-200">
                      <span className="opacity-60 italic">"{post.content}"</span>
                    </td>
                    <td className="px-10 py-7">
                       <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-700">{post.topic}</span>
                    </td>
                    <td className="px-10 py-7 text-sm font-bold text-slate-300">{post.fanpageName}</td>
                    <td className="px-10 py-7">
                        <div className="text-sm font-bold text-slate-200 font-mono tracking-tight">{new Date(post.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="px-10 py-7 text-right"><StatusBadge status={post.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
