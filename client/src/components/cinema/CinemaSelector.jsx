import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';

export function CinemaSelector({ value, onChange }) {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localValue, setLocalValue] = useState('');
  const selectedValue = value === undefined ? localValue : value;

  useEffect(() => {
    const controller = new AbortController();
    api.get('/cinemas', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(data.data) ? data.data : [];
        setCinemas(list);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError, 'Không tải được danh sách rạp.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading && selectedValue && !cinemas.some((cinema) => cinema._id === selectedValue)) {
      setLocalValue('');
      onChange?.('', null);
    }
  }, [loading, cinemas, selectedValue, onChange]);

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <span className="sr-only">Chọn cụm rạp</span>
      <select
        value={selectedValue}
        disabled={loading || Boolean(error)}
        onChange={(event) => {
          const cinemaId = event.target.value;
          setLocalValue(cinemaId);
          const cinema = cinemas.find((item) => item._id === cinemaId) || null;
          onChange?.(cinemaId, cinema);
        }}
        aria-label="Chọn cụm rạp"
        className="max-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
      >
        <option value="">Tất cả cụm rạp</option>
        {cinemas.map((cinema) => (
          <option key={cinema._id} value={cinema._id}>{cinema.name}</option>
        ))}
      </select>
      {error && <span role="status" className="sr-only">{error}</span>}
    </label>
  );
}

export default CinemaSelector;
