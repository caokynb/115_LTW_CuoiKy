import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function BookingSuccess() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    api
      .get(`/api/bookings/${id}`)
      .then(({ data }) => !ignore && setBooking(data))
      .catch((err) => !ignore && setError(err.response?.data?.message || 'Không tải được vé'));
    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!booking) return <p>Đang tải...</p>;

  const { showtime, seats } = booking;
  return (
    <div>
      <h2>Đặt vé thành công</h2>
      <p>Mã vé: <strong>{booking._id}</strong></p>
      <p>Phim: {showtime.movie.title}</p>
      <p>Phòng: {showtime.room.name}</p>
      <p>Suất chiếu: {new Date(showtime.startTime).toLocaleString('vi-VN')}</p>
      <p>Ghế: {seats.map((s) => s.label).join(', ')}</p>
    </div>
  );
}