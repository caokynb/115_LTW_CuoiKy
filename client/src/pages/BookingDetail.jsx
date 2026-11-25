import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Button, Spinner, EmptyState } from '../components/ui';
import TicketQR from '../components/ticket/TicketQR';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    api
      .get(`/bookings/${id}`)
      .then((res) => {
        if (!ignore) {
          setBooking(res.data?.data || null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(getErrorMessage(err, 'Không thể tải thông tin vé đã đặt.'));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải thông tin vé...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <EmptyState
          title="Không tìm thấy đơn đặt vé"
          description={error || 'Đơn đặt vé không tồn tại hoặc bạn không có quyền truy cập.'}
          action={{
            label: 'Quay lại danh sách phim',
            onClick: () => navigate('/movies'),
          }}
        />
      </div>
    );
  }

  const showtime = booking.showtimeId || {};
  const movie = showtime.movieId || {};
  const room = showtime.roomId || {};
  const tickets = booking.tickets || [];
  const seatLabels = tickets.map((t) => `${t.row}${t.number}`).join(', ');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Thông báo chúc mừng */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Đặt vé thành công!</h1>
            <p className="text-sm text-emerald-100">
              Cảm ơn bạn đã lựa chọn CineHub. Vé điện tử đã sẵn sàng.
            </p>
          </div>
        </div>
      </div>

      {/* Vé điện tử mô phỏng */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Poster phim */}
            <div className="mx-auto w-32 shrink-0 sm:mx-0 sm:w-36">
              <img
                src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60'}
                alt={movie.title || 'Phim'}
                className="aspect-[2/3] w-full rounded-xl object-cover shadow-md"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                }}
              />
            </div>

            {/* Chi tiết phim & suất chiếu */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                  {booking.status === 'confirmed'
                    ? 'Đã xác nhận'
                    : booking.status === 'cancelled'
                    ? 'Đã hủy'
                    : booking.status}
                </span>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {movie.title || 'Phim chiếu rạp'}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Thời lượng: {movie.duration || 120} phút
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-xs text-slate-400">Phòng chiếu</span>
                  <strong className="text-slate-800 dark:text-slate-200">{room.name || 'Phòng chiếu'}</strong>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Ghế ngồi</span>
                  <strong className="text-brand-600 dark:text-brand-400">{seatLabels || 'Chưa xác định'}</strong>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Ngày chiếu</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(showtime.startTime)}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-400">Giờ chiếu</span>
                  <strong className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatTime(showtime.startTime)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Đường ngăn cách vé đục lỗ phong cách vé xem phim */}
          <div className="relative -mx-6 my-6 flex items-center sm:-mx-8">
            <div className="h-6 w-3 rounded-r-full bg-slate-100 dark:bg-slate-950" />
            <div className="flex-1 border-b-2 border-dashed border-slate-200 dark:border-slate-800" />
            <div className="h-6 w-3 rounded-l-full bg-slate-100 dark:bg-slate-950" />
          </div>

          {/* Phần thanh toán & Mã đặt vé */}
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="text-xs text-slate-400">Mã đơn đặt vé</span>
              <p className="font-mono text-sm font-bold tracking-wider text-slate-800 dark:text-slate-200">
                #{booking._id}
              </p>
              <span className="text-xs text-slate-400">
                Ngày đặt: {new Date(booking.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Tổng thanh toán</span>
              <p className="text-2xl font-black text-brand-600 dark:text-brand-500">
                {Number(booking.totalPrice || 0).toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>

          {booking.status === 'confirmed' && <TicketQR booking={booking} />}
        </div>

        {/* Chân vé */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-400">
          Vui lòng xuất trình mã vé này tại quầy vé hoặc cửa soát vé trước giờ chiếu 15 phút.
        </div>
      </div>

      {/* Nút hành động */}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/my-bookings">
          <Button variant="outline" className="w-full sm:w-auto">
            Xem tất cả vé của tôi
          </Button>
        </Link>
        <Link to="/movies">
          <Button variant="primary" className="w-full sm:w-auto">
            Đặt thêm vé khác
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default BookingDetail;
