import React, { useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button } from '../ui';

// ô nhập và kiểm tra mã giảm giá tại bước xác nhận đặt vé
export function CouponInput({
  orderAmount = 0, // tổng tiền đơn hàng trước khi giảm
  appliedCoupon = null, // thông tin mã giảm giá đã áp dụng thành công
  onApply, // gọi lại khi kiểm tra mã thành công
  onRemove, // gọi lại khi người dùng bỏ mã đang áp dụng
  disabled = false, // khóa thao tác khi đang gửi đơn
}) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // gửi mã lên API POST /api/coupons/validate để kiểm tra và tính tiền giảm
  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Vui lòng nhập mã giảm giá.');
      return;
    }

    setChecking(true);
    setError('');
    try {
      const res = await api.post('/coupons/validate', {
        code: trimmed,
        orderAmount,
      });
      const data = res.data?.data;
      if (data && onApply) {
        onApply(data);
        setCode('');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Mã giảm giá không hợp lệ.'));
    } finally {
      setChecking(false);
    }
  };

  // bỏ mã giảm giá đang áp dụng
  const handleRemove = () => {
    setError('');
    if (onRemove) onRemove();
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="coupon-code-input"
        className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400"
      >
        Mã giảm giá (Coupon)
      </label>

      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="min-w-0">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              Đã áp dụng: {appliedCoupon.code}
            </p>
            <p className="text-emerald-600 dark:text-emerald-400">
              Giảm {Number(appliedCoupon.discountAmount || 0).toLocaleString('vi-VN')} đ
              {appliedCoupon.description ? ` · ${appliedCoupon.description}` : ''}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRemove}
            disabled={disabled}
            data-testid="coupon-remove"
          >
            Bỏ mã
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            id="coupon-code-input"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="Nhập mã (VD: CINE10)"
            disabled={disabled || checking}
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <Button
            variant="secondary"
            onClick={handleApply}
            loading={checking}
            disabled={disabled}
            className="min-h-[44px] shrink-0"
            data-testid="coupon-apply"
          >
            Áp dụng
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default CouponInput;
