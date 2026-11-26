import React from 'react';

const formatVND = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) return '';
  return ` (${new Intl.NumberFormat('vi-VN').format(amount)}đ)`;
};

export function SeatLegend({ standardPrice, vipPrice, showHeldLegend = false, className = '' }) {
  const legendItems = [
    {
      id: 'standard',
      label: `Ghế thường${formatVND(standardPrice)}`,
      boxClass:
        'bg-white text-neutral-700 border border-neutral-300 dark:bg-cinema-elevated dark:text-neutral-200 dark:border-cinema-border',
    },
    {
      id: 'vip',
      label: `Ghế VIP${formatVND(vipPrice)}`,
      boxClass:
        'bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/80',
    },
    {
      id: 'selected',
      label: 'Đang chọn',
      boxClass:
        'bg-brand-600 text-white border border-brand-500 shadow-sm ring-2 ring-brand-300',
    },
    // chỉ thêm chú thích màu vàng khi có ít nhất một ghế đang được người khác giữ chỗ
    ...(showHeldLegend
      ? [
          {
            id: 'held',
            label: 'Đang giữ chỗ',
            boxClass:
              'bg-yellow-300 text-yellow-950 border border-yellow-500 dark:bg-yellow-500/30 dark:text-yellow-200 dark:border-yellow-500',
          },
        ]
      : []),
    {
      id: 'sold',
      label: 'Đã bán',
      boxClass:
        'bg-neutral-300 text-neutral-500 border border-neutral-300 opacity-60 dark:bg-cinema-elevated dark:text-neutral-500 dark:border-cinema-border',
    },
  ];

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4 px-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 ${className}`}
      data-testid="seat-legend"
    >
      {legendItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 select-none">
          <span
            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${item.boxClass}`}
            aria-hidden="true"
          />
          <span className="font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default SeatLegend;
