import React, { useState } from 'react';
import { Button, FormField } from '../ui';

const makeInitialValues = (room) => ({
  name: room?.name || '',
  rows: room?.rows || 8,
  seatsPerRow: room?.seatsPerRow || 10,
  vipRows: room?.vipRows || [],
  disabledSeatText: (room?.disabledSeats || []).map((seat) => `${seat.row}${seat.number}`).join(', '),
});

export function RoomForm({ room, onSubmit, onCancel, submitting = false, serverError = '' }) {
  const [values, setValues] = useState(() => makeInitialValues(room));
  const [errors, setErrors] = useState({});

  const updateNumber = (field, value) => {
    const number = value === '' ? '' : Number(value);
    setValues((current) => ({
      ...current,
      [field]: number,
      ...(field === 'rows' && Number.isInteger(number)
        ? { vipRows: current.vipRows.filter((row) => row <= number) }
        : {}),
    }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const toggleVipRow = (row) => {
    setValues((current) => ({
      ...current,
      vipRows: current.vipRows.includes(row)
        ? current.vipRows.filter((item) => item !== row)
        : [...current.vipRows, row].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const rows = Number(values.rows);
    const seatsPerRow = Number(values.seatsPerRow);

    if (!values.name.trim()) nextErrors.name = 'Nhập tên phòng.';
    if (!Number.isInteger(rows) || rows < 5 || rows > 50) {
      nextErrors.rows = 'Số hàng phải là số nguyên từ 5 đến 50.';
    }
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 5 || seatsPerRow > 50) {
      nextErrors.seatsPerRow = 'Số ghế mỗi hàng phải là số nguyên từ 5 đến 50.';
    }
    if (values.vipRows.some((row) => row < 1 || row > rows)) {
      nextErrors.vipRows = 'Hàng VIP phải nằm trong phạm vi hàng của phòng.';
    }
    const disabledSeats = values.disabledSeatText.split(/[\s,;]+/).filter(Boolean).map((seat) => {
      const match = seat.match(/^([A-Z]+)(\d+)$/i);
      return match ? { row: match[1].toUpperCase(), number: Number(match[2]) } : null;
    });
    if (disabledSeats.some((seat) => !seat || seat.number < 1 || seat.number > seatsPerRow || seat.row.charCodeAt(0) - 64 > rows)) {
      nextErrors.disabledSeatText = 'Nhập ghế theo dạng A1, B3; ghế phải nằm trong phòng.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      name: values.name.trim(),
      rows,
      seatsPerRow,
      vipRows: [...values.vipRows].sort((a, b) => a - b),
      disabledSeats,
    });
  };

  const validRows = Number.isInteger(Number(values.rows))
    ? Math.min(50, Math.max(5, Number(values.rows)))
    : 8;
  const validSeats = Number.isInteger(Number(values.seatsPerRow))
    ? Math.min(50, Math.max(5, Number(values.seatsPerRow)))
    : 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <FormField
        label="Tên phòng"
        name="room-name"
        value={values.name}
        onChange={(event) => {
          setValues((current) => ({ ...current, name: event.target.value }));
          setErrors((current) => ({ ...current, name: '' }));
        }}
        error={errors.name}
        required
        maxLength={60}
        placeholder="Ví dụ: Phòng 1"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Số hàng ghế"
          name="room-rows"
          type="number"
          min="5"
          max="50"
          value={values.rows}
          onChange={(event) => updateNumber('rows', event.target.value)}
          error={errors.rows}
          required
        />
        <FormField
          label="Số ghế mỗi hàng"
          name="room-seats-per-row"
          type="number"
          min="5"
          max="50"
          value={values.seatsPerRow}
          onChange={(event) => updateNumber('seatsPerRow', event.target.value)}
          error={errors.seatsPerRow}
          required
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Hàng VIP</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: validRows }, (_, index) => index + 1).map((row) => (
            <label
              key={row}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm ${
                values.vipRows.includes(row)
                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200'
                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={values.vipRows.includes(row)}
                onChange={() => toggleVipRow(row)}
                className="accent-amber-500"
              />
              Hàng {row}
            </label>
          ))}
        </div>
        {errors.vipRows && <p role="alert" className="mt-1 text-xs text-red-600">{errors.vipRows}</p>}
      </fieldset>

      <FormField label="Ghế không sử dụng" name="room-disabled-seats" value={values.disabledSeatText} onChange={(event) => setValues((current) => ({ ...current, disabledSeatText: event.target.value }))} error={errors.disabledSeatText} placeholder="Ví dụ: A1, A2, H10" helperText="Các ghế này luôn bị khóa trong sơ đồ đặt vé." />

      <section aria-label="Xem trước sơ đồ phòng" className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-cinema-border dark:bg-cinema-elevated/60">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Xem trước sơ đồ</h3>
        <div className="mt-3 overflow-x-auto pb-1">
          <div className="min-w-max">
            <div className="mb-3 rounded-full bg-slate-300 py-1 text-center text-[10px] font-semibold tracking-[0.3em] text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              MÀN HÌNH
            </div>
            <div className="space-y-1.5">
              {Array.from({ length: validRows }, (_, index) => {
                const row = index + 1;
                const isVip = values.vipRows.includes(row);
                return (
                  <div key={row} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[10px] text-slate-500">{row}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: validSeats }, (_, seatIndex) => (
                        <span
                          key={`${row}-${seatIndex + 1}`}
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 rounded-sm ${isVip ? 'bg-amber-400' : 'bg-sky-400'}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">{validRows} hàng × {validSeats} ghế</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button>
        <Button type="submit" loading={submitting}>{room ? 'Lưu thay đổi' : 'Tạo phòng'}</Button>
      </div>
    </form>
  );
}

export default RoomForm;
