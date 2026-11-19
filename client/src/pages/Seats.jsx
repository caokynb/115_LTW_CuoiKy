import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast, Spinner, EmptyState, Button } from '../components/ui';
import { SeatMap, BookingSummary } from '../components/booking';
import {
  setBookingShowtime,
  toggleSeat,
  clearError,
  selectSelectedSeats,
  selectBookingError,
} from '../store/slices/bookingSlice';

export function Seats({ onCheckout: onCheckoutProp }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { loading: authLoading } = useAuth();

  const [showtime, setShowtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const selectedSeats = useSelector(selectSelectedSeats);
  const reduxError = useSelector(selectBookingError);

  // Sync showtime ID to Redux slice
  useEffect(() => {
    if (id) {
      dispatch(setBookingShowtime(id));
    }
  }, [id, dispatch]);

  // Fetch showtime details
  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setLoading(false);
      setFetchError('ID suất chiếu không hợp lệ.');
      return;
    }

    const fetchShowtime = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get(`/showtimes/${id}`);
        if (isMounted) {
          const data = res.data?.data || res.data;
          setShowtime(data);
        }
      } catch (err) {
        if (isMounted) {
          const msg = getErrorMessage(err, 'Không thể tải thông tin suất chiếu.');
          setFetchError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchShowtime();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Redux error notifications (e.g. maximum 8 seats limit exceeded)
  useEffect(() => {
    if (reduxError) {
      toast.error(reduxError);
      dispatch(clearError());
    }
  }, [reduxError, dispatch, toast]);

  // Extract room and pricing details
  const standardPrice = Number(showtime?.standardPrice) || 0;
  const vipPrice = Number(showtime?.vipPrice) || standardPrice;

  const rows = showtime?.rows || showtime?.roomId?.rows || 8;
  const seatsPerRow = showtime?.seatsPerRow || showtime?.roomId?.seatsPerRow || 10;
  const vipRows = showtime?.vipRows || showtime?.roomId?.vipRows || [];
  const soldSeats = showtime?.soldSeats || [];
  const roomName =
    showtime?.roomId?.name ||
    (typeof showtime?.roomId === 'string' ? showtime.roomId : 'Phòng chiếu');
  const movie =
    showtime?.movieId && typeof showtime.movieId === 'object' ? showtime.movieId : null;

  // Calculate regularCount, vipCount, and totalAmount dynamically using useMemo
  const { regularCount, vipCount, totalAmount } = useMemo(() => {
    let regular = 0;
    let vip = 0;

    selectedSeats.forEach((seat) => {
      const isVip = seat.seatType === 'vip' || seat.type === 'vip';
      if (isVip) {
        vip += 1;
      } else {
        regular += 1;
      }
    });

    const total = regular * standardPrice + vip * vipPrice;

    return {
      regularCount: regular,
      vipCount: vip,
      totalAmount: total,
    };
  }, [selectedSeats, standardPrice, vipPrice]);

  // Handle seat click from SeatMap
  const handleSeatClick = useCallback(
    (seat) => {
      dispatch(toggleSeat(seat));
    },
    [dispatch]
  );

  // Handle checkout
  const handleCheckout = useCallback(() => {
    if (selectedSeats.length === 0) return;
    if (onCheckoutProp) {
      onCheckoutProp({
        showtimeId: id,
        selectedSeats,
        totalAmount,
      });
      return;
    }
    navigate(`/bookings/new`, {
      state: {
        showtimeId: id,
        selectedSeats,
        totalAmount,
      },
    });
  }, [id, selectedSeats, totalAmount, onCheckoutProp, navigate]);

  // F5 refresh / loading stability
  if (authLoading || (loading && !showtime)) {
    return (
      <div
        className="flex min-h-[60vh] w-full items-center justify-center"
        data-testid="seats-loading"
      >
        <Spinner fullScreen label="Đang tải sơ đồ ghế..." />
      </div>
    );
  }

  // Error handling for 404 or network failure
  if (fetchError || (!loading && !showtime)) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg" data-testid="seats-error">
        <EmptyState
          title="Không tìm thấy suất chiếu"
          description={fetchError || 'Thông tin suất chiếu không tồn tại hoặc đã bị hủy.'}
          action={
            <div className="flex gap-3 justify-center mt-4">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                data-testid="btn-back"
              >
                Quay lại
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/')}
                data-testid="btn-home"
              >
                Về trang chủ
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="seats-page">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            data-testid="btn-back-header"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
            Chọn ghế xem phim
          </h1>
          {movie?.title && (
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              Phim:{' '}
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {movie.title}
              </span>{' '}
              • {roomName}
            </p>
          )}
        </div>
      </div>

      {/* Main Grid: SeatMap + BookingSummary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SeatMap Container */}
        <section
          className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          aria-label="Sơ đồ phòng chiếu"
        >
          <SeatMap
            rows={rows}
            seatsPerRow={seatsPerRow}
            vipRows={vipRows}
            soldSeats={soldSeats}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            standardPrice={standardPrice}
            vipPrice={vipPrice}
          />
        </section>

        {/* BookingSummary Sidebar */}
        <aside
          className="lg:col-span-4 lg:sticky lg:top-24"
          aria-label="Tóm tắt thông tin đặt vé"
        >
          <BookingSummary
            movie={movie}
            roomName={roomName}
            startTime={showtime?.startTime}
            selectedSeats={selectedSeats}
            standardPrice={standardPrice}
            vipPrice={vipPrice}
            regularCount={regularCount}
            vipCount={vipCount}
            totalAmount={totalAmount}
            onCheckout={handleCheckout}
          />
        </aside>
      </div>
    </div>
  );
}

export default Seats;
