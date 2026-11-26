import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { Button, EmptyState, Spinner, useToast } from '../components/ui';

// chuyển đổi số giây còn lại sang chuỗi đếm ngược MM:SS
const formatCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// định dạng tiền tệ sang VND
const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

// trang thanh toán trực tuyến VietQR kèm giữ chỗ 10 phút
export function Checkout() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // state lưu thông tin thanh toán, booking, danh sách vé và thời gian giữ chỗ còn lại
  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // gọi API lấy trạng thái mới nhất của phiên thanh toán
  const fetchPaymentStatus = useCallback(async () => {
    if (!paymentId) return;
    try {
      const res = await api.get(`/payments/${paymentId}`);
      const payload = res.data?.data || {};
      setPayment(payload.payment || null);
      setBooking(payload.booking || null);
      setTickets(payload.tickets || []);
      setRemainingSeconds(Number(payload.remainingSeconds) || 0);
      setError('');

      // nếu giao dịch đã được xác nhận paid thì chuyển thẳng sang trang chi tiết vé
      if (payload.payment?.status === 'paid' && payload.booking?._id) {
        toast.success('Thanh toán thành công! Đang chuyển tới vé của bạn...');
        navigate(`/bookings/${payload.booking._id}`, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được thông tin thanh toán.'));
    } finally {
      setLoading(false);
    }
  }, [paymentId, navigate, toast]);

  // nạp thông tin giao dịch lần đầu khi mở trang
  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  // tự động polling trạng thái mỗi 3 giây khi đơn vẫn đang chờ thanh toán
  useEffect(() => {
    if (!payment || payment.status !== 'pending') return undefined;
    const pollId = setInterval(() => {
      fetchPaymentStatus();
    }, 3000);
    // dọn interval khi rời trang hoặc trạng thái không còn pending
    return () => clearInterval(pollId);
  }, [payment, fetchPaymentStatus]);

  // đếm ngược từng giây trên giao diện và đồng bộ lại server khi hết giờ
  useEffect(() => {
    if (!payment || payment.status !== 'pending') return undefined;
    const timerId = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          fetchPaymentStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [payment, fetchPaymentStatus]);

  // gửi tín hiệu webhook demo để xác nhận thanh toán thành công ngay trên giao diện kiểm thử
  const handleSimulateWebhook = async () => {
    if (!payment || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.post('/payments/webhook', {
        orderCode: payment.orderCode,
        paymentId: payment._id,
        status: 'paid',
      });
      const confirmedBookingId = res.data?.data?.booking?._id || booking?._id;
      toast.success('Xác nhận thanh toán VietQR thành công!');
      if (confirmedBookingId) {
        navigate(`/bookings/${confirmedBookingId}`, { replace: true });
      } else {
        navigate('/my-bookings', { replace: true });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xác nhận thanh toán thất bại.'));
      await fetchPaymentStatus();
    } finally {
      setActionLoading(false);
    }
  };

  // hủy phiên thanh toán hiện tại và trả ghế về trạng thái trống
  const handleCancelPayment = async () => {
    if (!payment || actionLoading) return;
    setActionLoading(true);
    try {
      await api.post(`/payments/${payment._id}/cancel`);
      toast.info('Đã hủy phiên thanh toán và giải phóng ghế.');
      navigate('/movies');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể hủy phiên thanh toán.'));
    } finally {
      setActionLoading(false);
    }
  };

  // hiển thị spinner trong lúc tải dữ liệu phiên thanh toán ban đầu
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Đang tải cổng thanh toán VietQR..." />
      </div>
    );
  }

  // hiển thị trạng thái rỗng nếu id giao dịch không tồn tại hoặc không có quyền xem
  if (error || !payment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <EmptyState
          title="Không tìm thấy phiên thanh toán"
          description={error || 'Giao dịch thanh toán không tồn tại hoặc đã bị xóa.'}
          action={
            <Button variant="primary" onClick={() => navigate('/movies')}>
              Quay lại danh sách phim
            </Button>
          }
        />
      </div>
    );
  }

  // tách các thông tin cần hiển thị cho đơn hàng và trạng thái hết hạn/hủy
  const isExpiredOrCancelled = payment.status === 'expired' || payment.status === 'cancelled';
  const movieTitle = booking?.showtimeId?.movieId?.title || 'Phim';
  const roomName = booking?.showtimeId?.roomId?.name || 'Phòng chiếu';
  const seatsLabel = tickets.map((t) => `${t.row}${t.number}`).join(', ') || '—';

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* phần đầu hiển thị mã đơn và đồng hồ đếm ngược giữ chỗ 10 phút */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-rose-500">Thanh toán trực tuyến VietQR</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Đơn hàng {payment.orderCode}
          </h1>
        </div>
        {payment.status === 'pending' && (
          <div
            data-testid="payment-countdown"
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              remainingSeconds <= 60
                ? 'border-rose-500 bg-rose-950/80 text-rose-200 animate-pulse'
                : 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
            }`}
          >
            Giữ chỗ còn: <span className="font-mono text-base">{formatCountdown(remainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* nếu phiên đã hết hạn hoặc bị hủy thì báo cho người dùng chọn lại suất chiếu */}
      {isExpiredOrCancelled ? (
        <div
          role="alert"
          data-testid="payment-expired"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40"
        >
          <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300">
            {payment.status === 'expired' ? 'Phiên thanh toán đã hết hạn (10 phút)' : 'Phiên thanh toán đã bị hủy'}
          </h2>
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-200">
            Các ghế giữ chỗ đã được tự động giải phóng. Vui lòng chọn lại suất chiếu để đặt vé mới.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/movies')}>
              Chọn phim khác
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* cột trái: mã ảnh VietQR và thông tin chuyển khoản ngân hàng */}
          <section className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Quét mã VietQR bằng ứng dụng ngân hàng
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <img
                src={payment.qrUrl}
                alt={`Mã VietQR đơn ${payment.orderCode}`}
                className="h-64 w-64 object-contain"
              />
            </div>
            <div className="mt-4 w-full space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Ngân hàng:</span>
                <strong>{payment.bankInfo?.bankId}</strong>
              </div>
              <div className="flex justify-between">
                <span>Số tài khoản:</span>
                <strong className="font-mono">{payment.bankInfo?.accountNo}</strong>
              </div>
              <div className="flex justify-between">
                <span>Chủ tài khoản:</span>
                <strong>{payment.bankInfo?.accountName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Nội dung CK:</span>
                <strong className="font-mono text-rose-600 dark:text-rose-400">
                  {payment.bankInfo?.transferContent}
                </strong>
              </div>
            </div>
          </section>

          {/* cột phải: tóm tắt vé đang giữ chỗ và các nút thao tác thanh toán/hủy */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thông tin đặt vé</h2>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between gap-2">
                  <span>Phim:</span>
                  <strong className="text-right text-slate-900 dark:text-white">{movieTitle}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Phòng chiếu:</span>
                  <strong>{roomName}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Ghế giữ chỗ:</span>
                  <strong className="text-rose-600 dark:text-rose-400">{seatsLabel}</strong>
                </div>
                <div className="flex justify-between gap-2 border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono text-lg text-rose-600 dark:text-rose-400">
                    {formatPrice(payment.amount)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hệ thống tự động kiểm tra trạng thái mỗi 3 giây. Sau 10 phút chưa thanh toán, ghế sẽ được tự động mở lại.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSimulateWebhook}
                loading={actionLoading}
                data-testid="btn-confirm-webhook"
              >
                Xác nhận đã chuyển khoản (Demo)
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleCancelPayment}
                disabled={actionLoading}
              >
                Hủy giao dịch &amp; nhả ghế
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Checkout;
