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

  // vùng chạm tối thiểu 44x44px trên mobile, 40x40px trên sm+
  const baseClasses =
    'relative shrink-0 inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold select-none transition-[transform,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-cinema-card w-11 h-11 sm:w-10 sm:h-10';

  // định kiểu theo trạng thái và loại ghế
  let statusClasses = '';
  if (isSold) {
    statusClasses =
      'bg-neutral-300 text-neutral-500 border border-neutral-300 cursor-not-allowed opacity-60 dark:bg-cinema-elevated dark:text-neutral-500 dark:border-cinema-border pointer-events-none';
  } else if (isHeld) {
    // tô màu vàng cho ghế đang có người khác giữ chỗ theo chuẩn khóa ghế thời gian thực
    statusClasses =
      'bg-yellow-300 text-yellow-950 border border-yellow-500 cursor-not-allowed opacity-85 dark:bg-yellow-500/30 dark:text-yellow-200 dark:border-yellow-500 pointer-events-none';
  } else if (isSelected) {
    statusClasses =
      'bg-brand-600 text-white border border-brand-500 shadow-cinema-cta scale-105 ring-2 ring-brand-300 cursor-pointer';
  } else if (isVip) {
    statusClasses =
      'bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-200 hover:border-amber-500 hover:shadow-sm dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/80 dark:hover:bg-amber-900/80 cursor-pointer';
  } else {
    statusClasses =
      'bg-white text-neutral-700 border border-neutral-300 hover:bg-brand-50 hover:border-brand-500 hover:text-brand-700 hover:shadow-sm dark:bg-cinema-elevated dark:text-neutral-100 dark:border-cinema-border dark:hover:bg-neutral-700 dark:hover:border-neutral-500 cursor-pointer';
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
