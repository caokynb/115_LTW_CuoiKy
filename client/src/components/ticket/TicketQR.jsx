import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const extractBookingInfo = (booking) => {
  if (!booking) {
    return {
      bookingId: '',
      movieTitle: '—',
      roomName: '—',
      startTime: null,
      seatLabels: [],
      totalPrice: null,
      status: '',
    };
  }

  const bookingId = booking._id || booking.id || '';
  const showtime = booking.showtime || booking.showtimeId || {};
  const movie = showtime.movie || showtime.movieId || {};
  const room = showtime.room || showtime.roomId || {};

  const rawSeats = Array.isArray(booking.seats)
    ? booking.seats
    : Array.isArray(booking.tickets)
    ? booking.tickets
    : [];

  const seatLabels = rawSeats
    .map((s) => s?.label || (s?.row && s?.number ? `${s.row}${s.number}` : ''))
    .filter(Boolean);

  return {
    bookingId,
    movieTitle: movie.title || '—',
    roomName: room.name || '—',
    startTime: showtime.startTime || null,
    seatLabels,
    totalPrice: booking.totalPrice,
    status: booking.status || '',
  };
};

const formatStartTime = (startTime) => {
  if (!startTime) return '—';
  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TicketQR({ booking, size = 148 }) {
  const ticketRef = useRef(null);
  const info = extractBookingInfo(booking);

  if (!info.bookingId) return null;

  const qrValue = String(info.bookingId);

  const handleDownloadQr = () => {
    const canvas = ticketRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${qrValue}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintTicket = () => {
    const printableHtml = ticketRef.current?.innerHTML;
    if (!printableHtml) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=640,height=760');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Vé xem phim - ${qrValue}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #0f172a;
            }
            .ticket-print-card {
              max-width: 480px;
              margin: 0 auto;
              border: 1px dashed #334155;
              border-radius: 12px;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="ticket-print-card">${printableHtml}</div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div ref={ticketRef} className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Vé điện tử / Bản in vé
          </p>
          <p>
            Mã booking: <strong>{qrValue}</strong>
          </p>
          <p>
            Phim: <strong>{info.movieTitle}</strong>
          </p>
          <p>
            Phòng: <strong>{info.roomName}</strong>
          </p>
          <p>
            Suất chiếu: <strong>{formatStartTime(info.startTime)}</strong>
          </p>
          <p>
            Ghế: <strong>{info.seatLabels.length ? info.seatLabels.join(', ') : '—'}</strong>
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <QRCodeCanvas value={qrValue} size={size} level="M" includeMargin />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Mã: {qrValue}
          </span>
        </div>
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={handleDownloadQr}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Tải vé (QR)
        </button>
        <button
          type="button"
          onClick={handlePrintTicket}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          In vé
        </button>
      </div>
    </div>
  );
}