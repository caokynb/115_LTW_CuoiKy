import React from 'react';

export function Seat({
  row,
  number,
  type = 'standard',
  status = 'available',
  price = 0,
  onClick,
}) {
  const isSold = status === 'sold';
  // ghế đang được người khác giữ chỗ qua Socket.io cũng bị khóa không cho bấm chọn
  const isHeld = status === 'held';
  const isDisabled = isSold || isHeld;
  const isSelected = status === 'selected';
  const isVip = type === 'vip';

  const handleClick = () => {
    if (isDisabled) {
      return;
    }
    if (onClick) {
      onClick({
        row,
        number,
        seatType: type,
        price,
      });
    }
  };

  // Base styling for all seats (minimum 36px touch target on mobile, 40px on sm+)
  const baseClasses =
    'relative shrink-0 inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-semibold select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 w-9 h-9 sm:w-10 sm:h-10';

  // Variant styling by status and type
  let statusClasses = '';
  if (isSold) {
    statusClasses =
      'bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed opacity-60 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700 pointer-events-none';
  } else if (isHeld) {
    // tô màu vàng cho ghế đang có người khác giữ chỗ theo chuẩn khóa ghế thời gian thực
    statusClasses =
      'bg-yellow-300 text-yellow-950 border border-yellow-500 cursor-not-allowed opacity-85 dark:bg-yellow-500/30 dark:text-yellow-200 dark:border-yellow-500 pointer-events-none';
  } else if (isSelected) {
    statusClasses =
      'bg-brand-600 text-white border border-brand-600 shadow-md scale-105 ring-2 ring-brand-400 dark:bg-brand-500 dark:border-brand-500 cursor-pointer';
  } else if (isVip) {
    statusClasses =
      'bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-200 hover:border-amber-500 hover:shadow-sm dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/80 cursor-pointer';
  } else {
    // Available standard
    statusClasses =
      'bg-white text-slate-700 border border-slate-300 hover:bg-brand-50 hover:border-brand-400 hover:text-brand-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-slate-500 cursor-pointer';
  }

  const ariaLabel = `Ghế ${row}${number} - ${isVip ? 'VIP' : 'Thường'} - ${
    isSold ? 'Đã bán' : isHeld ? 'Đang giữ chỗ' : isSelected ? 'Đang chọn' : 'Còn trống'
  }`;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={ariaLabel}
      data-testid={`seat-${row}-${number}`}
      data-row={row}
      data-number={number}
      data-seat-type={type}
      data-seat-status={status}
      className={`${baseClasses} ${statusClasses}`}
    >
      {number}
    </button>
  );
}

export default Seat;
