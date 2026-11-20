import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Button, Spinner, EmptyState } from '../components/ui';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    api
      .get('/bookings/my-bookings')
      .then((res) => {
        if (!ignore) {
          setBookings(res.data?.data || []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(getErrorMessage(err, 'Không thể tải danh sách vé của bạn.'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải lịch sử đặt vé...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Vé của tôi</h1>
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
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => {
            const showtime = booking.showtimeId || {};
            const movie = showtime.movieId || {};
            const room = showtime.roomId || {};
            const tickets = booking.tickets || [];
            const seatLabels = tickets.map((t) => `${t.row}${t.number}`).join(', ');

            return (
              <div
                key={booking._id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60'}
                    alt={movie.title || 'Phim'}
                    className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                        {booking.status === 'confirmed' ? 'Đã xác nhận' : booking.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Mã: #{booking._id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {movie.title || 'Phim không xác định'}
                    </h2>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>Phòng: <strong>{room.name || 'Phòng'}</strong></span>
                      <span>Suất: <strong>{formatDateTime(showtime.startTime)}</strong></span>
                      <span>Ghế: <strong className="text-brand-600 dark:text-brand-400">{seatLabels || '—'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="block text-xs text-slate-400">Tổng tiền</span>
                    <strong className="text-base font-black text-brand-600 dark:text-brand-500">
                      {Number(booking.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <Link to={`/bookings/${booking._id}`} className="mt-2">
                    <Button variant="outline" size="sm">
                      Chi tiết vé
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyBookings;
