import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/axios';

export function useSeatPolling(showtimeId, interval = 5000) {
  const [showtime, setShowtime] = useState(null);
  const [loading, setLoading] = useState(Boolean(showtimeId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showtimeId) {
      setShowtime(null);
      setLoading(false);
      setError('Không tìm thấy mã suất chiếu.');
      return undefined;
    }

    let active = true;
    let requestPending = false;
    const controller = new AbortController();

    const refreshSeats = async () => {
      if (requestPending) return;
      requestPending = true;

      try {
        const response = await api.get(`/showtimes/${showtimeId}`, {
          signal: controller.signal,
        });
        if (active) {
          setShowtime(response.data?.data || null);
          setError('');
        }
      } catch (requestError) {
        if (active && !controller.signal.aborted) {
          setError(getErrorMessage(requestError, 'Không thể cập nhật sơ đồ ghế.'));
        }
      } finally {
        requestPending = false;
        if (active) setLoading(false);
      }
    };

    setShowtime(null);
    setLoading(true);
    setError('');
    refreshSeats();
    const timer = setInterval(refreshSeats, interval);

    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
    };
  }, [showtimeId, interval]);

  return { showtime, loading, error };
}

export default useSeatPolling;
