import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, Modal, TableSkeleton, useToast } from '../../components/ui';
import RoomForm from '../../components/admin/RoomForm';

export function RoomPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    api.get('/rooms', { signal: controller.signal })
      .then(({ data }) => setRooms(data.data || []))
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được danh sách phòng.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const openCreate = () => {
    setEditingRoom(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setFormError('');
    setFormOpen(true);
  };

  const saveRoom = async (values) => {
    setSaving(true);
    setFormError('');
    try {
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom._id}`, values);
        toast.success('Đã cập nhật phòng chiếu.');
      } else {
        await api.post('/rooms', values);
        toast.success('Đã tạo phòng chiếu.');
      }
      setFormOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không lưu được phòng chiếu.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async () => {
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/rooms/${roomToDelete._id}`);
      toast.success('Đã xóa phòng chiếu.');
      setRoomToDelete(null);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      const message = getErrorMessage(error, 'Không xóa được phòng chiếu.');
      if (error.response?.status === 409) {
        toast.error(message);
      } else {
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-300">Quản trị</p>
          <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Phòng chiếu</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Thiết lập sức chứa và các hàng ghế VIP.</p>
        </div>
        <Button onClick={openCreate}>Thêm phòng</Button>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>{loadError}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>Thử lại</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
        {loading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : rooms.length === 0 ? (
          <EmptyState title="Chưa có phòng chiếu" description="Tạo phòng đầu tiên để bắt đầu xếp lịch chiếu." action={<Button onClick={openCreate}>Thêm phòng</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tên phòng</th>
                  <th className="px-4 py-3 font-semibold">Sơ đồ</th>
                  <th className="px-4 py-3 font-semibold">Sức chứa</th>
                  <th className="px-4 py-3 font-semibold">Hàng VIP</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rooms.map((room) => (
                  <tr key={room._id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-4 font-semibold">{room.name}</td>
                    <td className="px-4 py-4">{room.rows} hàng × {room.seatsPerRow} ghế</td>
                    <td className="px-4 py-4">{room.rows * room.seatsPerRow} ghế</td>
                    <td className="px-4 py-4">{room.vipRows?.length ? room.vipRows.join(', ') : 'Không có'}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(room)}>Sửa</Button>
                        <Button size="sm" variant="danger" onClick={() => setRoomToDelete(room)}>Xóa</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingRoom ? 'Sửa phòng chiếu' : 'Tạo phòng chiếu'}
        size="lg"
      >
        <RoomForm
          key={editingRoom?._id || 'new-room'}
          room={editingRoom}
          onSubmit={saveRoom}
          onCancel={() => setFormOpen(false)}
          submitting={saving}
          serverError={formError}
        />
      </Modal>

      <Modal
        isOpen={Boolean(roomToDelete)}
        onClose={() => !deleting && setRoomToDelete(null)}
        title="Xóa phòng chiếu?"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bạn sắp xóa <strong>{roomToDelete?.name}</strong>. Phòng có suất chiếu sẽ bị từ chối xóa.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRoomToDelete(null)} disabled={deleting}>Hủy</Button>
          <Button variant="danger" onClick={deleteRoom} loading={deleting}>Xóa phòng</Button>
        </div>
      </Modal>
    </section>
  );
}

export default RoomPage;
