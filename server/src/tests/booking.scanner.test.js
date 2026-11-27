const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

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
const { signToken } = require('../utils/token');

describe('Check-in Scanner API (T17: POST & PATCH /api/bookings/:id/check-in)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let memberToken;
  let testMovie;
  let testRoom;
  let testShowtime;
  let otherShowtime;
  let validBooking;
  let cancelledBooking;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await Ticket.init();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });

    const ts = Date.now();
    const adminUser = await User.create({
      fullName: 'Scanner Admin',
      email: `scanner-admin-${ts}@test.local`,
      passwordHash: 'dummyhash',
      role: 'admin',
    });
    adminToken = signToken({ _id: adminUser._id, role: 'admin' });

    const memberUser = await User.create({
      fullName: 'Scanner Member',
      email: `scanner-member-${ts}@test.local`,
      passwordHash: 'dummyhash',
      role: 'member',
    });
    memberToken = signToken({ _id: memberUser._id, role: 'member' });

    testMovie = await Movie.create({
      title: `Scanner Movie ${ts}`,
      description: 'Test check-in scanner movie description',
      genres: ['Hành Động'],
      duration: 120,
      releaseDate: new Date(),
      status: 'now_showing',
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    testRoom = await Room.create({
      name: `Scanner Room ${ts}`,
      rows: 5,
      seatsPerRow: 6,
    });

    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      standardPrice: 80000,
      vipPrice: 100000,
    });

    otherShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: new Date(Date.now() + 10800000),
      endTime: new Date(Date.now() + 14400000),
      standardPrice: 80000,
      vipPrice: 100000,
    });

    validBooking = await Booking.create({
      userId: memberUser._id,
      showtimeId: testShowtime._id,
      totalPrice: 80000,
      status: 'confirmed',
    });
    await Ticket.create({
      bookingId: validBooking._id,
      showtimeId: testShowtime._id,
      row: 'A',
      number: 1,
      price: 80000,
      status: 'active',
    });

    cancelledBooking = await Booking.create({
      userId: memberUser._id,
      showtimeId: testShowtime._id,
      totalPrice: 80000,
      status: 'cancelled',
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: /scanner-/ });
    if (testMovie) await Movie.deleteOne({ _id: testMovie._id });
    if (testRoom) await Room.deleteOne({ _id: testRoom._id });
    if (testShowtime) await Showtime.deleteOne({ _id: testShowtime._id });
    if (otherShowtime) await Showtime.deleteOne({ _id: otherShowtime._id });
    if (validBooking) await Booking.deleteOne({ _id: validBooking._id });
    if (cancelledBooking) await Booking.deleteOne({ _id: cancelledBooking._id });
    await Ticket.deleteMany({ row: 'A', number: 1 });
    await mongoose.disconnect();
  });

  it('chặn member gọi API soát vé với mã 403', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${validBooking._id}/check-in`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(res.status, 403);
  });

  it('từ chối mã vé không đúng định dạng với mã 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'invalid-id-xyz' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_QR_FORMAT');
  });

  it('báo lỗi đỏ khi quét vé đã hủy (TICKET_CANCELLED)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: cancelledBooking._id.toString() }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'TICKET_CANCELLED');
  });

  it('báo lỗi khi vé sai suất chiếu (WRONG_SHOWTIME)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: validBooking._id.toString(),
        showtimeId: otherShowtime._id.toString(),
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'WRONG_SHOWTIME');
  });

  it('quét mã QR hợp lệ báo thành công 200 và chuyển trạng thái vé sang checked-in', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${validBooking._id}/check-in`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'checked-in');
    assert.ok(body.data.checkedInAt);

    // Kiểm tra trực tiếp trong DB
    const updated = await Booking.findById(validBooking._id);
    assert.equal(updated.status, 'checked-in');
  });

  it('quét lại vé cũ báo trùng với mã 409 (ALREADY_CHECKED_IN)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/check-in`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: validBooking._id.toString() }),
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.code, 'ALREADY_CHECKED_IN');
  });
});
