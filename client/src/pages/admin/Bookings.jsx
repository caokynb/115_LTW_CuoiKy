import { useEffect, useState } from 'react';
import api from '../../api';

const STATUS_OPTIONS = ['confirmed', 'cancelled'];
const LIMIT = 10;

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
      .get('/api/bookings', { params })
      .then(({ data }) => !ignore && setResult(data))
      .catch((err) => !ignore && setError(err.response?.data?.message || 'Không tải được danh sách vé'))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
  }, [statuses, from, to, sort, page]);

  const toggleStatus = (s) => {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  };

  return (
    <div>
      <h2>Vé đã bán</h2>

      <div>
        {STATUS_OPTIONS.map((s) => (
          <label key={s}>
            <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} /> {s}
          </label>
        ))}
        <label>
          Từ ngày <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </label>
        <label>
          Đến ngày <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </label>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          <option value="-createdAt">Mới nhất</option>
          <option value="createdAt">Cũ nhất</option>
        </select>
      </div>

      {error && <p role="alert">{error}</p>}
      {loading && <p>Đang tải...</p>}

      <table>
        <thead>
          <tr>
            <th>Mã vé</th><th>Khách</th><th>Phim</th><th>Phòng</th>
            <th>Suất chiếu</th><th>Ghế</th><th>Trạng thái</th><th>Ngày đặt</th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((b) => (
            <tr key={b._id}>
              <td>{b._id}</td>
              <td>{b.user?.email}</td>
              <td>{b.showtime?.movie?.title}</td>
              <td>{b.showtime?.room?.name}</td>
              <td>{b.showtime && new Date(b.showtime.startTime).toLocaleString('vi-VN')}</td>
              <td>{b.seats.map((s) => s.label).join(', ')}</td>
              <td>{b.status}</td>
              <td>{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
        <span> Trang {page} / {result.totalPages || 1} ({result.total} vé) </span>
        <button disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
      </div>
    </div>
  );
}