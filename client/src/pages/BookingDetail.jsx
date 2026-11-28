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
  const statusMap = {
    confirmed: {
      label: 'Đã xác nhận',
      bannerClass: 'from-emerald-600 to-teal-600',
      title: 'Đặt vé thành công!',
      subtitle: 'Cảm ơn bạn đã lựa chọn CineHub. Vé điện tử đã sẵn sàng.',
    },
    'checked-in': {
      label: 'Đã soát vé',
      bannerClass: 'from-sky-600 to-indigo-600',
      title: 'Vé đã được soát tại rạp',
      subtitle: 'Chúc bạn có những phút giây xem phim tuyệt vời cùng CineHub.',
    },
    pending: {
      label: 'Chờ thanh toán',
      bannerClass: 'from-amber-600 to-orange-600',
      title: 'Đơn vé đang chờ thanh toán',
      subtitle: 'Vui lòng hoàn tất chuyển khoản VietQR trong thời gian giữ chỗ.',
    },
    cancelled: {
      label: 'Đã hủy',
      bannerClass: 'from-rose-700 to-red-700',
      title: 'Đơn đặt vé đã bị hủy',
      subtitle: 'Ghế của đơn đặt vé này đã được giải phóng.',
    },
  };
  const currentStatus = statusMap[booking.status] || {
    label: booking.status || 'Không xác định',
    bannerClass: 'from-slate-700 to-slate-800',
    title: 'Thông tin đơn đặt vé',
    subtitle: '',
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Banner trạng thái đơn đặt vé */}
      <div className={`mb-6 rounded-2xl bg-gradient-to-r ${currentStatus.bannerClass} p-6 text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentStatus.title}</h1>
            {currentStatus.subtitle && (
              <p className="text-sm text-white/90">{currentStatus.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Vé điện tử mô phỏng hình vé xem phim */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-b from-white via-neutral-50 to-neutral-100/90 shadow-2xl dark:border-neutral-700/80 dark:from-[#262626] dark:via-[#1e1e1e] dark:to-[#191919]">
        {/* Dải đầu vé đặc trưng */}
        <div className="flex items-center justify-between bg-brand-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white sm:px-8">
          <span>CineHub E-Ticket</span>
          <span className="font-mono">#{String(booking._id || '').slice(-6).toUpperCase()}</span>
        </div>

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
                <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                  {currentStatus.label}
                </span>
                <h2 className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">
                  {movie.title || 'Phim chiếu rạp'}
                </h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Thời lượng: {movie.duration || 120} phút
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Phòng chiếu</span>
                  <strong className="text-neutral-800 dark:text-neutral-200">{room.name || 'Phòng chiếu'}</strong>
                </div>
                <div>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Ghế ngồi</span>
                  <strong className="text-brand-600 dark:text-brand-300">{seatLabels || 'Chưa xác định'}</strong>
                </div>
                <div>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Ngày chiếu</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatDate(showtime.startTime)}</span>
                </div>
                <div>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Giờ chiếu</span>
                  <strong className="text-lg font-bold text-neutral-900 dark:text-white">
                    {formatTime(showtime.startTime)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Đường rãnh xé cuống vé đục lỗ hai bên */}
        <div className="relative flex items-center bg-neutral-100/75 dark:bg-[#2a2a2a]/85">
          <div className="-ml-4 h-8 w-8 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg" />
          <div className="mx-2 flex-1 border-b-2 border-dashed border-neutral-300 dark:border-neutral-600" />
          <div className="-mr-4 h-8 w-8 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-neutral-700/80 dark:bg-cinema-bg" />
        </div>

        {/* Phần cuống vé: thanh toán & mã QR */}
        <div className="bg-neutral-100/75 p-6 pt-4 dark:bg-[#2a2a2a]/85 sm:p-8 sm:pt-5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Mã đơn đặt vé</span>
              <p className="font-mono text-sm font-bold tracking-wider text-neutral-800 dark:text-neutral-200">
                #{booking._id}
              </p>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Ngày đặt: {new Date(booking.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Tổng thanh toán</span>
              <p className="text-2xl font-black tabular-nums text-brand-600 dark:text-brand-300">
                {Number(booking.totalPrice || 0).toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>

          {(booking.status === 'confirmed' || booking.status === 'checked-in') && (
            <TicketQR booking={booking} />
          )}
        </div>

        {/* Chân vé */}
        <div className="border-t border-neutral-200 bg-neutral-100 px-6 py-4 text-center text-xs text-neutral-600 dark:border-neutral-700/80 dark:bg-[#222222] dark:text-neutral-300">
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
