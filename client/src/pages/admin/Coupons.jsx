import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, EmptyState, FormField, Modal, Select, TableSkeleton, useToast } from '../../components/ui';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percent', label: 'Phần trăm (%)' },
  { value: 'fixed', label: 'Số tiền cố định (₫)' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Đã khóa' },
  { value: 'expired', label: 'Đã hết hạn' },
];

const INITIAL_FORM = {
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: '',
  maxDiscount: '',
  minOrderAmount: '0',
  maxUses: '50',
  expiresAt: '',
  isActive: true,
};

const formatDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDateDisplay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

// Trang quản trị danh sách mã giảm giá (voucher)
export function AdminCoupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState('');
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    const params = {};
    if (search.trim()) params.search = search.trim();
    if (statusFilter !== 'all') params.status = statusFilter;

    api
      .get('/coupons', { params, signal: controller.signal })
      .then(({ data }) => setCoupons(data?.data || []))
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được danh sách mã giảm giá.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [search, statusFilter, refreshKey]);

  const openCreate = () => {
    setEditingCoupon(null);
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setFormValues({ ...INITIAL_FORM, expiresAt: defaultExpiry });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormValues({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percent',
      discountValue: coupon.discountValue !== undefined ? String(coupon.discountValue) : '',
      maxDiscount:
        coupon.maxDiscount !== null && coupon.maxDiscount !== undefined ? String(coupon.maxDiscount) : '',
      minOrderAmount: coupon.minOrderAmount !== undefined ? String(coupon.minOrderAmount) : '0',
      maxUses: coupon.maxUses !== undefined ? String(coupon.maxUses) : '1',
      expiresAt: formatDateInput(coupon.expiresAt),
      isActive: coupon.isActive !== false,
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = formValues.code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Mã giảm giá không được để trống.');
      return;
    }

    const discountValue = Number(formValues.discountValue);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      setFormError('Giá trị giảm phải lớn hơn 0.');
      return;
    }
    if (formValues.discountType === 'percent' && discountValue > 100) {
      setFormError('Phần trăm giảm không được vượt quá 100%.');
      return;
    }

    const maxUses = Number(formValues.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1) {
      setFormError('Số lượt dùng tối đa phải là số nguyên lớn hơn 0.');
      return;
    }

    if (!formValues.expiresAt) {
      setFormError('Vui lòng chọn ngày hết hạn.');
      return;
    }

    const expiresDate = new Date(`${formValues.expiresAt}T23:59:59`);
    if (Number.isNaN(expiresDate.getTime())) {
      setFormError('Ngày hết hạn không hợp lệ.');
      return;
    }

    const payload = {
      code: cleanCode,
      description: formValues.description.trim(),
      discountType: formValues.discountType,
      discountValue,
      maxDiscount:
        formValues.discountType === 'percent' && formValues.maxDiscount !== ''
          ? Number(formValues.maxDiscount)
          : null,
      minOrderAmount: formValues.minOrderAmount !== '' ? Number(formValues.minOrderAmount) : 0,
      maxUses,
      expiresAt: expiresDate.toISOString(),
      isActive: Boolean(formValues.isActive),
    };

    setSaving(true);
    try {
      if (editingCoupon) {
        await api.put(`/coupons/${editingCoupon._id}`, payload);
        toast.success('Đã cập nhật mã giảm giá.');
      } else {
        await api.post('/coupons', payload);
        toast.success('Đã tạo mã giảm giá mới.');
      }
      setFormOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Không lưu được thông tin mã giảm giá.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    setTogglingId(coupon._id);
    try {
      const { data } = await api.patch(`/coupons/${coupon._id}/toggle`);
      const updated = data?.data;
      setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? updated : c)));
      toast.success(updated?.isActive ? `Đã bật mã ${coupon.code}` : `Đã khóa mã ${coupon.code}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không đổi được trạng thái mã giảm giá.'));
    } finally {
      setTogglingId('');
    }
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/coupons/${couponToDelete._id}`);
      toast.success(`Đã xóa mã giảm giá ${couponToDelete.code}.`);
      setCouponToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xóa được mã giảm giá.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-500">Quản trị</p>
          <h2 className="mt-1 text-2xl font-bold text-neutral-950 dark:text-white">Quản lý voucher</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Tạo mới, chỉnh sửa, khóa/mở và theo dõi lượt sử dụng mã giảm giá.
          </p>
        </div>
        <Button onClick={openCreate}>+ Thêm voucher</Button>
      </div>

      {/* Bộ lọc tìm kiếm và trạng thái */}
      <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card sm:grid-cols-3">
        <div className="sm:col-span-2">
          <FormField
            label="Tìm kiếm mã hoặc mô tả"
            placeholder="Ví dụ: CINE10, ưu đãi cuối tuần..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="coupon-status-filter"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Trạng thái
          </label>
          <Select
            id="coupon-status-filter"
            ariaLabel="Trạng thái"
            value={statusFilter}
            onChange={(nextVal) =>
              setStatusFilter(typeof nextVal === 'string' ? nextVal : nextVal?.target?.value || 'all')
            }
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : loadError ? (
        <EmptyState
          title="Không tải được danh sách voucher"
          description={loadError}
          action={{
            label: 'Thử lại',
            onClick: () => setRefreshKey((k) => k + 1),
          }}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="Chưa có mã giảm giá nào"
          description="Nhấn Thêm voucher để tạo mã khuyến mãi đầu tiên cho khách hàng."
          action={{
            label: 'Thêm voucher',
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-sm dark:divide-cinema-borderSubtle">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:bg-cinema-elevated dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3.5">Mã voucher</th>
                <th className="px-4 py-3.5">Mức giảm</th>
                <th className="px-4 py-3.5">Lượt dùng</th>
                <th className="px-4 py-3.5">Hạn sử dụng</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-cinema-borderSubtle">
              {coupons.map((coupon) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) <= new Date();
                const isExhausted = (coupon.usedCount || 0) >= (coupon.maxUses || 0);
                return (
                  <tr
                    key={coupon._id}
                    className="transition-colors hover:bg-neutral-50 dark:hover:bg-cinema-elevated/60"
                  >
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400">
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {coupon.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-neutral-900 dark:text-white">
                      {coupon.discountType === 'percent' ? (
                        <>
                          <span>Giảm {coupon.discountValue}%</span>
                          {coupon.maxDiscount ? (
                            <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                              Tối đa {formatMoney(coupon.maxDiscount)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span>Giảm {formatMoney(coupon.discountValue)}</span>
                      )}
                      {coupon.minOrderAmount > 0 && (
                        <span className="block text-xs font-normal text-neutral-500 dark:text-neutral-400">
                          Đơn tối thiểu {formatMoney(coupon.minOrderAmount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <span
                        className={`font-semibold ${
                          isExhausted ? 'text-rose-500' : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {coupon.usedCount || 0} / {coupon.maxUses}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`tabular-nums ${
                          isExpired ? 'font-semibold text-rose-500' : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {formatDateDisplay(coupon.expiresAt)}
                      </span>
                      {isExpired && (
                        <span className="ml-2 inline-block rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-rose-500">
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        disabled={togglingId === coupon._id}
                        onClick={() => handleToggleStatus(coupon)}
                        className={`inline-flex min-h-[32px] items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
                          coupon.isActive
                            ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                            : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {togglingId === coupon._id
                          ? 'Đang lưu...'
                          : coupon.isActive
                          ? 'Đang bật'
                          : 'Đã khóa'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(coupon)}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setCouponToDelete(coupon)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal tạo / sửa voucher */}
      <Modal
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingCoupon ? `Cập nhật voucher ${editingCoupon.code}` : 'Thêm voucher mới'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Mã voucher"
              required
              placeholder="Ví dụ: CINE20"
              value={formValues.code}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
              }
            />
            <div className="space-y-1.5">
              <label
                htmlFor="coupon-discount-type"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-200"
              >
                Loại giảm giá
              </label>
              <Select
                id="coupon-discount-type"
                ariaLabel="Loại giảm giá"
                value={formValues.discountType}
                onChange={(nextVal) =>
                  setFormValues((prev) => ({
                    ...prev,
                    discountType:
                      typeof nextVal === 'string' ? nextVal : nextVal?.target?.value || 'percent',
                  }))
                }
                options={DISCOUNT_TYPE_OPTIONS}
              />
            </div>
          </div>

          <FormField
            label="Mô tả ngắn"
            placeholder="Ví dụ: Giảm 20% cho đơn vé cuối tuần"
            value={formValues.description}
            onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={formValues.discountType === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (₫)'}
              type="number"
              required
              min="1"
              max={formValues.discountType === 'percent' ? '100' : undefined}
              value={formValues.discountValue}
              onChange={(e) => setFormValues((prev) => ({ ...prev, discountValue: e.target.value }))}
            />
            {formValues.discountType === 'percent' ? (
              <FormField
                label="Giảm tối đa (₫, bỏ trống nếu không giới hạn)"
                type="number"
                min="0"
                value={formValues.maxDiscount}
                onChange={(e) => setFormValues((prev) => ({ ...prev, maxDiscount: e.target.value }))}
              />
            ) : (
              <FormField
                label="Giá trị đơn tối thiểu (₫)"
                type="number"
                min="0"
                value={formValues.minOrderAmount}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                }
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {formValues.discountType === 'percent' && (
              <FormField
                label="Đơn tối thiểu (₫)"
                type="number"
                min="0"
                value={formValues.minOrderAmount}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                }
              />
            )}
            <FormField
              label="Số lượt dùng tối đa"
              type="number"
              required
              min="1"
              value={formValues.maxUses}
              onChange={(e) => setFormValues((prev) => ({ ...prev, maxUses: e.target.value }))}
            />
            <FormField
              label="Ngày hết hạn"
              type="date"
              required
              value={formValues.expiresAt}
              onChange={(e) => setFormValues((prev) => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input
              type="checkbox"
              checked={formValues.isActive}
              onChange={(e) => setFormValues((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
            />
            Kích hoạt voucher ngay
          </label>

          {formError && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              {editingCoupon ? 'Lưu thay đổi' : 'Tạo voucher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={Boolean(couponToDelete)}
        onClose={() => !deleting && setCouponToDelete(null)}
        title="Xác nhận xóa voucher"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={deleting} onClick={() => setCouponToDelete(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Xác nhận xóa
            </Button>
          </div>
        }
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Bạn có chắc chắn muốn xóa mã giảm giá{' '}
          <strong className="text-neutral-950 dark:text-white">{couponToDelete?.code}</strong>? Hành động
          này không thể hoàn tác.
        </p>
      </Modal>
    </section>
  );
}

export default AdminCoupons;
