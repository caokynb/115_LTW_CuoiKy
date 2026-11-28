import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Button, Spinner, EmptyState, Modal } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import TicketQR from '../components/ticket/TicketQR';

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
  const [filter, setFilter] = useState('all'); // 'all' | 'confirmed' | 'checked-in' | 'pending' | 'cancelled'
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [bookingForQr, setBookingForQr] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let ignore = false;

    const loadBookings = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/bookings/my');
        if (!ignore) {
          setBookings(res.data?.data || []);
        }
      } catch (err) {
        if (ignore) return;
        try {
          const fallbackRes = await api.get('/bookings/my-bookings');
          if (!ignore) {
            setBookings(fallbackRes.data?.data || []);
          }
        } catch (fallbackErr) {
          if (!ignore) {
            setError(
              getErrorMessage(
                fallbackErr || err,
                'Không thể tải danh sách vé của bạn.'
              )
            );
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadBookings();

    return () => {
      ignore = true;
    };
  }, []);

  // tính sẵn số lượng từng nhóm 4 trạng thái để gắn huy hiệu trên các tab lọc
  const counts = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const checkedIn = bookings.filter((b) => b.status === 'checked-in').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return {
      all: bookings.length,
      confirmed,
      'checked-in': checkedIn,
      pending,
      cancelled,
    };
  }, [bookings]);

  // lọc danh sách đơn vé hiển thị theo tab trạng thái đang chọn
  const filteredBookings = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  // gửi yêu cầu hủy đơn vé khi người dùng xác nhận trên hộp thoại
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

      {/* Tabs lọc 4 trạng thái vé */}
      {bookings.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3 dark:border-cinema-borderSubtle">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'confirmed', label: 'Đã xác nhận' },
            { key: 'checked-in', label: 'Đã soát vé' },
            { key: 'pending', label: 'Chờ thanh toán' },
            { key: 'cancelled', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                filter === tab.key
                  ? 'bg-brand-600 text-white shadow-cinema-cta'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-cinema-elevated dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                }`}
              >
                {counts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-cinema-border dark:bg-cinema-card">
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
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-cinema-border dark:bg-cinema-card">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Không có đơn đặt vé nào ở trạng thái này.
          </p>
        </div>
      ) : (
        // danh sách vé thiết kế dạng cuống vé ngang rạp chiếu
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
            const isCheckedIn = booking.status === 'checked-in';
            const isPending = booking.status === 'pending';
            const isCancelled = booking.status === 'cancelled';
            const canShowQr = isConfirmed || isCheckedIn;
            const eligibleToCancel =
              isConfirmed && canCancelBooking(showtime.startTime);

            return (
              <div
                key={booking._id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-r from-white via-neutral-50 to-neutral-100/80 shadow-lg transition-shadow hover:shadow-xl dark:border-neutral-700/80 dark:from-[#262626] dark:via-[#202020] dark:to-[#1b1b1b] sm:flex-row sm:items-stretch"
              >
                {/* dải màu mép trái phân biệt trạng thái vé */}
                <div
                  className={`h-1.5 w-full shrink-0 sm:h-auto sm:w-2 ${
                    isConfirmed
                      ? 'bg-brand-600'
                      : isCheckedIn
                      ? 'bg-emerald-600'
                      : isPending
                      ? 'bg-amber-500'
                      : 'bg-neutral-500'
                  }`}
                  aria-hidden="true"
                />

                {/* phần thân vé bên trái gồm poster và thông tin suất chiếu */}
                <div className="flex flex-1 items-start gap-4 p-5">
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
                      {isCheckedIn && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                          Đã soát vé
                        </span>
                      )}
                      {isPending && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Chờ thanh toán
                        </span>
                      )}
                      {isCancelled && (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                          Đã hủy
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
                        <strong className="text-brand-600 dark:text-brand-300">
                          {seatLabels || '—'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* rãnh xé ngang trên mobile */}
                <div className="relative flex items-center bg-neutral-100/75 dark:bg-[#2b2b2b]/85 sm:hidden" aria-hidden="true">
                  <div className="-ml-3 h-6 w-6 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg" />
                  <div className="mx-2 flex-1 border-b-2 border-dashed border-neutral-300 dark:border-neutral-600" />
                  <div className="-mr-3 h-6 w-6 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg" />
                </div>

                {/* cuống vé bên phải */}
                <div className="relative flex shrink-0 items-center justify-between gap-3 bg-neutral-100/75 p-5 dark:bg-[#2b2b2b]/85 sm:min-w-[235px] sm:flex-col sm:items-end sm:justify-center sm:border-l-2 sm:border-dashed sm:border-neutral-300 dark:sm:border-neutral-600">
                  <div
                    className="pointer-events-none absolute -left-3 -top-3 hidden h-6 w-6 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg sm:block"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute -bottom-3 -left-3 hidden h-6 w-6 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg sm:block"
                    aria-hidden="true"
                  />

                  <div className="text-left sm:text-right">
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      Tổng tiền
                    </span>
                    <strong className="text-base font-black tabular-nums text-brand-600 dark:text-brand-300">
                      {Number(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>

                  {/* cụm nút thao tác: xem chi tiết, mở mã QR và hủy vé nếu còn hạn */}
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:mt-2">
                    <Link to={`/bookings/${booking._id}`}>
                      <Button variant="secondary" size="sm">
                        Chi tiết
                      </Button>
                    </Link>

                    {canShowQr && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setBookingForQr(booking)}
                        aria-label={`Xem mã QR vé xem phim ${movie.title || ''}`}
                      >
                        Mã QR
                      </Button>
                    )}

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
      {/* Modal hiển thị mã QR vé điện tử */}
      <Modal
        isOpen={Boolean(bookingForQr)}
        onClose={() => setBookingForQr(null)}
        title="Mã QR vé điện tử"
        size="md"
      >
        {bookingForQr && <TicketQR booking={bookingForQr} />}
      </Modal>
    </div>
  );
}

export default MyBookings;
