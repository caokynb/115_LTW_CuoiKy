import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, Spinner } from '../ui';
import { useAuth } from '../../context/AuthContext';
import ShowtimeChip from './ShowtimeChip';

const getDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatDayLabel = (dateKey) => {
  const today = getDateKey(new Date());
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  const label = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
  return dateKey === today ? `Hôm nay · ${label}` : label;
};

export function ShowtimeList({ movieId, cinemaId = '', onSelectShowtime }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showtimes, setShowtimes] = useState([]);
  const [activeDate, setActiveDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    if (!movieId) {
      setShowtimes([]);
      setError('Không tìm thấy mã phim để tải lịch chiếu.');
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError('');
    setActiveDate('');
    setShowtimes([]);

    const params = { movieId, ...(cinemaId ? { cinemaId } : {}) };

    const loadShowtimes = async () => {
      try {
        const firstPage = await api.get('/showtimes', {
          params: { ...params, page: 1, limit: 100 },
          signal: controller.signal,
        });
        const firstData = firstPage.data;
        const items = Array.isArray(firstData.data) ? [...firstData.data] : [];
        const pages = Number(firstData.pages) || 1;

        for (let page = 2; page <= pages; page += 1) {
          const response = await api.get('/showtimes', {
            params: { ...params, page, limit: 100 },
            signal: controller.signal,
          });
          if (Array.isArray(response.data.data)) items.push(...response.data.data);
        }

        if (!controller.signal.aborted) setShowtimes(items);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError, 'Không tải được lịch chiếu.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadShowtimes();

    return () => controller.abort();
  }, [movieId, cinemaId, retryKey]);

  const groupedShowtimes = useMemo(() => {
    const groups = showtimes.reduce((byDate, showtime) => {
      const dateKey = getDateKey(showtime.startTime);
      if (!dateKey) return byDate;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(showtime);
      return byDate;
    }, {});

    Object.values(groups).forEach((items) => {
      items.sort((first, second) => new Date(first.startTime) - new Date(second.startTime));
    });
    return groups;
  }, [showtimes]);

  const dates = Object.keys(groupedShowtimes).sort();
  const selectedDate = dates.includes(activeDate) ? activeDate : dates[0] || '';

  const selectShowtime = (showtime) => {
    if (onSelectShowtime) {
      onSelectShowtime(showtime);
      return;
    }

    const nextPath = `/showtimes/${showtime._id}/seats`;
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: {
            pathname: nextPath,
          },
        },
      });
      return;
    }
    navigate(nextPath);
  };

  if (loading) {
    return (
      <section aria-label="Lịch chiếu" className="flex justify-center rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <Spinner label="Đang tải suất chiếu..." />
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Lịch chiếu" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <Button size="sm" variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>
          Tải lại
        </Button>
      </section>
    );
  }

  if (dates.length === 0) {
    return (
      <EmptyState
        title="Chưa có suất chiếu"
        description="Phim hiện chưa có lịch chiếu. Vui lòng quay lại sau."
        className="dark:border-slate-800"
      />
    );
  }

  return (
    <section aria-label="Lịch chiếu phim" className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Chọn ngày chiếu">
        {dates.map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          return (
            <button
              key={dateKey}
              id={`showtime-day-${dateKey}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`showtime-panel-${dateKey}`}
              onClick={() => setActiveDate(dateKey)}
              className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                isSelected
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {formatDayLabel(dateKey)}
            </button>
          );
        })}
      </div>

      {dates.map((dateKey) => (
        <div
          key={dateKey}
          id={`showtime-panel-${dateKey}`}
          role="tabpanel"
          aria-labelledby={`showtime-day-${dateKey}`}
          hidden={dateKey !== selectedDate}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {groupedShowtimes[dateKey].map((showtime) => (
            <ShowtimeChip
              key={showtime._id}
              showtime={showtime}
              onSelect={selectShowtime}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

export default ShowtimeList;
