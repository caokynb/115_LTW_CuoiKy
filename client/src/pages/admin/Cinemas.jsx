import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, FormField, Modal, TableSkeleton } from '../../components/ui';

const emptyForm = { name: '', address: '', hotline: '', rooms: [] };

export function Cinemas() {
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      api.get('/cinemas', { signal: controller.signal }),
      api.get('/rooms', { signal: controller.signal }),
    ])
      .then(([cinemaResponse, roomResponse]) => {
        if (!controller.signal.aborted) {
          setCinemas(Array.isArray(cinemaResponse.data.data) ? cinemaResponse.data.data : []);
          setRooms(Array.isArray(roomResponse.data.data) ? roomResponse.data.data : []);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError, 'Không tải được dữ liệu cụm rạp.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleRoom = (roomId) => {
    setForm((current) => ({
      ...current,
      rooms: current.rooms.includes(roomId)
        ? current.rooms.filter((id) => id !== roomId)
        : [...current.rooms, roomId],
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setError('');
  };

  const editCinema = (cinema) => {
    setForm({
      name: cinema.name,
      address: cinema.address,
      hotline: cinema.hotline,
      rooms: (cinema.rooms || []).map((room) => room._id),
    });
    setEditingId(cinema._id);
    setNotice('');
    setError('');
  };

  const saveCinema = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) await api.put(`/cinemas/${editingId}`, form);
      else await api.post('/cinemas', form);
      resetForm();
      setNotice(editingId ? 'Đã cập nhật cụm rạp.' : 'Đã thêm cụm rạp.');
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không lưu được cụm rạp.'));
    } finally {
      setSaving(false);
    }
  };

  const removeCinema = async (cinema) => {
    setError('');
    setNotice('');
    try {
      await api.delete(`/cinemas/${cinema._id}`);
      setNotice('Đã xóa cụm rạp.');
      setReloadKey((key) => key + 1);
      if (editingId === cinema._id) resetForm();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không xóa được cụm rạp.'));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý cụm rạp</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tạo chi nhánh và gắn các phòng chiếu vào từng rạp.</p>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">{notice}</p>}

      <form onSubmit={saveCinema} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
        <h2 className="font-semibold text-neutral-900 dark:text-white">{editingId ? 'Sửa cụm rạp' : 'Thêm cụm rạp'}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Tên rạp" name="name" value={form.name} onChange={updateField} required maxLength={120} />
          <FormField label="Địa chỉ" name="address" value={form.address} onChange={updateField} required maxLength={250} />
          <FormField label="Hotline" name="hotline" value={form.hotline} onChange={updateField} required maxLength={20} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Phòng thuộc rạp</legend>
          {rooms.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const assignedCinema = cinemas.find((cinema) =>
                  cinema._id !== editingId && (cinema.rooms || []).some((assignedRoom) => assignedRoom._id === room._id)
                );
                return (
                  <label key={room._id} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-cinema-border">
                    <input
                      type="checkbox"
                      checked={form.rooms.includes(room._id)}
                      disabled={Boolean(assignedCinema)}
                      onChange={() => toggleRoom(room._id)}
                    />
                    <span>{room.name}{assignedCinema ? ` · Đã gắn với ${assignedCinema.name}` : ''}</span>
                  </label>
                );
              })}
            </div>
          ) : <p className="text-sm text-neutral-500">Chưa có phòng chiếu.</p>}
        </fieldset>
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>{editingId ? 'Lưu thay đổi' : 'Thêm rạp'}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={resetForm}>Hủy sửa</Button>}
        </div>
      </form>

      {loading ? <TableSkeleton rows={4} columns={4} /> : cinemas.length === 0 ? (
        <EmptyState title="Chưa có cụm rạp" description="Thêm cụm rạp đầu tiên bằng biểu mẫu phía trên." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <tr><th className="px-4 py-3">Cụm rạp</th><th className="px-4 py-3">Phòng</th><th className="px-4 py-3">Hotline</th><th className="px-4 py-3">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cinemas.map((cinema) => (
                <tr key={cinema._id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3"><div className="font-medium">{cinema.name}</div><div className="text-xs text-slate-500">{cinema.address}</div></td>
                  <td className="px-4 py-3">{(cinema.rooms || []).map((room) => room.name).join(', ') || 'Chưa gắn phòng'}</td>
                  <td className="px-4 py-3">{cinema.hotline}</td>
                  <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => editCinema(cinema)}>Sửa</Button><Button size="sm" variant="danger" onClick={() => setPendingDelete(cinema)}>Xóa</Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Xóa cụm rạp" size="sm">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Bạn có chắc muốn xóa cụm rạp “{pendingDelete?.name}” không?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>Hủy</Button>
          <Button variant="danger" onClick={async () => {
            const cinema = pendingDelete;
            setPendingDelete(null);
            if (cinema) await removeCinema(cinema);
          }}>Xóa cụm rạp</Button>
        </div>
      </Modal>
    </div>
  );
}

export default Cinemas;
