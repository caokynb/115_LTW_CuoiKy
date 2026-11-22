import { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_OPTIONS = ['confirmed', 'cancelled'];
const LIMIT = 10;

const formatSeat = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (item.label) return item.label;
  if (item.seat?.label) return item.seat.label;
  if (item.row && item.number) return `${item.row}${item.number}`;
  if (item.seat?.row && item.seat?.number) return `${item.seat.row}${item.seat.number}`;
  return '';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

export default function Bookings() {
  const [statuses, setStatuses] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const params = { page, limit: LIMIT, sort };
    if (statuses.length) params.status = statuses.join(',');
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();

    setLoading(true);
    setError('');
    api
      .get('/bookings', { params })
      .then(({ data }) => {
        if (ignore) return;
        setResult({
          data: Array.isArray(data?.data) ? data.data : [],
          total: Number(data?.total) || 0,
          totalPages: Number(data?.totalPages) || 0,
        });
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.message || 'Không tải được danh sách vé');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [statuses, from, to, sort, page]);

  const toggleStatus = (s) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  };

  const rows = Array.isArray(result?.data) ? result.data : [];
  const totalPages = Number(result?.totalPages) || 0;
  const total = Number(result?.total) || 0;

  return (
    <div>
      <h2>Vé đã bán</h2>

      <div>
        {STATUS_OPTIONS.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={statuses.includes(s)}
              onChange={() => toggleStatus(s)}
            />{' '}
            {s}
          </label>
        ))}
        <label>
          Từ ngày{' '}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Đến ngày{' '}
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="-createdAt">Mới nhất</option>
          <option value="createdAt">Cũ nhất</option>
        </select>
      </div>

      {error && <p role="alert">{error}</p>}
      {loading && <p>Đang tải...</p>}

      <table>
        <thead>
          <tr>
            <th>Mã vé</th>
            <th>Khách</th>
            <th>Phim</th>
            <th>Phòng</th>
            <th>Suất chiếu</th>
            <th>Ghế</th>
            <th>Trạng thái</th>
            <th>Ngày đặt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, idx) => {
            const ticketList = Array.isArray(b?.tickets)
              ? b.tickets
              : Array.isArray(b?.seats)
                ? b.seats
                : [];
            const seatLabels = ticketList.map(formatSeat).filter(Boolean);

            return (
              <tr key={b?._id || idx}>
                <td>{b?._id || '—'}</td>
                <td>{b?.user?.email || b?.user?.name || '—'}</td>
                <td>{b?.showtime?.movie?.title || '—'}</td>
                <td>{b?.showtime?.room?.name || '—'}</td>
                <td>{formatDateTime(b?.showtime?.startTime)}</td>
                <td>{seatLabels.length ? seatLabels.join(', ') : '—'}</td>
                <td>{b?.status || '—'}</td>
                <td>{formatDateTime(b?.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trước
        </button>
        <span>
          {' '}
          Trang {page} / {totalPages || 1} ({total} vé){' '}
        </span>
        <button disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Sau
        </button>
      </div>
    </div>
  );
}