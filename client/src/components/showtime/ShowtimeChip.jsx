import React from 'react';

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Giờ chiếu không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
};

const formatPrice = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(price)} ₫`;
};

export function ShowtimeChip({ showtime, onSelect }) {
  if (!showtime) return null;

  const start = new Date(showtime.startTime);
  const isInvalid = !Number.isFinite(start.getTime());
  const isPast = !isInvalid && start.getTime() <= Date.now();
  const room = showtime.roomId && typeof showtime.roomId === 'object'
    ? showtime.roomId.name
    : '';
  const disabled = isInvalid || isPast || !showtime._id;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect?.(showtime)}
      aria-label={`${formatTime(showtime.startTime)}, ${room || 'phòng chiếu'}, vé thường ${formatPrice(showtime.standardPrice)}, vé VIP ${formatPrice(showtime.vipPrice)}${isPast ? ', suất đã bắt đầu' : isInvalid ? ', giờ chiếu không hợp lệ' : ''}`}
      className={`flex min-h-[44px] min-w-[180px] flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-cinema-bg ${
        disabled
          ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-cinema-borderSubtle dark:bg-cinema-card dark:text-neutral-500'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-brand-500 hover:bg-brand-50 dark:border-cinema-border dark:bg-cinema-card dark:text-neutral-100 dark:hover:border-brand-400 dark:hover:bg-cinema-elevated'
      }`}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="text-lg font-bold tabular-nums">{formatTime(showtime.startTime)}</span>
        {disabled && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-slate-800">
            {isPast ? 'Đã qua' : 'Không khả dụng'}
          </span>
        )}
      </span>
      <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {room || 'Phòng chiếu'}
      </span>
      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span>Thường <strong>{formatPrice(showtime.standardPrice)}</strong></span>
        <span>VIP <strong>{formatPrice(showtime.vipPrice)}</strong></span>
      </span>
    </button>
  );
}

export default ShowtimeChip;
