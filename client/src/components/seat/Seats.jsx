import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast, Spinner, EmptyState, Button, Modal } from '../components/ui';
import { SeatMap, BookingSummary } from '../components/booking';
import CountdownTimer from '../components/seat/CountdownTimer';
import {
  setBookingShowtime,
  toggleSeat,
  clearError,
  clearSeats,
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const movieId =
    (movie && (movie._id || movie.id)) ||
    (typeof showtime?.movieId === 'string' ? showtime.movieId : null);

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
    setIsConfirmOpen(true);
  }, [id, selectedSeats, totalAmount, onCheckoutProp]);

  // Handle confirm and create booking via API
  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        showtimeId: id,
        seats: selectedSeats.map((s) => ({
          row: s.row,
          number: s.number,
        })),
      };

      const res = await api.post('/bookings', payload);
      const bookingData = res.data?.data?.booking;

      toast.success('Đặt vé thành công!');
      dispatch(clearSeats());
      setIsConfirmOpen(false);

      if (bookingData?._id) {
        navigate(`/bookings/${bookingData._id}`);
      } else {
        navigate('/my-bookings');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        const conflicting = err.response?.data?.conflictingSeats || [];
        const conflictLabels = conflicting.map((s) => `${s.row}${s.number}`).join(', ');
        toast.error(
          conflictLabels
            ? `Ghế ${conflictLabels} đã có người đặt trước. Vui lòng chọn ghế khác!`
            : err.response?.data?.message || 'Một số ghế đã có người đặt trước.'
        );
        // Tải lại suất chiếu để cập nhật danh sách ghế đã bán
        try {
          const reloadRes = await api.get(`/showtimes/${id}`);
          setShowtime(reloadRes.data?.data || null);
        } catch {
          // Bỏ qua lỗi tải lại
        }
      } else {
        toast.error(getErrorMessage(err, 'Đặt vé thất bại. Vui lòng thử lại!'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div
      className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl min-w-0 overflow-x-clip"
      data-testid="seats-page"
    >
      {/* Page Header + Sticky Countdown on Mobile */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
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
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Chọn ghế xem phim
          </h1>
          {movie?.title && (
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 break-words">
              Phim:{' '}
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {movie.title}
              </span>{' '}
              - {roomName}
            </p>
          )}
        </div>

        <div className="sticky top-2 z-20 self-start sm:static sm:self-auto">
          <CountdownTimer movieId={movieId} />
        </div>
      </div>

      {/* Main Grid: SeatMap + BookingSummary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start min-w-0">
        {/* SeatMap Container */}
        <section
          className="min-w-0 overflow-hidden lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
          className="min-w-0 lg:col-span-4 lg:sticky lg:top-24"
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

      {/* Modal Xác nhận đặt vé */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isSubmitting && setIsConfirmOpen(false)}
        title="Xác nhận đặt vé"
        size="md"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="font-bold text-base text-slate-900 dark:text-white">{movie?.title}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div>Phòng: <strong className="text-slate-800 dark:text-slate-200">{roomName}</strong></div>
              <div>
                Suất chiếu:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {showtime?.startTime
                    ? new Date(showtime.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-400">Ghế đã chọn:</span>
            <p className="mt-1 font-bold text-brand-600 dark:text-brand-400">
              {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')} ({selectedSeats.length} ghế)
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="font-medium text-slate-600 dark:text-slate-400">Tổng tiền thanh toán:</span>
            <span className="text-xl font-black text-brand-600 dark:text-brand-500">
              {totalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmOpen(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmBooking}
            loading={isSubmitting}
          >
            Xác nhận thanh toán
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default Seats;