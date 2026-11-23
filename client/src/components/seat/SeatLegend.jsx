import React from 'react';

const formatVND = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) return '';
  return ` (${new Intl.NumberFormat('vi-VN').format(amount)}đ)`;
};

export function SeatLegend({ standardPrice, vipPrice, className = '' }) {
  const legendItems = [
    {
      id: 'standard',
      label: `Ghế thường${formatVND(standardPrice)}`,
      boxClass:
        'bg-white text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    },
    {
      id: 'vip',
      label: `Ghế VIP${formatVND(vipPrice)}`,
      boxClass:
        'bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600',
    },
    {
      id: 'selected',
      label: 'Đang chọn',
      boxClass:
        'bg-brand-600 text-white border border-brand-600 shadow-sm ring-2 ring-brand-400 dark:bg-brand-500 dark:border-brand-500',
    },
    {
      id: 'sold',
      label: 'Đã bán',
      boxClass:
        'bg-slate-300 text-slate-500 border border-slate-300 opacity-60 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700',
    },
  ];

  return (
    <div
      className={`w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-3 sm:py-4 px-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 ${className}`}
      data-testid="seat-legend"
    >
      {legendItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 select-none">
          <span
            className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold ${item.boxClass}`}
            aria-hidden="true"
          />
          <span className="font-medium leading-snug">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default SeatLegend;