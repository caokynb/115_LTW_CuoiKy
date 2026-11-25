import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, Pagination, Spinner } from '../../components/ui';

const LIMIT = 10;

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'createdAt', label: 'Cũ nhất' },
  { value: '-totalPrice', label: 'Tổng tiền giảm dần' },
  { value: 'totalPrice', label: 'Tổng tiền tăng dần' },
];

const STATUS_BADGE = {
  confirmed:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

// Backend trả về mỗi đơn kèm danh sách `tickets` (hàng + số ghế)
const formatSeats = (tickets) =>
  (tickets || [])
    .map((t) => `${t.row}${t.number}`)
    .join(', ') || '—';

export function Bookings() {
  const [statuses, setStatuses] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = { page, limit: LIMIT, sort };
    if (statuses.length) params.status = statuses.join(',');
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();

    setLoading(true);
    setError('');
    api
      .get('/bookings', { params, signal: controller.signal })
      .then((res) => {
        setBookings(res.data?.data || []);
        setPages(res.data?.pages || 1);
        setTotal(res.data?.total || 0);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setBookings([]);
        setError(getErrorMessage(err, 'Không tải được danh sách vé đã bán.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [statuses, from, to, sort, page, refreshKey]);

  const toggleStatus = (value) => {
    setStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
    setPage(1);
  };

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản trị</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Vé đã bán</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tra cứu đơn đặt vé theo trạng thái và khoảng ngày đặt.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Trạng thái</legend>
          <div className="flex flex-wrap gap-3 pt-1">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={statuses.includes(option.value)}
                  onChange={() => toggleStatus(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Từ ngày</span>
          <input type="date" value={from} onChange={changeFilter(setFrom)} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Đến ngày</span>
          <input type="date" value={to} onChange={changeFilter(setTo)} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sắp xếp</span>
          <select value={sort} onChange={changeFilter(setSort)} className={inputClass}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Đang tải danh sách vé..." />
          </div>
        ) : bookings.length === 0 && !error ? (
          <EmptyState
            title="Không có vé nào"
            description="Thử đổi trạng thái hoặc khoảng ngày để xem các đơn khác."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm" data-testid="admin-bookings-table">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã đơn</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Phim</th>
                  <th className="px-4 py-3 font-semibold">Phòng</th>
                  <th className="px-4 py-3 font-semibold">Suất chiếu</th>
                  <th className="px-4 py-3 font-semibold">Ghế</th>
                  <th className="px-4 py-3 font-semibold">Tổng tiền</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày đặt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-4 font-mono text-xs" title={booking._id}>
                      #{booking._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{booking.userId?.fullName || 'Người dùng đã bị xóa'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{booking.userId?.email}</div>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-4 font-semibold" title={booking.showtimeId?.movieId?.title}>
                      {booking.showtimeId?.movieId?.title || '—'}
                    </td>
                    <td className="px-4 py-4">{booking.showtimeId?.roomId?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDateTime(booking.showtimeId?.startTime)}</td>
                    <td className="px-4 py-4 font-semibold text-brand-600 dark:text-brand-400">{formatSeats(booking.tickets)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatPrice(booking.totalPrice)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_BADGE[booking.status] || STATUS_BADGE.cancelled
                        }`}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === booking.status)?.label || booking.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDateTime(booking.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && total > 0 && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Tổng {total} đơn • Trang {page}/{pages}
        </p>
      )}
      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </section>
  );
}

export default Bookings;