import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { Button, Modal, useToast } from '../ui';
import CouponInput from './CouponInput';
import { clearSeats, toggleSeat } from '../../store/slices/bookingSlice';

const seatLabel = (s) => `${s.row}${s.number}`;
export function ConfirmDialog({
  isOpen,
  onClose,
  showtimeId,
  movieTitle,
  roomName,
  startTime,
  seats = [],
  snacks = [],
  totalAmount = 0,
  onConflict,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflictMessage, setConflictMessage] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [loyaltyRate, setLoyaltyRate] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState('');

  useEffect(() => {
    let active = true;
    if (isOpen) {
      setError('');
      setConflictMessage('');
      if (typeof api.get === 'function') {
        api
          .get('/loyalty/me')
          .then((res) => {
            if (!active) return;
            const pts = Number(res.data?.data?.points) || 0;
            setAvailablePoints(pts);
            const tierRate = Number.parseInt(res.data?.data?.tierInfo?.discountRate, 10);
            setLoyaltyRate(Number.isFinite(tierRate) ? tierRate / 100 : 0);
          })
          .catch(() => {
            if (!active) return;
            setAvailablePoints(0);
            setLoyaltyRate(0);
          });
      }
    } else {
      setAppliedCoupon(null);
      setUsePoints(false);
      setPointsInput('');
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  // bỏ mã giảm giá nếu danh sách ghế đổi làm thay đổi tổng tiền gốc
  useEffect(() => {
    setAppliedCoupon(null);
  }, [totalAmount]);

  const discountAmount = Number(appliedCoupon?.discountAmount) || 0;
  const loyaltyDiscount = Math.round(Number(totalAmount) * loyaltyRate);
  const amountAfterCoupon = Math.max(0, Number(totalAmount) - loyaltyDiscount - discountAmount);
  const maxUsablePoints = Math.min(availablePoints, amountAfterCoupon);
  const parsedPoints = Math.floor(Number(pointsInput) || 0);
  const pointsToUse = usePoints
    ? Math.max(0, Math.min(parsedPoints, maxUsablePoints))
    : 0;
  const finalAmount = Math.max(0, amountAfterCoupon - pointsToUse);

  const handleTogglePoints = (checked) => {
    setUsePoints(checked);
    if (checked) {
      setPointsInput(String(maxUsablePoints));
    } else {
      setPointsInput('');
    }
  };

  const handlePointsInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setPointsInput('');
      return;
    }
    const clamped = Math.min(Number(raw), maxUsablePoints);
    setPointsInput(String(clamped));
  };

  const handleConfirm = async () => {
    if (seats.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      // api đã có baseURL '/api' nên chỉ gọi '/bookings'
      const res = await api.post('/bookings', {
        showtimeId,
        seats: seats.map(({ row, number }) => ({ row, number })),
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
        ...(pointsToUse > 0 ? { pointsToUse } : {}),
        ...(Array.isArray(snacks) && snacks.length > 0
          ? { snacks: snacks.map(({ snackId, quantity }) => ({ snackId, quantity })) }
          : {}),
      });
      const booking = res.data?.data?.booking;

      toast.success('Đặt vé thành công!');
      dispatch(clearSeats());
      onClose();
      navigate(booking?._id ? `/bookings/${booking._id}` : '/my-bookings');
    } catch (err) {
      if (err.response?.status === 409) {
        const lost = err.response.data?.conflictingSeats || [];
        lost.forEach((l) => {
          const selected = seats.find((s) => s.row === l.row && s.number === l.number);
          if (selected) dispatch(toggleSeat(selected));
        });
        setConflictMessage(
          lost.length
            ? `Ghế ${lost.map(seatLabel).join(', ')} đã có người đặt trước. Ghế này đã được bỏ khỏi lựa chọn của bạn, vui lòng chọn ghế khác!`
            : err.response.data?.message || 'Một số ghế đã có người đặt trước.'
        );
        if (onConflict) await onConflict();
      } else {
        setError(getErrorMessage(err, 'Đặt vé thất bại. Vui lòng thử lại!'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // tạo phiên thanh toán VietQR giữ chỗ 10 phút và chuyển sang trang Checkout
  const handleVietQrCheckout = async () => {
    if (seats.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      // gửi suất chiếu, ghế, mã giảm giá và combo để server tạo đơn pending + mã VietQR
      const res = await api.post('/payments/create', {
        showtimeId,
        seats: seats.map(({ row, number }) => ({ row, number })),
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
        ...(pointsToUse > 0 ? { pointsToUse } : {}),
        ...(Array.isArray(snacks) && snacks.length > 0
          ? { snacks: snacks.map(({ snackId, quantity }) => ({ snackId, quantity })) }
          : {}),
      });
      const payment = res.data?.data?.payment;
      toast.success('Đã tạo mã thanh toán VietQR. Vui lòng hoàn tất trong 10 phút.');
      // xóa ghế đang chọn trong Redux vì ghế đã được chuyển sang giữ chỗ pending ở server
      dispatch(clearSeats());
      onClose();
      if (payment?._id) {
        navigate(`/checkout/${payment._id}`);
      } else {
        navigate('/my-bookings');
      }
    } catch (err) {
      // nếu có người khác nhanh tay đặt mất ghế thì bỏ ghế trùng và tải lại sơ đồ
      if (err.response?.status === 409) {
        const lost = err.response.data?.conflictingSeats || [];
        lost.forEach((l) => {
          const selected = seats.find((s) => s.row === l.row && s.number === l.number);
          if (selected) dispatch(toggleSeat(selected));
        });
        setConflictMessage(
          lost.length
            ? `Ghế ${lost.map(seatLabel).join(', ')} đã có người đặt trước. Ghế này đã được bỏ khỏi lựa chọn của bạn, vui lòng chọn ghế khác!`
            : err.response.data?.message || 'Một số ghế đã có người đặt trước.'
        );
        if (onConflict) await onConflict();
      } else {
        setError(getErrorMessage(err, 'Không thể khởi tạo thanh toán VietQR.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Xác nhận đặt vé" size="md">
      {conflictMessage ? (
        <>
          <div
            role="alert"
            data-testid="confirm-conflict"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {conflictMessage}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={onClose} data-testid="confirm-close">
              Chọn lại ghế
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-base font-bold text-slate-900 dark:text-white">{movieTitle}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Phòng: <strong className="text-slate-800 dark:text-slate-200">{roomName}</strong>
                </div>
                <div>
                  Suất chiếu:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {startTime
                      ? new Date(startTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Ghế đã chọn:</span>
              <p className="mt-1 font-bold text-brand-600 dark:text-brand-300">
                {seats.map(seatLabel).join(', ')} ({seats.length} ghế)
              </p>
            </div>

            {Array.isArray(snacks) && snacks.length > 0 && (
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Combo bắp nước:</span>
                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {snacks.map((s) => `${s.name} x${s.quantity}`).join(', ')}
                </p>
              </div>
            )}

            <CouponInput
              orderAmount={Math.max(0, Number(totalAmount) - loyaltyDiscount)}
              appliedCoupon={appliedCoupon}
              onApply={setAppliedCoupon}
              onRemove={() => setAppliedCoupon(null)}
              disabled={submitting}
            />

            {loyaltyDiscount > 0 && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Ưu đãi thành viên ({Math.round(loyaltyRate * 100)}%): giảm {loyaltyDiscount.toLocaleString('vi-VN')} đ</p>}

            {availablePoints > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-950/20">
                <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => handleTogglePoints(e.target.checked)}
                      disabled={submitting || maxUsablePoints <= 0}
                      data-testid="use-points-checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      Dùng điểm tích lũy (Khả dụng:{' '}
                      <strong className="text-amber-600 dark:text-amber-400">
                        {availablePoints.toLocaleString('vi-VN')} điểm
                      </strong>
                      )
                    </span>
                  </span>
                </label>
                {usePoints && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={maxUsablePoints}
                      value={pointsInput}
                      onChange={handlePointsInputChange}
                      disabled={submitting}
                      data-testid="points-input"
                      aria-label="Số điểm muốn dùng"
                      placeholder="Nhập số điểm muốn dùng"
                      className="min-h-[38px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setPointsInput(String(maxUsablePoints))}
                      disabled={submitting}
                      className="min-h-[38px] rounded-lg border border-amber-400/60 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                    >
                      Dùng tối đa
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
              {(discountAmount > 0 || pointsToUse > 0) && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Tạm tính:</span>
                  <span>{Number(totalAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span>Giảm giá ({appliedCoupon?.code}):</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {pointsToUse > 0 && (
                <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
                  <span>Dùng điểm tích lũy:</span>
                  <span>-{pointsToUse.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-600 dark:text-neutral-400">Tổng tiền thanh toán:</span>
                <span className="text-xl font-black tabular-nums text-brand-600 dark:text-brand-300">
                  {finalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Hủy
            </Button>
            <Button
              variant="secondary"
              onClick={handleVietQrCheckout}
              disabled={submitting}
              data-testid="confirm-vietqr"
            >
              Thanh toán VietQR
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                loading={submitting}
                data-testid="confirm-submit"
              >
                Xác nhận đặt vé thử
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export default ConfirmDialog;
