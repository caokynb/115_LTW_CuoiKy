import React from 'react';

export function StatCard({ title, value, note }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h2>
      <p className="mt-3 break-words text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    </article>
  );
}

export default StatCard;
