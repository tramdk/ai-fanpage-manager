import React from 'react';
import { useLanguage } from '../LanguageContext';

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    posted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    published: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-text-secondary border-slate-500/20',
    paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    queued: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    expired: 'bg-red-500/10 text-red-500 border-red-500/40 font-black',
  };

  const labels: Record<string, string> = {
    active: t('statusActive'),
    posted: t('statusPosted'),
    published: t('statusPublished'),
    inactive: t('statusInactive'),
    paused: t('statusPaused'),
    scheduled: t('statusScheduled'),
    queued: t('statusQueued'),
    failed: t('statusFailed'),
    expired: 'EXPIRED (ERROR)',
  };

  const style = styles[status] || styles.inactive;
  const label = labels[status] || status;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${style}`}>
      {label}
    </span>
  );
};
