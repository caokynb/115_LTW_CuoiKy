import React, { useMemo, useState } from 'react';
import { Button, FormField } from '../ui';

const idOf = (value) => (typeof value === 'string' ? value : value?._id || '');

const asLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const makeInitialValues = (showtime) => ({
  movieId: idOf(showtime?.movieId),
  roomId: idOf(showtime?.roomId),
  startTime: asLocalInput(showtime?.startTime),
  standardPrice: showtime?.standardPrice ?? 80000,
  vipPrice: showtime?.vipPrice ?? 120000,
});

export function ShowtimeForm({
  showtime,
  movies,
  rooms,
  onSubmit,
  onCancel,
  submitting = false,
  serverError = '',
}) {
  const [values, setValues] = useState(() => makeInitialValues(showtime));
  const [errors, setErrors] = useState({});
  const selectedMovie = movies.find((movie) => movie._id === values.movieId);
  const estimatedEnd = useMemo(() => {
    if (!selectedMovie?.duration || !values.startTime) return '';
    const start = new Date(values.startTime);
    if (Number.isNaN(start.getTime())) return '';
    return new Date(start.getTime() + selectedMovie.duration * 60_000)
      .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }, [selectedMovie, values.startTime]);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const standardPrice = Number(values.standardPrice);
    const vipPrice = Number(values.vipPrice);

    if (!values.movieId) nextErrors.movieId = 'Chọn phim.';
    if (!values.roomId) nextErrors.roomId = 'Chọn phòng chiếu.';
    if (!values.startTime || Number.isNaN(new Date(values.startTime).getTime())) {
      nextErrors.startTime = 'Chọn thời gian bắt đầu hợp lệ.';
    }
    if (!Number.isFinite(standardPrice) || standardPrice < 0) {
      nextErrors.standardPrice = 'Giá vé thường phải là số không âm.';
    }
    if (!Number.isFinite(vipPrice) || vipPrice < 0) {
      nextErrors.vipPrice = 'Giá vé VIP phải là số không âm.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      movieId: values.movieId,
      roomId: values.roomId,
      startTime: new Date(values.startTime).toISOString(),
      standardPrice,
      vipPrice,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="showtime-movie" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Phim <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="showtime-movie"
          value={values.movieId}
          onChange={(event) => update('movieId', event.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-white"
          aria-invalid={Boolean(errors.movieId)}
          required
        >
          <option value="">Chọn phim</option>
          {movies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}
        </select>
        {errors.movieId && <p role="alert" className="mt-1 text-xs text-red-600">{errors.movieId}</p>}
      </div>

      <div>
        <label htmlFor="showtime-room" className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Phòng chiếu <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id="showtime-room"
          value={values.roomId}
          onChange={(event) => update('roomId', event.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-white"
          aria-invalid={Boolean(errors.roomId)}
          required
        >
          <option value="">Chọn phòng</option>
          {rooms.map((room) => (
            <option key={room._id} value={room._id}>{room.name} · {room.rows} × {room.seatsPerRow}</option>
          ))}
        </select>
        {errors.roomId && <p role="alert" className="mt-1 text-xs text-red-600">{errors.roomId}</p>}
      </div>

      <FormField
        label="Thời gian bắt đầu"
        name="showtime-start"
        type="datetime-local"
        value={values.startTime}
        onChange={(event) => update('startTime', event.target.value)}
        error={errors.startTime}
        required
      />
      {estimatedEnd && (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          Thời gian kết thúc dự kiến: {estimatedEnd} ({selectedMovie.duration} phút). Cùng phòng cần cách suất kế tiếp ít nhất 15 phút.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Giá vé thường (₫)"
          name="showtime-standard-price"
          type="number"
          min="0"
          step="1000"
          value={values.standardPrice}
          onChange={(event) => update('standardPrice', event.target.value)}
          error={errors.standardPrice}
          required
        />
        <FormField
          label="Giá vé VIP (₫)"
          name="showtime-vip-price"
          type="number"
          min="0"
          step="1000"
          value={values.vipPrice}
          onChange={(event) => update('vipPrice', event.target.value)}
          error={errors.vipPrice}
          required
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button>
        <Button type="submit" loading={submitting}>{showtime ? 'Lưu thay đổi' : 'Tạo suất chiếu'}</Button>
      </div>
    </form>
  );
}

export default ShowtimeForm;
