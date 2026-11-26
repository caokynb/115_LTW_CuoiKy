import React, { useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Select } from '../ui';

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

  const options = useMemo(
    () => [
      { value: '', label: 'Tất cả cụm rạp' },
      ...cinemas.map((cinema) => ({ value: cinema._id, label: cinema.name })),
    ],
    [cinemas]
  );

  return (
    <div className="w-full min-w-[170px] max-w-56">
      <Select
        value={selectedValue}
        disabled={loading || Boolean(error)}
        align="right"
        ariaLabel="Chọn cụm rạp"
        placeholder="Tất cả cụm rạp"
        options={options}
        onChange={(cinemaId) => {
          setLocalValue(cinemaId);
          const cinema = cinemas.find((item) => item._id === cinemaId) || null;
          onChange?.(cinemaId, cinema);
        }}
      />
      {error && <span role="status" className="sr-only">{error}</span>}
    </div>
  );
}

export default CinemaSelector;
