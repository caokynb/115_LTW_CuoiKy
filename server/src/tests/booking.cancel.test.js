const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Bỏ qua nếu môi trường không cho phép setServers
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
const { signToken } = require('../utils/token');

describe('Booking Cancellation & History API (K11: PATCH /api/bookings/:id/cancel, GET /api/bookings/my)', () => {
  let server;
  let baseUrl;
  let user1Token;
  let user2Token;
  let user1;
  let user2;
  let testRoom;
  let testMovie;
  let showtimeIn3Hours; // > 2 tiếng (3 tiếng)
  let showtimeIn1Hour;  // < 2 tiếng (1 tiếng)

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await Ticket.init();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const uniqueSuffix = Date.now();

    user1 = await User.create({
      fullName: 'User One',
      email: `user1_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    user1Token = signToken(user1);

    user2 = await User.create({
      fullName: 'User Two',
      email: `user2_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    user2Token = signToken(user2);

    testRoom = await Room.create({
      name: `Phòng K11 Test ${uniqueSuffix}`,
      rows: 5,
      seatsPerRow: 6,
      vipRows: [3],
    });

    testMovie = await Movie.create({
      title: `Movie K11 Test ${uniqueSuffix}`,
      description: 'Phim kiểm thử tính năng hủy vé và nhả ghế K11',
      genres: ['Hài Kịch'],
      duration: 110,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    // Suất chiếu 3 tiếng nữa (> 2 tiếng -> cho phép hủy)
    const start3Hours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    showtimeIn3Hours = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: start3Hours,
      endTime: new Date(start3Hours.getTime() + 110 * 60 * 1000),
      standardPrice: 65000,
      vipPrice: 85000,
    });

    // Suất chiếu 1 tiếng nữa (< 2 tiếng -> KHÔNG cho phép hủy)
    const start1Hour = new Date(Date.now() + 1 * 60 * 60 * 1000);
    showtimeIn1Hour = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: start1Hour,
      endTime: new Date(start1Hour.getTime() + 110 * 60 * 1000),
      standardPrice: 65000,
      vipPrice: 85000,
    });
  });

  after(async () => {
    const showtimeIds = [showtimeIn3Hours?._id, showtimeIn1Hour?._id].filter(Boolean);
    if (showtimeIds.length > 0) {
      await Ticket.deleteMany({ showtimeId: { $in: showtimeIds } });
      await Booking.deleteMany({ showtimeId: { $in: showtimeIds } });
      await Showtime.deleteMany({ _id: { $in: showtimeIds } });
    }
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (user1) await User.findByIdAndDelete(user1._id);
    if (user2) await User.findByIdAndDelete(user2._id);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('Test 1: GET /api/bookings/my returns user bookings (HTTP 200)', async () => {
    // Tạo 1 đơn đặt vé cho user1
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn3Hours._id.toString(),
        seats: [{ row: 'A', number: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);

    // Gọi GET /api/bookings/my
    const res = await fetch(`${baseUrl}/api/bookings/my`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 1);
    assert.strictEqual(data.data[0].userId.toString(), user1._id.toString());
  });

  it('Test 2: Cancel booking 3 hours before showtime succeeds (HTTP 200) and releases seats', async () => {
    // Đặt ghế B1, B2 cho suất chiếu 3 tiếng nữa
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn3Hours._id.toString(),
        seats: [
          { row: 'B', number: 1 },
          { row: 'B', number: 2 },
        ],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    const bookingId = createData.data.booking._id;

    // Hủy vé: PATCH /api/bookings/:id/cancel
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200, `Expected 200 but got ${cancelRes.status}: ${JSON.stringify(cancelData)}`);
    assert.strictEqual(cancelData.success, true);
    assert.strictEqual(cancelData.message, 'Hủy vé thành công, ghế đã được giải phóng');
    assert.strictEqual(cancelData.data.status, 'cancelled');

    // Kiểm tra tickets trong DB đều chuyển sang cancelled
    const tickets = await Ticket.find({ bookingId });
    assert.strictEqual(tickets.length, 2);
    assert.ok(tickets.every((t) => t.status === 'cancelled'));

    // Xác nhận ghế đã được nhả: User2 có thể đặt lại ghế B1, B2 thành công (HTTP 201)
    const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn3Hours._id.toString(),
        seats: [
          { row: 'B', number: 1 },
          { row: 'B', number: 2 },
        ],
      }),
    });

    const rebookData = await rebookRes.json();
    assert.strictEqual(rebookRes.status, 201, `Expected 201 upon rebooking released seats: ${JSON.stringify(rebookData)}`);
    assert.strictEqual(rebookData.success, true);
  });

  it('Test 3: Cancel booking within 2 hours of showtime is rejected (HTTP 400 Bad Request)', async () => {
    // Đặt ghế C1 cho suất chiếu chỉ còn 1 tiếng nữa
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn1Hour._id.toString(),
        seats: [{ row: 'C', number: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    const bookingId = createData.data.booking._id;

    // Cố gắng hủy vé sát giờ (< 2 tiếng)
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 400, `Expected 400 but got ${cancelRes.status}`);
    assert.strictEqual(cancelData.success, false);
    assert.strictEqual(cancelData.message, 'Chỉ được phép hủy vé trước giờ chiếu ít nhất 2 tiếng');

    // Xác nhận vé vẫn ở trạng thái confirmed / active
    const booking = await Booking.findById(bookingId);
    assert.strictEqual(booking.status, 'confirmed');
    const ticket = await Ticket.findOne({ bookingId });
    assert.strictEqual(ticket.status, 'active');
  });

  it('Test 4: Cancelling another user\'s booking is forbidden (HTTP 403 Forbidden)', async () => {
    // User1 đặt vé D1 cho suất chiếu 3 tiếng nữa
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn3Hours._id.toString(),
        seats: [{ row: 'D', number: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    const bookingId = createData.data.booking._id;

    // User2 cố gắng hủy vé của User1
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });

    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 403, `Expected 403 but got ${cancelRes.status}`);
    assert.strictEqual(cancelData.success, false);
    assert.strictEqual(cancelData.message, 'Bạn không có quyền hủy đơn đặt vé này');
  });

  it('Test 5: Cancelling without authentication is rejected (HTTP 401 Unauthorized)', async () => {
    const cancelRes = await fetch(`${baseUrl}/api/bookings/${new mongoose.Types.ObjectId()}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(cancelRes.status, 401);
  });

  it('Test 6: Cancelling an already cancelled booking returns HTTP 400', async () => {
    // User1 đặt ghế E1
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        showtimeId: showtimeIn3Hours._id.toString(),
        seats: [{ row: 'E', number: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    const bookingId = createData.data.booking._id;

    // Hủy lần 1: thành công
    const cancel1 = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    assert.strictEqual(cancel1.status, 200);

    // Hủy lần 2: bị từ chối với HTTP 400
    const cancel2 = await fetch(`${baseUrl}/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    const cancel2Data = await cancel2.json();
    assert.strictEqual(cancel2.status, 400);
    assert.strictEqual(cancel2Data.success, false);
    assert.strictEqual(cancel2Data.message, 'Đơn đặt vé này đã được hủy trước đó');
  });
});
