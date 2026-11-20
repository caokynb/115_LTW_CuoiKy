import React from 'react';

const formatCurrency = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

export function RevenueChart({ title, data = [], labelKey, emptyMessage = 'Chưa có dữ liệu trong khoảng ngày này.' }) {
  const maxRevenue = Math.max(...data.map((item) => Number(item.totalRevenue) || 0), 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="mt-5 flex min-h-64 items-end gap-3 overflow-x-auto pb-2" role="img" aria-label={title}>
          {data.map((item, index) => {
            const revenue = Number(item.totalRevenue) || 0;
            const height = maxRevenue > 0 ? Math.max((revenue / maxRevenue) * 100, 2) : 0;
            const label = item[labelKey] || 'Không rõ';

            return (
              <div key={`${label}-${index}`} className="flex h-60 min-w-20 flex-1 flex-col items-center justify-end gap-2">
                <span className="max-w-24 truncate text-center text-[10px] text-slate-500 dark:text-slate-400" title={formatCurrency(revenue)}>
                  {formatCurrency(revenue)}
                </span>
                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    className="w-8 rounded-t-md bg-brand-600 transition-[height]"
                    style={{ height: `${height}%` }}
                    title={`${label}: ${formatCurrency(revenue)}`}
                  />
                </div>
                <span className="max-w-24 truncate text-center text-xs font-medium text-slate-700 dark:text-slate-200" title={label}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default RevenueChart;
