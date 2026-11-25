import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api';
import TicketQR from '../components/ticket/TicketQR';

export default function BookingSuccess() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

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

  if (error) return <p role="alert">{error}</p>;
  if (!booking) return <p>Đang tải...</p>;

  const showtime = booking.showtimeId || booking.showtime || {};
  const movie = showtime.movieId || showtime.movie || {};
  const room = showtime.roomId || showtime.room || {};
  const tickets = booking.tickets || booking.seats || [];
  const seatLabels = tickets
    .map((s) => s?.label || (s?.row && s?.number ? `${s.row}${s.number}` : ''))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Đặt vé thành công</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Mã vé: <strong>{booking._id}</strong>
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">Phim: {movie.title || '—'}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">Phòng: {room.name || '—'}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Suất chiếu:{' '}
        {showtime.startTime ? new Date(showtime.startTime).toLocaleString('vi-VN') : '—'}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Ghế: {seatLabels.length ? seatLabels.join(', ') : '—'}
      </p>

      <TicketQR booking={booking} />
    </div>
  );
}
