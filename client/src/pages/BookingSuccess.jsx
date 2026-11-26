import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import { Spinner } from '../components/ui';
import TicketQR from '../components/ticket/TicketQR';

// trang hiển thị thông tin vé điện tử và mã QR ngay sau khi đặt vé thành công
export default function BookingSuccess() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  // tải chi tiết đơn vé theo id từ URL và hủy cập nhật nếu component unmount
  useEffect(() => {
    let ignore = false;
    api
      .get(`/bookings/${id}`)
      .then(({ data }) => {
        if (!ignore) setBooking(data?.data || data || null);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err, 'Không tải được vé'));
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  // hiển thị thông báo lỗi nếu không tìm thấy hoặc không có quyền xem đơn vé
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      </div>
    );
  }

  // trạng thái chờ tải thông tin đơn vé
  if (!booking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Đang tải..." />
      </div>
    );
  }

  // chuẩn hóa dữ liệu suất chiếu, phim, phòng và danh sách nhãn ghế
  const showtime = booking.showtimeId || booking.showtime || {};
  const movie = showtime.movieId || showtime.movie || {};
  const room = showtime.roomId || showtime.room || {};
  const tickets = booking.tickets || booking.seats || [];
  const seatLabels = tickets
    .map((s) => s?.label || (s?.row && s?.number ? `${s.row}${s.number}` : ''))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* thẻ xác nhận vé điện tử kèm mã QR check-in tại rạp */}
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Đặt vé thành công</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Mã vé: <strong className="font-mono text-neutral-900 dark:text-white">{booking._id}</strong>
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Phim: {movie.title || '—'}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Phòng: {room.name || '—'}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Suất chiếu:{' '}
          {showtime.startTime ? new Date(showtime.startTime).toLocaleString('vi-VN') : '—'}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Ghế: <strong className="text-brand-600 dark:text-brand-300">{seatLabels.length ? seatLabels.join(', ') : '—'}</strong>
        </p>

        <TicketQR booking={booking} />
      </div>
    </div>
  );
}
