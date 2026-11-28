import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import useCountdown from '../../hooks/useCountdown';
import { useToast } from '../ui';
import { clearSeats } from '../../store/slices/bookingSlice';

const HOLD_SECONDS = 5 * 60;

export function CountdownTimer({ movieId, seconds = HOLD_SECONDS, className = '' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const secondsLeft = useCountdown(seconds, () => {
    dispatch(clearSeats());
    toast.warning('Đã hết thời gian giữ ghế. Vui lòng chọn lại ghế!');
    navigate(movieId ? `/movies/${movieId}` : '/movies');
  });

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const isAlmostExpired = secondsLeft < 60;

  return (
    <div
      role="timer"
      aria-label="Thời gian giữ ghế còn lại"
      data-testid="countdown-timer"
      className={`sticky top-3 z-20 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 ${isAlmostExpired ? 'animate-pulse border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-100' : ''} ${className}`}
    >
      <span>Giữ ghế còn lại</span>
      <span className="text-base font-extrabold tabular-nums" data-testid="countdown-value">
        {mm}:{ss}
      </span>
    </div>
  );
}

export default CountdownTimer;
