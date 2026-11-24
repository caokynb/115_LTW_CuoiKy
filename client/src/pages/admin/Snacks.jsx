import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, FormField, Modal, Spinner, useToast } from '../../components/ui';

const CATEGORY_LABELS = {
  combo: 'Combo',
  popcorn: 'Bắp rang',
  drink: 'Nước uống',
};

const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'combo',
  imageUrl: '',
  isAvailable: true,
};

// trang admin quản lý danh sách combo bắp nước F&B
export function AdminSnacks() {
  const toast = useToast();
  const [snacks, setSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSnack, setEditingSnack] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [snackToDelete, setSnackToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // tải toàn bộ danh sách bắp nước (bao gồm món đang ẩn)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    api
      .get('/snacks', { params: { all: 'true' }, signal: controller.signal })
      .then(({ data }) => setSnacks(data.data || []))
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được danh sách bắp nước.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const openCreate = () => {
    setEditingSnack(null);
    setFormValues(INITIAL_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (snack) => {
    setEditingSnack(snack);
    setFormValues({
      name: snack.name || '',
      description: snack.description || '',
      price: snack.price !== undefined ? String(snack.price) : '',
      category: snack.category || 'combo',
      imageUrl: snack.imageUrl || '',
      isAvailable: snack.isAvailable !== false,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formValues.name.trim()) {
      setFormError('Tên combo bắp nước không được để trống.');
      return;
    }
    const numPrice = Number(formValues.price);
    if (formValues.price === '' || Number.isNaN(numPrice) || numPrice < 0) {
      setFormError('Giá bán phải là số lớn hơn hoặc bằng 0.');
      return;
    }

    const payload = {
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      price: numPrice,
      category: formValues.category,
      imageUrl: formValues.imageUrl.trim(),
      isAvailable: Boolean(formValues.isAvailable),
    };

    setSaving(true);
    try {
      if (editingSnack) {
        await api.put(`/snacks/${editingSnack._id}`, payload);
        toast.success('Đã cập nhật combo bắp nước.');
      } else {
        await api.post('/snacks', payload);
        toast.success('Đã thêm combo bắp nước mới.');
      }
      setFormOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không lưu được thông tin combo.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!snackToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/snacks/${snackToDelete._id}`);
      toast.success('Đã xóa combo bắp nước.');
      setSnackToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa combo bắp nước.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản trị</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Combo Bắp Nước (F&amp;B)
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý thực đơn combo, bắp rang và nước uống bán kèm khi đặt vé.
          </p>
        </div>
        <Button onClick={openCreate}>Thêm combo</Button>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{loadError}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((k) => k + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner label="Đang tải danh sách bắp nước..." />
          </div>
        ) : snacks.length === 0 ? (
          <EmptyState
            title="Chưa có combo bắp nước nào"
            description="Thêm combo đầu tiên để khách có thể đặt kèm bắp nước."
            action={<Button onClick={openCreate}>Thêm combo</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tên món</th>
                  <th className="px-4 py-3 font-semibold">Danh mục</th>
                  <th className="px-4 py-3 font-semibold">Giá bán</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {snacks.map((snack) => (
                  <tr key={snack._id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{snack.name}</p>
                      {snack.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {snack.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{CATEGORY_LABELS[snack.category] || snack.category}</td>
                    <td className="px-4 py-3 font-semibold">
                      {Number(snack.price || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          snack.isAvailable !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {snack.isAvailable !== false ? 'Đang bán' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(snack)}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setSnackToDelete(snack)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* modal tạo hoặc sửa combo bắp nước */}
      <Modal
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingSnack ? 'Chỉnh sửa combo bắp nước' : 'Thêm combo bắp nước'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              {formError}
            </div>
          )}

          <FormField
            label="Tên combo / món"
            name="name"
            value={formValues.name}
            onChange={(e) => setFormValues((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ví dụ: Combo Solo"
            required
          />

          <FormField
            label="Mô tả chi tiết"
            name="description"
            value={formValues.description}
            onChange={(e) => setFormValues((p) => ({ ...p, description: e.target.value }))}
            placeholder="1 Bắp lớn + 1 Nước ngọt"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Giá bán (VNĐ)"
              name="price"
              type="number"
              min="0"
              value={formValues.price}
              onChange={(e) => setFormValues((p) => ({ ...p, price: e.target.value }))}
              placeholder="79000"
              required
            />

            <div className="space-y-1.5">
              <label
                htmlFor="snack-category"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Danh mục
              </label>
              <select
                id="snack-category"
                value={formValues.category}
                onChange={(e) => setFormValues((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="combo">Combo</option>
                <option value="popcorn">Bắp rang</option>
                <option value="drink">Nước uống</option>
              </select>
            </div>
          </div>

          <FormField
            label="URL ảnh minh họa"
            name="imageUrl"
            value={formValues.imageUrl}
            onChange={(e) => setFormValues((p) => ({ ...p, imageUrl: e.target.value }))}
            placeholder="https://..."
          />

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={formValues.isAvailable}
              onChange={(e) => setFormValues((p) => ({ ...p, isAvailable: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Đang mở bán cho khách chọn</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              {editingSnack ? 'Lưu thay đổi' : 'Tạo combo'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* modal xác nhận xóa */}
      <Modal
        isOpen={Boolean(snackToDelete)}
        onClose={() => !deleting && setSnackToDelete(null)}
        title="Xóa combo bắp nước?"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bạn có chắc muốn xóa <strong>{snackToDelete?.name}</strong>?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSnackToDelete(null)} disabled={deleting}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Xóa combo
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default AdminSnacks;
