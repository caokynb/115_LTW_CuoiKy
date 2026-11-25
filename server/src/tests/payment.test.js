const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if DNS override is not permitted
}

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Room = require('../models/Room');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const { signToken } = require('../utils/token');

describe('VietQR Payment Gateway API (K16)', () => {
  let server;
  let baseUrl;
  let memberUser;
  let memberToken;
  let testRoom;
  let testMovie;
  let testShowtime;
  const createdBookingIds = [];
  const createdPaymentIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await Ticket.init();
    await Payment.init();

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    memberUser = await User.create({
      fullName: 'Payment Test Member',
      email: `pay_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    memberToken = signToken(memberUser);

    testRoom = await Room.create({
      name: `Room Pay ${suffix}`,
      rows: 6,
      seatsPerRow: 8,
      vipRows: [5],
    });

    testMovie = await Movie.create({
      title: `Movie Pay ${suffix}`,
      description: 'Test VietQR payment',
      genres: ['Hành Động'],
      duration: 120,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);
    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime,
      endTime,
      standardPrice: 80000,
      vipPrice: 110000,
    });
  });

  after(async () => {
    if (createdPaymentIds.length > 0) {
      await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
    }
    if (createdBookingIds.length > 0) {
      await Ticket.deleteMany({ bookingId: { $in: createdBookingIds } });
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (testShowtime) await Showtime.findByIdAndDelete(testShowtime._id);
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (memberUser) await User.findByIdAndDelete(memberUser._id);
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('tạo phiên thanh toán VietQR pending 10 phút và xác nhận qua webhook thành confirmed', async () => {
    const createRes = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'A', number: 1 }],
      }),
    });
    const createBody = await createRes.json();

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createBody.success, true);
    const { payment, booking } = createBody.data;
    createdPaymentIds.push(payment._id);
    createdBookingIds.push(booking._id);

    assert.strictEqual(payment.status, 'pending');
    assert.strictEqual(booking.status, 'pending');
    assert.strictEqual(payment.amount, 80000);
    assert.ok(payment.qrUrl.includes('img.vietqr.io'));

    const webhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderCode: payment.orderCode,
        status: 'paid',
        transactionRef: 'BANK_TX_001',
      }),
    });
    const webhookBody = await webhookRes.json();

    assert.strictEqual(webhookRes.status, 200);
    assert.strictEqual(webhookBody.data.payment.status, 'paid');
    assert.strictEqual(webhookBody.data.booking.status, 'confirmed');
  });

  it('tự động hủy đơn quá 10 phút chưa thanh toán và giải phóng ghế để người khác đặt lại', async () => {
    const createRes = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'B', number: 2 }],
      }),
    });
    const createBody = await createRes.json();
    assert.strictEqual(createRes.status, 201);

    const { payment, booking } = createBody.data;
    createdPaymentIds.push(payment._id);
    createdBookingIds.push(booking._id);

    // Giả lập phiên thanh toán đã quá hạn 10 phút
    await Payment.findByIdAndUpdate(payment._id, {
      $set: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const statusRes = await fetch(`${baseUrl}/api/payments/${payment._id}`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const statusBody = await statusRes.json();
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusBody.data.payment.status, 'expired');
    assert.strictEqual(statusBody.data.booking.status, 'cancelled');

    // Ghế B2 đã được giải phóng nên có thể tạo đơn mới
    const retryRes = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'B', number: 2 }],
      }),
    });
    const retryBody = await retryRes.json();
    assert.strictEqual(retryRes.status, 201);
    createdPaymentIds.push(retryBody.data.payment._id);
    createdBookingIds.push(retryBody.data.booking._id);
  });
});
