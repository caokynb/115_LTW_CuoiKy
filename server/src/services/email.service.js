const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Lưu trữ danh sách email đã gửi trong bộ nhớ để phục vụ kiểm thử (unit tests / verification)
const sentEmails = [];

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  // 1. Nếu có cấu hình SMTP thật trong .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // 2. Mặc định dùng JSON Transport để kiểm thử nhanh, an toàn và không phụ thuộc mạng bên ngoài
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Định dạng thời gian suất chiếu
 */
const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Định dạng danh sách ghế
 */
const formatSeats = (tickets) => {
  if (!Array.isArray(tickets) || tickets.length === 0) return '—';
  return tickets
    .map((t) => t.label || (t.row && t.number ? `${t.row}${t.number}` : ''))
    .filter(Boolean)
    .join(', ');
};

/**
 * Gửi email xác nhận vé điện tử kèm mã QR
 * @param {Object} booking Đơn đặt vé đã populate showtimeId và tickets
 * @param {Object} user Người dùng đặt vé
 * @returns {Promise<Object>} Kết quả gửi email
 */
const sendBookingConfirmationEmail = async (booking, user) => {
  if (!booking || !user || !user.email) {
    return { success: false, message: 'Thiếu thông tin đơn đặt vé hoặc email người nhận' };
  }

  try {
    const templatePath = path.join(__dirname, '../templates/ticketEmail.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    const showtime = booking.showtimeId || {};
    const movie = showtime.movieId || {};
    const room = showtime.roomId || {};
    const cinema = room.cinemaId || {};

    const bookingId = String(booking._id || booking.id || '');
    const customerName = user.fullName || user.email.split('@')[0];
    const movieTitle = movie.title || 'Phim chiếu rạp CineHub';
    const roomName = room.name || 'Phòng chiếu tiêu chuẩn';
    const cinemaName = cinema.name || 'CineHub Cinema';
    const startTimeStr = formatDateTime(showtime.startTime);
    const seatsStr = formatSeats(booking.tickets);
    const totalPriceStr = `${Number(booking.totalPrice || 0).toLocaleString('vi-VN')} đ`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingId)}`;

    // Thay thế các biến trong template HTML (đã escape HTML chống XSS/HTML injection)
    htmlContent = htmlContent
      .replace(/{{bookingId}}/g, escapeHtml(bookingId))
      .replace(/{{customerName}}/g, escapeHtml(customerName))
      .replace(/{{movieTitle}}/g, escapeHtml(movieTitle))
      .replace(/{{roomName}}/g, escapeHtml(roomName))
      .replace(/{{cinemaName}}/g, escapeHtml(cinemaName))
      .replace(/{{startTime}}/g, escapeHtml(startTimeStr))
      .replace(/{{seats}}/g, escapeHtml(seatsStr))
      .replace(/{{totalPrice}}/g, escapeHtml(totalPriceStr))
      .replace(/{{qrCodeUrl}}/g, escapeHtml(qrCodeUrl));

    const transport = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"CineHub Cinema" <no-reply@cinehub.vn>',
      to: user.email,
      subject: `[CineHub] Xác nhận đặt vé thành công #${bookingId} - ${movieTitle}`,
      html: htmlContent,
    };

    const info = await transport.sendMail(mailOptions);

    const record = {
      bookingId,
      to: user.email,
      subject: mailOptions.subject,
      sentAt: new Date(),
      messageId: info.messageId,
      html: htmlContent,
    };
    sentEmails.push(record);

    return {
      success: true,
      messageId: info.messageId,
      email: user.email,
    };
  } catch (error) {
    console.error('[EmailService] Lỗi khi gửi email xác nhận vé:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const getSentEmails = () => sentEmails;
const clearSentEmails = () => {
  sentEmails.length = 0;
};

module.exports = {
  sendBookingConfirmationEmail,
  getSentEmails,
  clearSentEmails,
};
