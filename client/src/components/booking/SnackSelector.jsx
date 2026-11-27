import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Spinner } from '../ui';

// khu vực chọn thêm combo bắp nước khi đặt vé
export function SnackSelector({
  snacks: snacksProp = null, // cho phép truyền sẵn danh sách món (dùng khi test hoặc dữ liệu có sẵn)
  selectedSnacks = [], // mảng [{ snackId, name, price, quantity }]
  onChange, // gọi lại khi thay đổi số lượng món
  onBack, // tùy chọn: quay lại bước chọn ghế
  onSkip, // tùy chọn: bỏ qua bắp nước để đặt vé ngay
  onContinue, // tùy chọn: tiếp tục xác nhận thanh toán
  disabled = false,
}) {
  const [items, setItems] = useState(Array.isArray(snacksProp) ? snacksProp : []);
  const [loading, setLoading] = useState(!Array.isArray(snacksProp));
  const [error, setError] = useState('');

  // tải danh sách combo đang bán từ API nếu chưa truyền prop snacks
  useEffect(() => {
    if (Array.isArray(snacksProp)) {
      setItems(snacksProp);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    api
      .get('/snacks', { signal: controller.signal })
      .then((res) => {
        setItems(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          setError(getErrorMessage(err, 'Không tải được danh sách combo bắp nước.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [snacksProp]);

  // lấy số lượng hiện tại của từng món đang chọn
  const getQuantity = (snackId) => {
    const found = selectedSnacks.find((s) => s.snackId === snackId);
    return found ? found.quantity : 0;
  };

  // tăng hoặc giảm số lượng combo đã chọn
  const updateQuantity = (snack, delta) => {
    if (!onChange || disabled) return;
    const currentQty = getQuantity(snack._id);
    const nextQty = Math.max(0, Math.min(20, currentQty + delta));
    if (nextQty === currentQty) return;

    const others = selectedSnacks.filter((s) => s.snackId !== snack._id);
    if (nextQty === 0) {
      onChange(others);
    } else {
      onChange([
        ...others,
        {
          snackId: snack._id,
          name: snack.name,
          price: Number(snack.price) || 0,
          quantity: nextQty,
        },
      ]);
    }
  };

  return (
    <section
      aria-label="Chọn combo bắp nước"
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Combo Bắp Nước (F&amp;B)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chọn thêm bắp rang bơ và nước uống cho buổi xem phim trọn vẹn hơn
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner label="Đang tải menu bắp nước..." />
        </div>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hiện chưa có combo bắp nước nào khả dụng.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((snack) => {
            const qty = getQuantity(snack._id);
            return (
              <div
                key={snack._id}
                data-testid={`snack-item-${snack._id}`}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  qty > 0
                    ? 'border-brand-500 bg-brand-50/40 dark:border-brand-400/70 dark:bg-brand-950/30'
                    : 'border-neutral-200 bg-neutral-50/60 dark:border-cinema-border dark:bg-cinema-elevated/50'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {snack.imageUrl ? (
                    <img
                      src={snack.imageUrl}
                      alt={snack.name}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover bg-slate-200 dark:bg-slate-700"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xl dark:bg-amber-950/60">
                      🍿
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {snack.name}
                    </h3>
                    {snack.description && (
                      <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {snack.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs font-bold text-brand-600 dark:text-brand-300">
                      {Number(snack.price || 0).toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                </div>

                {/* cụm nút tăng giảm số lượng */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(snack, -1)}
                    disabled={disabled || qty === 0}
                    aria-label={`Giảm số lượng ${snack.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-base font-bold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    −
                  </button>
                  <span
                    data-testid={`snack-qty-${snack._id}`}
                    className="min-w-[24px] text-center text-sm font-bold text-neutral-900 dark:text-white"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(snack, 1)}
                    disabled={disabled || qty >= 20}
                    aria-label={`Tăng số lượng ${snack.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-600 bg-brand-600 text-base font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(onBack || onSkip || onContinue) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-cinema-borderSubtle">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={disabled}
              data-testid="snack-step-back"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              ← Quay lại chọn ghế
            </button>
          ) : (
            <span />
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={disabled}
                data-testid="snack-step-skip"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Bỏ qua bắp nước
              </button>
            )}
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                disabled={disabled}
                data-testid="snack-step-continue"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
              >
                Tiếp tục thanh toán
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default SnackSelector;
