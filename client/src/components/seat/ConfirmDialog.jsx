import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { Button, Modal, useToast } from '../ui';
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

  useEffect(() => {
    if (isOpen) {
      setError('');
      setConflictMessage('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (seats.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      // api đã có baseURL '/api' nên chỉ gọi '/bookings'
      const res = await api.post('/bookings', {
        showtimeId,
        seats: seats.map(({ row, number }) => ({ row, number })),
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
        // Bỏ các ghế vừa mất khỏi lựa chọn để tổng tiền được tính lại đúng
        lost.forEach((l) => {
          const selected = seats.find((s) => s.row === l.row && s.number === l.number);
          if (selected) dispatch(toggleSeat(selected));
        });
        setConflictMessage(
          lost.length
            ? `Ghế ${lost.map(seatLabel).join(', ')} đã có người đặt trước. Ghế này đã được bỏ khỏi lựa chọn của bạn, vui lòng chọn ghế khác!`
            : err.response.data?.message || 'Một số ghế đã có người đặt trước.'
        );
        // Tải lại sơ đồ để ghế vừa mất hiển thị là "đã bán"
        if (onConflict) await onConflict();
      } else {
        setError(getErrorMessage(err, 'Đặt vé thất bại. Vui lòng thử lại!'));
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
              <span className="block text-xs font-semibold uppercase text-slate-400">Ghế đã chọn:</span>
              <p className="mt-1 font-bold text-brand-600 dark:text-brand-400">
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

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <span className="font-medium text-slate-600 dark:text-slate-400">Tổng tiền thanh toán:</span>
              <span className="text-xl font-black text-brand-600 dark:text-brand-500">
                {Number(totalAmount).toLocaleString('vi-VN')} đ
              </span>
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

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={submitting}
              data-testid="confirm-submit"
            >
              Xác nhận thanh toán
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default ConfirmDialog;