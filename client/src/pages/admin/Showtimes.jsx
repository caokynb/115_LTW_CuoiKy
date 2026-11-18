import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, Modal, Pagination, Spinner, useToast } from '../../components/ui';
import ShowtimeForm from '../../components/admin/ShowtimeForm';

const PAGE_SIZE = 10;

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

export function ShowtimePage() {
  const toast = useToast();
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ date: '', roomId: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showtimeToDelete, setShowtimeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLookupsLoading(true);
    setLookupError('');

    Promise.all([
      api.get('/movies', { params: { page: 1, limit: 100 }, signal: controller.signal }),
      api.get('/rooms', { signal: controller.signal }),
    ])
      .then(([movieResponse, roomResponse]) => {
        setMovies(movieResponse.data.data || []);
        setRooms(roomResponse.data.data || []);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLookupError(getErrorMessage(error, 'Không tải được danh sách phim hoặc phòng.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLookupsLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    api.get('/showtimes', {
      params: {
        page,
        limit: PAGE_SIZE,
        date: filters.date || undefined,
        roomId: filters.roomId || undefined,
      },
      signal: controller.signal,
    })
      .then(({ data }) => {
        setShowtimes(data.data || []);
        setPages(data.pages || 1);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được danh sách suất chiếu.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, filters, refreshKey]);

  const openCreate = () => {
    setEditingShowtime(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (showtime) => {
    setEditingShowtime(showtime);
    setFormError('');
    setFormOpen(true);
  };

  const saveShowtime = async (values) => {
    setSaving(true);
    setFormError('');
    try {
      if (editingShowtime) {
        await api.put(`/showtimes/${editingShowtime._id}`, values);
        toast.success('Đã cập nhật suất chiếu.');
      } else {
        await api.post('/showtimes', values);
        toast.success('Đã tạo suất chiếu.');
      }
      setFormOpen(false);
      setPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không lưu được suất chiếu.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteShowtime = async () => {
    if (!showtimeToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/showtimes/${showtimeToDelete._id}`);
      toast.success('Đã xóa suất chiếu.');
      setShowtimeToDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xóa được suất chiếu.'));
    } finally {
      setDeleting(false);
    }
  };

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản trị</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Suất chiếu</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lịch chiếu được kiểm tra chồng giờ ngay trên máy chủ.</p>
        </div>
        <Button onClick={openCreate} disabled={lookupsLoading || Boolean(lookupError)}>Thêm suất chiếu</Button>
      </div>

      {lookupError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{lookupError}</div>}
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>{loadError}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>Thử lại</Button>
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Ngày chiếu</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => updateFilter('date', event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Phòng chiếu</span>
          <select
            value={filters.roomId}
            onChange={(event) => updateFilter('roomId', event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tất cả phòng</option>
            {rooms.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading || lookupsLoading ? (
          <div className="flex justify-center p-12"><Spinner label="Đang tải lịch chiếu..." /></div>
        ) : showtimes.length === 0 ? (
          <EmptyState title="Không có suất chiếu" description="Thử đổi ngày hoặc phòng chiếu, hoặc tạo suất mới." action={<Button onClick={openCreate} disabled={Boolean(lookupError)}>Thêm suất chiếu</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Phim</th>
                  <th className="px-4 py-3 font-semibold">Phòng</th>
                  <th className="px-4 py-3 font-semibold">Bắt đầu</th>
                  <th className="px-4 py-3 font-semibold">Kết thúc</th>
                  <th className="px-4 py-3 font-semibold">Giá vé</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {showtimes.map((showtime) => (
                  <tr key={showtime._id} className="text-slate-700 dark:text-slate-200">
                    <td className="max-w-[260px] truncate px-4 py-4 font-semibold" title={showtime.movieId?.title}>{showtime.movieId?.title || 'Phim không còn tồn tại'}</td>
                    <td className="px-4 py-4">{showtime.roomId?.name || 'Phòng không còn tồn tại'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(showtime.startTime)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{formatDateTime(showtime.endTime)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">Thường {formatPrice(showtime.standardPrice)} ₫<br />VIP {formatPrice(showtime.vipPrice)} ₫</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(showtime)}>Sửa</Button>
                        <Button size="sm" variant="danger" onClick={() => setShowtimeToDelete(showtime)}>Xóa</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />

      <Modal
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingShowtime ? 'Sửa suất chiếu' : 'Tạo suất chiếu'}
        size="lg"
      >
        <ShowtimeForm
          key={editingShowtime?._id || 'new-showtime'}
          showtime={editingShowtime}
          movies={movies}
          rooms={rooms}
          onSubmit={saveShowtime}
          onCancel={() => setFormOpen(false)}
          submitting={saving}
          serverError={formError}
        />
      </Modal>

      <Modal
        isOpen={Boolean(showtimeToDelete)}
        onClose={() => !deleting && setShowtimeToDelete(null)}
        title="Xóa suất chiếu?"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Xóa suất chiếu <strong>{showtimeToDelete?.movieId?.title}</strong> tại {showtimeToDelete?.roomId?.name} lúc {formatDateTime(showtimeToDelete?.startTime)}?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowtimeToDelete(null)} disabled={deleting}>Hủy</Button>
          <Button variant="danger" onClick={deleteShowtime} loading={deleting}>Xóa suất</Button>
        </div>
      </Modal>
    </section>
  );
}

export default ShowtimePage;
