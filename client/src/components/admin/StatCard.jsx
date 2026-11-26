import React from 'react';

export function StatCard({ title, value, note }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</h2>
      <p className="mt-3 break-words text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      {note && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
    </article>
  );
}

export default StatCard;
