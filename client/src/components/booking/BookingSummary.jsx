import React, { useMemo } from 'react';
import { Button } from '../ui';

export const formatVND = (amount) => {
  const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} - ${date}`;
};

export function BookingSummary({
  movie,
  roomName,
  startTime,
  selectedSeats = [],
  standardPrice = 0,
  vipPrice = 0,
  regularCount,
  vipCount,
  totalAmount,
  onCheckout,
  loading = false,
  className = '',
}) {
  const effectiveVipPrice = vipPrice || standardPrice;

  // Compute counts if not passed directly
  const effectiveRegularCount =
    typeof regularCount === 'number'
      ? regularCount
      : selectedSeats.filter((s) => s.seatType !== 'vip' && s.type !== 'vip').length;

  const effectiveVipCount =
    typeof vipCount === 'number'
      ? vipCount
      : selectedSeats.filter((s) => s.seatType === 'vip' || s.type === 'vip').length;

  const regularSubtotal = effectiveRegularCount * standardPrice;
  const vipSubtotal = effectiveVipCount * effectiveVipPrice;

  const effectiveTotal =
    typeof totalAmount === 'number' ? totalAmount : regularSubtotal + vipSubtotal;

  // Sort seats by row and seat number
  const sortedSeats = useMemo(() => {
    return [...selectedSeats].sort((a, b) => {
      if (String(a.row) !== String(b.row)) {
        return String(a.row).localeCompare(String(b.row));
      }
      return Number(a.number) - Number(b.number);
    });
  }, [selectedSeats]);

  const formattedDateTime = useMemo(() => formatDateTime(startTime), [startTime]);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 ${className}`}
      data-testid="booking-summary"
    >
      <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <span>Thông tin đặt vé</span>
      </h2>

      {/* Movie Information */}
      <div className="flex gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        {movie?.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title || 'Movie Poster'}
            className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-sm"
            data-testid="booking-movie-poster"
          />
        ) : (
          <div
            className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            data-testid="booking-movie-poster-placeholder"
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}

        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <h3
              className="font-bold text-slate-900 dark:text-white line-clamp-1 text-base"
              data-testid="booking-movie-title"
            >
              {movie?.title || 'Chưa có thông tin phim'}
            </h3>
            {movie?.duration && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thời lượng: {movie.duration} phút
              </p>
            )}
          </div>

          <div className="mt-2 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5" data-testid="booking-room">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Phòng chiếu:</span>
              <span>{roomName || 'Đang cập nhật'}</span>
            </div>
            {formattedDateTime && (
              <div className="flex items-center gap-1.5" data-testid="booking-datetime">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Suất chiếu:</span>
                <span>{formattedDateTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Seats Chips */}
      <div className="py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ghế đã chọn ({sortedSeats.length}/8)
          </span>
        </div>

        {sortedSeats.length === 0 ? (
          <p
            className="text-sm italic text-slate-400 dark:text-slate-500 py-1"
            data-testid="no-seats-selected"
          >
            Chưa có ghế nào được chọn. Vui lòng bấm vào ghế trống trên sơ đồ.
          </p>
        ) : (
          <div
            className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1"
            data-testid="selected-seats-list"
          >
            {sortedSeats.map((seat) => {
              const isVip = seat.seatType === 'vip' || seat.type === 'vip';
              const label = `${seat.row}${seat.number} (${isVip ? 'VIP' : 'Thường'})`;
              return (
                <span
                  key={`${seat.row}-${seat.number}`}
                  data-testid={`selected-chip-${seat.row}-${seat.number}`}
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors ${
                    isVip
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800'
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Counts & Price Subtotals Breakdown */}
      <div className="py-4 space-y-2 text-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
          <span>
            Vé thường ({effectiveRegularCount}x {formatVND(standardPrice)}):
          </span>
          <span
            className="font-semibold text-slate-900 dark:text-slate-100"
            data-testid="regular-subtotal"
          >
            {formatVND(regularSubtotal)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
          <span>
            Vé VIP ({effectiveVipCount}x {formatVND(effectiveVipPrice)}):
          </span>
          <span
            className="font-semibold text-slate-900 dark:text-slate-100"
            data-testid="vip-subtotal"
          >
            {formatVND(vipSubtotal)}
          </span>
        </div>
      </div>

      {/* Overall Total Amount & Checkout Button */}
      <div className="pt-4 flex flex-col gap-4">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tổng cộng:
          </span>
          <span
            className="text-2xl font-extrabold text-brand-600 dark:text-brand-400"
            data-testid="total-amount"
          >
            {formatVND(effectiveTotal)}
          </span>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={selectedSeats.length === 0 || loading}
          loading={loading}
          onClick={onCheckout}
          data-testid="btn-checkout"
          className="w-full py-3 text-base font-bold shadow-md"
        >
          {selectedSeats.length > 0
            ? `Tiếp tục đặt vé (${selectedSeats.length} ghế)`
            : 'Vui lòng chọn ghế'}
        </Button>
      </div>
    </div>
  );
}

export default BookingSummary;
