import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Button, Spinner, EmptyState, Modal } from '../components/ui';
import { useToast } from '../components/ui/Toast';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

/**
 * Kiểm tra xem suất chiếu có còn ít nhất 2 tiếng trước giờ chiếu hay không
 */
const canCancelBooking = (startTimeStr) => {
  if (!startTimeStr) return false;
  const startTime = new Date(startTimeStr).getTime();
  if (Number.isNaN(startTime)) return false;
  const now = Date.now();
  const diffHours = (startTime - now) / (1000 * 60 * 60);
  return diffHours >= 2;
};

export function MyBookings() {
  const navigate = useNavigate();
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'confirmed' | 'cancelled'
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    // Gọi GET /api/bookings/my (với fallback sang /bookings/my-bookings nếu cần)
    api
      .get('/bookings/my')
      .then((res) => {
        if (!ignore) {
          setBookings(res.data?.data || []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          // Thử gọi /bookings/my-bookings dự phòng
          api
            .get('/bookings/my-bookings')
            .then((fallbackRes) => {
              if (!ignore) {
                setBookings(fallbackRes.data?.data || []);
              }
            })
            .catch((fallbackErr) => {
              if (!ignore) {
                setError(
                  getErrorMessage(
                    fallbackErr || err,
                    'Không thể tải danh sách vé của bạn.'
                  )
                );
              }
            });
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const counts = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return {
      all: bookings.length,
      confirmed,
      cancelled,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === 'confirmed') {
      return bookings.filter((b) => b.status === 'confirmed');
    }
    if (filter === 'cancelled') {
      return bookings.filter((b) => b.status === 'cancelled');
    }
    return bookings;
  }, [bookings, filter]);

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);

    try {
      const res = await api.patch(`/bookings/${bookingToCancel._id}/cancel`);
      toast.success(
        res.data?.message || 'Hủy vé thành công, ghế đã được giải phóng!'
      );

      // Cập nhật trạng thái booking trong danh sách hiện tại
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingToCancel._id ? { ...b, status: 'cancelled' } : b
        )
      );
      setBookingToCancel(null);
    } catch (err) {
      toast.error(
        getErrorMessage(err, 'Không thể hủy vé. Vui lòng thử lại sau!')
      );
      setBookingToCancel(null);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Đang tải lịch sử đặt vé...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Vé của tôi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý và tra cứu các vé xem phim bạn đã đặt tại CineHub
          </p>
        </div>
        <Link to="/movies">
          <Button variant="primary" size="sm">
            Đặt vé mới
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs lọc trạng thái */}
      {bookings.length > 0 && (
        <div className="mb-6 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filter === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('confirmed')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'confirmed'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <span>Đã xác nhận</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filter === 'confirmed'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {counts.confirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('cancelled')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === 'cancelled'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <span>Đã hủy</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filter === 'cancelled'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {counts.cancelled}
            </span>
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            title="Bạn chưa có đơn đặt vé nào"
            description="Hãy chọn cho mình một bộ phim ưng ý và đặt vé xem cùng bạn bè ngay hôm nay!"
            action={{
              label: 'Khám phá phim đang chiếu',
              onClick: () => navigate('/movies'),
            }}
          />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Không có đơn đặt vé nào ở trạng thái này.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBookings.map((booking) => {
            const showtime = booking.showtimeId || {};
            const movie = showtime.movieId || {};
            const room = showtime.roomId || {};
            const tickets = booking.tickets || [];
            const seatLabels = tickets
              .map((t) => `${t.row}${t.number}`)
              .join(', ');

            const isConfirmed = booking.status === 'confirmed';
            const isCancelled = booking.status === 'cancelled';
            const eligibleToCancel =
              isConfirmed && canCancelBooking(showtime.startTime);

            return (
              <div
                key={booking._id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={
                      movie.posterUrl ||
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60'
                    }
                    alt={movie.title || 'Phim'}
                    className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      {isConfirmed && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Đã xác nhận
                        </span>
                      )}
                      {isCancelled && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                          Đã hủy
                        </span>
                      )}
                      {!isConfirmed && !isCancelled && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {booking.status}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Mã: #{booking._id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {movie.title || 'Phim không xác định'}
                    </h2>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Phòng: <strong>{room.name || 'Phòng'}</strong>
                      </span>
                      <span>
                        Suất: <strong>{formatDateTime(showtime.startTime)}</strong>
                      </span>
                      <span>
                        Ghế:{' '}
                        <strong className="text-brand-600 dark:text-brand-400">
                          {seatLabels || '—'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="block text-xs text-slate-400">
                      Tổng tiền
                    </span>
                    <strong className="text-base font-black text-brand-600 dark:text-brand-500">
                      {Number(booking.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Link to={`/bookings/${booking._id}`}>
                      <Button variant="secondary" size="sm">
                        Chi tiết
                      </Button>
                    </Link>

                    {eligibleToCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setBookingToCancel(booking)}
                        aria-label={`Hủy vé xem phim ${movie.title || ''}`}
                      >
                        Hủy vé
                      </Button>
                    )}

                    {isConfirmed && !eligibleToCancel && (
                      <span
                        className="text-[11px] text-slate-400 italic"
                        title="Chỉ được phép hủy vé trước giờ chiếu ít nhất 2 tiếng"
                      >
                        Không thể hủy (&lt; 2h)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal xác nhận hủy vé */}
      <Modal
        isOpen={Boolean(bookingToCancel)}
        onClose={() => {
          if (!cancelling) setBookingToCancel(null);
        }}
        title="Xác nhận hủy đặt vé"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={cancelling}
              onClick={() => setBookingToCancel(null)}
            >
              Giữ lại vé
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={handleConfirmCancel}
            >
              Xác nhận hủy vé
            </Button>
          </div>
        }
      >
        {bookingToCancel && (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Bạn có chắc chắn muốn hủy đơn đặt vé cho phim{' '}
              <strong className="text-slate-900 dark:text-white">
                {bookingToCancel.showtimeId?.movieId?.title || 'đã chọn'}
              </strong>
              ?
            </p>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Suất chiếu:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatDateTime(bookingToCancel.showtimeId?.startTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Phòng chiếu:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {bookingToCancel.showtimeId?.roomId?.name || 'Phòng'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Ghế ngồi:
                </span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {bookingToCancel.tickets
                    ?.map((t) => `${t.row}${t.number}`)
                    .join(', ') || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Tổng tiền:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {Number(bookingToCancel.totalPrice || 0).toLocaleString(
                    'vi-VN'
                  )}{' '}
                  đ
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
              <strong className="mb-1 block font-semibold">
                Lưu ý quan trọng:
              </strong>
              Toàn bộ ghế của đơn đặt vé này sẽ được giải phóng ngay lập tức trên
              sơ đồ ghế để khách hàng khác có thể đặt. Hành động hủy vé không thể
              hoàn tác.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyBookings;
