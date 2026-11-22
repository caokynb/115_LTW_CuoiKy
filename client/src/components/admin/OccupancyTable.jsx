import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, Spinner } from '../ui';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
};

export function OccupancyTable() {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api.get('/stats/occupancy-by-showtime', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setShowtimes(Array.isArray(data.data) ? data.data : []);
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError, 'Không tải được tỷ lệ lấp đầy.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retryKey]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Tỷ lệ lấp đầy suất chiếu</h2>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner label="Đang tải suất chiếu..." /></div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 py-4" role="alert">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>Tải lại</Button>
        </div>
      ) : showtimes.length === 0 ? (
        <EmptyState title="Chưa có suất chiếu" description="Chưa có dữ liệu để thống kê." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-3">Phim / phòng</th>
                <th scope="col" className="px-3 py-3">Suất chiếu</th>
                <th scope="col" className="px-3 py-3 text-right">Vé bán</th>
                <th scope="col" className="px-3 py-3 text-right">Tổng ghế</th>
                <th scope="col" className="px-3 py-3 text-right">Lấp đầy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {showtimes.map((showtime) => (
                <tr key={showtime._id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-3 py-3">
                    <div className="font-medium">{showtime.movieTitle}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{showtime.roomName}</div>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(showtime.startTime)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{showtime.soldTickets}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{showtime.totalSeats}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{Number(showtime.occupancyRate || 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OccupancyTable;
