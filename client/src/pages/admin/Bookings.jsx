import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import { TicketQR } from '../../components/ticket/TicketQR';
import { Button, EmptyState, Modal, Pagination, Spinner, useToast } from '../../components/ui';

// số dòng tối đa trên mỗi trang danh sách vé
const LIMIT = 10;

// danh sách trạng thái cho phép lọc ở bộ lọc checkbox
const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'cancelled', label: 'Đã hủy' },
];

// tùy chọn sắp xếp đơn đặt vé gửi lên server
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'createdAt', label: 'Cũ nhất' },
  { value: '-totalPrice', label: 'Tổng tiền giảm dần' },
  { value: 'totalPrice', label: 'Tổng tiền tăng dần' },
];

// class màu badge ứng với từng trạng thái đơn
const STATUS_BADGE = {
  confirmed:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  pending:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// nhãn hiển thị tiếng Việt cho trạng thái đơn
const STATUS_LABELS = {
  confirmed: 'Đã xác nhận',
  pending: 'Chờ thanh toán',
  cancelled: 'Đã hủy',
};

// class dùng chung cho các ô input/select của bộ lọc
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

// định dạng ngày giờ theo chuẩn Việt Nam (HH:mm DD/MM/YYYY)
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

// định dạng số tiền sang đơn vị VND
const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;

// gộp danh sách vé trong đơn thành chuỗi tên ghế (ví dụ: A1, A2)
const formatSeats = (tickets) =>
  (tickets || [])
    .map((t) => `${t.row}${t.number}`)
    .join(', ') || '—';

// trang quản lý toàn bộ vé đã bán dành cho admin
export function Bookings() {
  const toast = useToast();

  // state ô tìm kiếm và giá trị đã debounce 400ms để tránh gọi API liên tục khi đang gõ
  const [searchInput, setSearchInput] = useState('');
  const debouncedQuery = useDebounce(searchInput, 400);

  // state bộ lọc trạng thái, suất chiếu, khoảng ngày và sắp xếp
  const [statuses, setStatuses] = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('-createdAt');

  // state dữ liệu danh sách vé và phân trang từ server
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // state loading, thông báo lỗi và biến kích hoạt tải lại bảng
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // state điều khiển modal xem chi tiết/in vé và modal xác nhận hủy hỗ trợ
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // tải danh sách suất chiếu một lần lúc mở trang để đổ vào dropdown lọc theo suất
  useEffect(() => {
    let active = true;
    api
      .get('/showtimes', { params: { limit: 50 } })
      .then((res) => {
        // chỉ cập nhật state khi component vẫn còn mount
        if (active) {
          setShowtimes(res.data?.data || []);
        }
      })
      .catch(() => {
        if (active) setShowtimes([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // gọi API lấy danh sách vé mỗi khi bộ lọc, từ khóa, trang hoặc refreshKey thay đổi
  useEffect(() => {
    const controller = new AbortController();
    // gom tham số truy vấn gửi lên GET /api/bookings
    const params = { page, limit: LIMIT, sort };
    if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
    if (statuses.length) params.status = statuses.join(',');
    if (showtimeId) params.showtimeId = showtimeId;
    if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
    if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();

    setLoading(true);
    setError('');
    api
      .get('/bookings', { params, signal: controller.signal })
      .then((res) => {
        setBookings(res.data?.data || []);
        setPages(res.data?.pages || 1);
        setTotal(res.data?.total || 0);
      })
      .catch((err) => {
        // bỏ qua lỗi do AbortController hủy request cũ khi người dùng đổi bộ lọc nhanh
        if (controller.signal.aborted) return;
        setBookings([]);
        setError(getErrorMessage(err, 'Không tải được danh sách vé đã bán.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // hủy request đang chạy nếu component unmount hoặc dependency đổi
    return () => controller.abort();
  }, [debouncedQuery, statuses, showtimeId, from, to, sort, page, refreshKey]);

  // bật/tắt một trạng thái trong mảng lọc và đưa bảng về trang 1
  const toggleStatus = (value) => {
    setStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
    setPage(1);
  };

  // helper cập nhật bộ lọc dạng select/date và đặt lại trang hiện tại về 1
  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  // gọi API hủy đơn đặt vé hỗ trợ khi admin xác nhận trên modal
  const handleConfirmCancel = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${cancelTarget._id}/cancel`);
      toast.success('Đã hủy đơn đặt vé và giải phóng ghế.');
      setCancelTarget(null);
      // tăng refreshKey để tải lại danh sách đơn mới nhất từ server
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể hủy đơn đặt vé.'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="space-y-5">
      {/* tiêu đề trang quản trị vé đã bán */}
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản trị</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Vé đã bán</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tra cứu đơn đặt vé theo mã vé, khách hàng, suất chiếu, trạng thái và khoảng ngày đặt.
        </p>
      </div>

      {/* khu vực bộ lọc tìm kiếm, suất chiếu, trạng thái, ngày đặt và sắp xếp */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Tìm kiếm (mã vé / SĐT / email)
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập #mã vé, tên, email hoặc SĐT..."
            className={inputClass}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Suất chiếu</span>
          <select value={showtimeId} onChange={changeFilter(setShowtimeId)} className={inputClass}>
            <option value="">Tất cả suất chiếu</option>
            {showtimes.map((st) => (
              <option key={st._id} value={st._id}>
                {st.movieId?.title || 'Phim'} • {st.roomId?.name || 'Phòng'} • {formatDateTime(st.startTime)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Trạng thái</legend>
          <div className="flex flex-wrap gap-3 pt-1">
            {STATUS_OPTIONS.map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={statuses.includes(option.value)}
                  onChange={() => toggleStatus(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Từ ngày</span>
          <input type="date" value={from} onChange={changeFilter(setFrom)} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Đến ngày</span>
          <input type="date" value={to} onChange={changeFilter(setTo)} className={inputClass} />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sắp xếp</span>
          <select value={sort} onChange={changeFilter(setSort)} className={inputClass}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* khối hiển thị thông báo lỗi kèm nút thử lại khi gọi API thất bại */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      {/* bảng dữ liệu danh sách đơn đặt vé */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Đang tải danh sách vé..." />
          </div>
        ) : bookings.length === 0 && !error ? (
          <EmptyState
            title="Không có vé nào"
            description="Thử đổi từ khóa, suất chiếu, trạng thái hoặc khoảng ngày để xem các đơn khác."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm" data-testid="admin-bookings-table">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã đơn</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Phim</th>
                  <th className="px-4 py-3 font-semibold">Phòng</th>
                  <th className="px-4 py-3 font-semibold">Suất chiếu</th>
                  <th className="px-4 py-3 font-semibold">Ghế</th>
                  <th className="px-4 py-3 font-semibold">Tổng tiền</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày đặt</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="text-slate-700 dark:text-slate-200">
                    {/* hiển thị 6 ký tự cuối in hoa làm mã đơn rút gọn */}
                    <td className="px-4 py-4 font-mono text-xs" title={booking._id}>
                      #{booking._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold">{booking.userId?.fullName || 'Người dùng đã bị xóa'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{booking.userId?.email}</div>
                      {booking.userId?.phone && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{booking.userId.phone}</div>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-4 font-semibold" title={booking.showtimeId?.movieId?.title}>
                      {booking.showtimeId?.movieId?.title || '—'}
                    </td>
                    <td className="px-4 py-4">{booking.showtimeId?.roomId?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDateTime(booking.showtimeId?.startTime)}</td>
                    <td className="px-4 py-4 font-semibold text-brand-600 dark:text-brand-400">{formatSeats(booking.tickets)}</td>
                    <td className="whitespace-nowrap px-4 py-4">{formatPrice(booking.totalPrice)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_BADGE[booking.status] || STATUS_BADGE.cancelled
                        }`}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">{formatDateTime(booking.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          Chi tiết / In vé
                        </Button>
                        {/* chỉ hiện nút hủy hỗ trợ với các đơn chưa bị hủy */}
                        {booking.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setCancelTarget(booking)}
                          >
                            Hủy vé
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* thanh tóm tắt tổng số đơn và phân trang server */}
      {!loading && total > 0 && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Tổng {total} đơn • Trang {page}/{pages}
        </p>
      )}
      <Pagination page={page} pages={pages} onPageChange={setPage} />

      {/* modal xem chi tiết đơn, mã QR và nút in vé tại quầy */}
      <Modal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Chi tiết đơn #${selectedBooking._id.slice(-6).toUpperCase()}` : 'Chi tiết đơn'}
        size="lg"
        footer={
          selectedBooking && (
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                In vé quầy
              </Button>
              <Button variant="primary" onClick={() => setSelectedBooking(null)}>
                Đóng
              </Button>
            </>
          )
        }
      >
        {selectedBooking && (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Khách hàng</p>
                <p className="font-semibold">{selectedBooking.userId?.fullName || '—'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedBooking.userId?.email}</p>
                {selectedBooking.userId?.phone && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedBooking.userId.phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Thông tin suất chiếu</p>
                <p className="font-semibold">{selectedBooking.showtimeId?.movieId?.title || '—'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedBooking.showtimeId?.roomId?.name || '—'} • {formatDateTime(selectedBooking.showtimeId?.startTime)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Ghế:</span>
                <strong>{formatSeats(selectedBooking.tickets)}</strong>
              </div>
              {Array.isArray(selectedBooking.snacks) && selectedBooking.snacks.length > 0 && (
                <div className="flex justify-between gap-4">
                  <span>Combo bắp nước:</span>
                  <span className="text-right">
                    {selectedBooking.snacks.map((s) => `${s.name} x${s.quantity}`).join(', ')}
                  </span>
                </div>
              )}
              {selectedBooking.couponCode && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Mã giảm giá ({selectedBooking.couponCode}):</span>
                  <span>-{formatPrice(selectedBooking.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-800">
                <span>Tổng thanh toán:</span>
                <span className="text-brand-600 dark:text-brand-400">
                  {formatPrice(selectedBooking.totalPrice)}
                </span>
              </div>
            </div>

            {/* hiển thị mã QR vé để nhân viên quầy hoặc khách quét kiểm tra */}
            <TicketQR booking={selectedBooking} />
          </div>
        )}
      </Modal>

      {/* modal xác nhận trước khi hủy vé hỗ trợ cho khách */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => !cancelling && setCancelTarget(null)}
        title="Xác nhận hủy vé hỗ trợ"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel} loading={cancelling}>
              Xác nhận hủy vé
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bạn có chắc muốn hủy đơn{' '}
          <strong className="font-mono">
            #{cancelTarget?._id?.slice(-6).toUpperCase()}
          </strong>{' '}
          của khách hàng <strong>{cancelTarget?.userId?.fullName || 'khách hàng'}</strong>? Toàn bộ ghế thuộc đơn sẽ được giải phóng.
        </p>
      </Modal>
    </section>
  );
}

export default Bookings;
