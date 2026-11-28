import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import api, { getErrorMessage } from '../../api/axios';
import { useToast } from '../../components/ui';

function StatusIcon({ type }) {
  if (type === 'success') {
    return (
      <svg className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    );
  }
  if (type === 'duplicate') {
    return (
      <svg className="h-8 w-8 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-8 w-8 shrink-0 text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

export function TicketScanner() {
  const [code, setCode] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    inputRef.current?.focus();
    api
      .get('/showtimes', { params: { limit: 50 } })
      .then((res) => {
        setShowtimes(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => {});

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const decodeFrameWithJsQr = (video) => {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return decoded?.data || null;
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ quét camera trực tiếp.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      const barcodeDetector =
        'BarcodeDetector' in window
          ? new window.BarcodeDetector({ formats: ['qr_code'] })
          : null;

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !streamRef.current) {
          stopCamera();
          return;
        }
        try {
          let rawVal = null;
          if (barcodeDetector) {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              rawVal = barcodes[0].rawValue;
            }
          } else {
            rawVal = decodeFrameWithJsQr(videoRef.current);
          }

          if (rawVal) {
            stopCamera();
            handleScanSubmit(rawVal);
          }
        } catch (e) {
          // Thử fallback jsQR nếu BarcodeDetector không hỗ trợ trên trình duyệt hiện tại
          try {
            const fallbackVal = decodeFrameWithJsQr(videoRef.current);
            if (fallbackVal) {
              stopCamera();
              handleScanSubmit(fallbackVal);
            }
          } catch (_) {}
        }
      }, 450);
    } catch (err) {
      setCameraError(err.message || 'Không thể mở camera. Vui lòng nhập mã hoặc dùng máy quét USB.');
      stopCamera();
    }
  };

  const handleScanSubmit = async (scanCode) => {
    const targetCode = String(scanCode || code).trim();
    if (!targetCode) return;

    setLoading(true);
    setScanResult(null);

    try {
      const payload = {
        code: targetCode,
        ...(selectedShowtimeId ? { showtimeId: selectedShowtimeId } : {}),
      };
      const response = await api.post('/bookings/check-in', payload);
      const data = response.data?.data;

      const successResult = {
        type: 'success',
        title: 'SOÁT VÉ THÀNH CÔNG',
        message: 'Vé hợp lệ - Đã đổi trạng thái sang checked-in',
        bookingId: data.bookingId,
        movieTitle: data.movieTitle || '—',
        roomName: data.roomName || '—',
        startTime: data.startTime,
        customerName: data.customerName || '—',
        customerEmail: data.customerEmail || '—',
        seats: data.seats || [],
        checkedInAt: data.checkedInAt || new Date().toISOString(),
      };

      setScanResult(successResult);
      setHistory((prev) => [successResult, ...prev.slice(0, 19)]);
      toast.success('Soát vé thành công!');
      setCode('');
    } catch (err) {
      const respData = err.response?.data;
      const errorCode = respData?.code;
      const errorMsg = respData?.message || getErrorMessage(err, 'Lỗi soát vé');
      const errData = respData?.data;

      let resultObj;
      if (errorCode === 'ALREADY_CHECKED_IN') {
        resultObj = {
          type: 'duplicate',
          title: 'VÉ ĐÃ SOÁT TRƯỚC ĐÓ (TRÙNG VÉ)',
          message: errorMsg,
          bookingId: errData?.bookingId || targetCode,
          movieTitle: errData?.movieTitle || '—',
          roomName: errData?.roomName || '—',
          startTime: errData?.startTime,
          seats: errData?.seats || [],
          checkedInAt: errData?.checkedInAt,
        };
        toast.warning('Vé này đã được soát trước đó!');
      } else if (errorCode === 'TICKET_CANCELLED') {
        resultObj = {
          type: 'cancelled',
          title: 'VÉ ĐÃ BỊ HỦY - TỪ CHỐI VÀO RẠP',
          message: errorMsg,
          bookingId: errData?.bookingId || targetCode,
          movieTitle: errData?.movieTitle || '—',
          seats: errData?.seats || [],
        };
        toast.error('Vé đã bị hủy!');
      } else if (errorCode === 'TICKET_PENDING') {
        resultObj = {
          type: 'error',
          title: 'VÉ CHƯA THANH TOÁN (PENDING)',
          message: errorMsg,
          bookingId: errData?.bookingId || targetCode,
          movieTitle: errData?.movieTitle || '—',
          seats: errData?.seats || [],
        };
        toast.error('Vé chưa hoàn tất thanh toán!');
      } else if (errorCode === 'WRONG_SHOWTIME') {
        resultObj = {
          type: 'wrong_showtime',
          title: 'VÉ SAI SUẤT CHIẾU',
          message: errorMsg,
          bookingId: targetCode,
        };
        toast.error('Vé sai suất chiếu!');
      } else {
        resultObj = {
          type: 'error',
          title: 'LỖI SOÁT VÉ',
          message: errorMsg,
          bookingId: targetCode,
        };
        toast.error(errorMsg);
      }

      setScanResult(resultObj);
      setHistory((prev) => [resultObj, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const onSubmitForm = (e) => {
    e.preventDefault();
    handleScanSubmit(code);
  };

  const formatSeats = (seats) => {
    if (!Array.isArray(seats) || seats.length === 0) return '—';
    return seats
      .map((s) => s.label || (s.row && s.number ? `${s.row}${s.number}` : ''))
      .filter(Boolean)
      .join(', ');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    const d = new Date(timeStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Soát vé tại quầy (Check-in Scanner)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quét mã QR hoặc nhập mã đơn đặt vé để kiểm tra và chuyển trạng thái vé sang checked-in
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
              <span>Tắt Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Mở Camera quét QR</span>
            </button>
          )}
        </div>
      </header>

      {/* Vùng Camera nếu bật */}
      {cameraActive && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-black p-4 text-center">
          <video ref={videoRef} playsInline muted className="mx-auto max-h-72 w-full max-w-md rounded-lg object-cover" />
          <p className="mt-2 text-xs text-slate-400">
            Hướng camera vào mã QR vé. Hệ thống tự động giải mã đa trình duyệt (BarcodeDetector / jsQR).
          </p>
        </div>
      )}

      {cameraError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          {cameraError}
        </div>
      )}

      {/* Form chọn suất chiếu kiểm soát & nhập/quét mã vạch */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={onSubmitForm} className="space-y-4">
          <div>
            <label htmlFor="scanner-showtime-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Suất chiếu đang soát (tùy chọn — bật để chặn vé sai suất)
            </label>
            <select
              id="scanner-showtime-select"
              value={selectedShowtimeId}
              onChange={(e) => setSelectedShowtimeId(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Tất cả suất chiếu (không khóa theo phòng)</option>
              {showtimes.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.movieId?.title || 'Phim'} · {st.roomId?.name || 'Phòng'} · {formatTime(st.startTime)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-code-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Mã QR / Mã đơn đặt vé (Hỗ trợ máy quét mã vạch USB/Bluetooth tự động)
            </label>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
              <input
                id="ticket-code-input"
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Quét mã QR hoặc dán mã booking ID (ví dụ: 65f...)..."
                disabled={loading}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-base text-slate-900 transition-colors focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
              >
                {loading ? 'Đang kiểm tra...' : 'Soát vé'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Kết quả quét trực quan ngay lập tức */}
      {scanResult && (
        <div
          data-testid="scan-result"
          className={`rounded-2xl border p-6 shadow-md transition-all ${
            scanResult.type === 'success'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100'
              : scanResult.type === 'duplicate'
              ? 'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100'
              : 'border-rose-600 bg-rose-50 text-rose-950 dark:border-rose-600/40 dark:bg-rose-950/40 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start gap-4">
            <StatusIcon type={scanResult.type} />
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-bold tracking-tight">{scanResult.title}</h2>
              <p className="text-sm font-medium">{scanResult.message}</p>

              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-xs uppercase opacity-70">Mã đơn vé:</span>
                  <p className="font-mono text-sm font-semibold">{scanResult.bookingId}</p>
                </div>
                {scanResult.movieTitle && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Phim:</span>
                    <p className="text-sm font-semibold">{scanResult.movieTitle}</p>
                  </div>
                )}
                {scanResult.roomName && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Phòng chiếu:</span>
                    <p className="text-sm font-semibold">{scanResult.roomName}</p>
                  </div>
                )}
                {scanResult.startTime && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Suất chiếu:</span>
                    <p className="text-sm font-semibold">{formatTime(scanResult.startTime)}</p>
                  </div>
                )}
                {scanResult.seats && scanResult.seats.length > 0 && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Ghế ngồi:</span>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {formatSeats(scanResult.seats)}
                    </p>
                  </div>
                )}
                {scanResult.checkedInAt && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Thời điểm soát vé:</span>
                    <p className="text-sm font-semibold">{formatTime(scanResult.checkedInAt)}</p>
                  </div>
                )}
                {scanResult.customerName && (
                  <div>
                    <span className="text-xs uppercase opacity-70">Khách hàng:</span>
                    <p className="text-sm font-semibold">{scanResult.customerName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lịch sử soát vé gần đây */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Lịch sử soát vé trong ca làm việc ({history.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 pr-4">Thời gian</th>
                  <th className="py-2.5 pr-4">Mã vé</th>
                  <th className="py-2.5 pr-4">Phim / Phòng</th>
                  <th className="py-2.5 pr-4">Ghế</th>
                  <th className="py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item, idx) => (
                  <tr key={`${item.bookingId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {formatTime(item.checkedInAt || new Date())}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs font-semibold">{item.bookingId}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-900 dark:text-white">{item.movieTitle || '—'}</div>
                      <div className="text-xs text-slate-500">{item.roomName}</div>
                    </td>
                    <td className="py-2.5 pr-4 font-bold text-rose-600 dark:text-rose-400">
                      {formatSeats(item.seats)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.type === 'success'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : item.type === 'duplicate'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}
                      >
                        {item.type === 'success'
                          ? 'Thành công'
                          : item.type === 'duplicate'
                          ? 'Trùng vé'
                          : item.type === 'cancelled'
                          ? 'Đã hủy'
                          : 'Lỗi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketScanner;
