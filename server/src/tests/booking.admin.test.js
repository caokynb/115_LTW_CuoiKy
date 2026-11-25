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
const { signToken } = require('../utils/token');

describe('Admin Bookings API (GET /api/bookings)', () => {
  let server;
  let baseUrl;
  let memberUser;
  let adminUser;
  let memberToken;
  let adminToken;
  let testRoom;
  let testMovie;
  let testShowtime;
  const createdBookingIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await Ticket.init();

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    memberUser = await User.create({
      fullName: 'Admin Booking Member',
      email: `ab_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    adminUser = await User.create({
      fullName: 'Admin Booking Admin',
      email: `ab_admin_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });

    memberToken = signToken(memberUser);
    adminToken = signToken(adminUser);

    testRoom = await Room.create({
      name: `Room AB ${suffix}`,
      rows: 6,
      seatsPerRow: 8,
      vipRows: [5],
    });

    testMovie = await Movie.create({
      title: `Movie AB ${suffix}`,
      description: 'Test admin bookings',
      genres: ['Hành Động'],
      duration: 110,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 110 * 60 * 1000);
    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime,
      endTime,
      standardPrice: 80000,
      vipPrice: 110000,
    });

    const b1 = await Booking.create({
      userId: memberUser._id,
      showtimeId: testShowtime._id,
      totalPrice: 80000,
      status: 'confirmed',
    });
    const b2 = await Booking.create({
      userId: memberUser._id,
      showtimeId: testShowtime._id,
      totalPrice: 160000,
      status: 'cancelled',
    });
    createdBookingIds.push(b1._id, b2._id);

    await Ticket.create({
      bookingId: b1._id,
      showtimeId: testShowtime._id,
      row: 'A',
      number: 1,
      seatType: 'standard',
      price: 80000,
      status: 'active',
    });
  });

  after(async () => {
    if (createdBookingIds.length > 0) {
      await Ticket.deleteMany({ bookingId: { $in: createdBookingIds } });
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (testShowtime) await Showtime.findByIdAndDelete(testShowtime._id);
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (memberUser) await User.findByIdAndDelete(memberUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('chặn member truy cập GET /api/bookings với mã 403', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('admin lọc theo status và phân trang server thành công', async () => {
    const res = await fetch(
      `${baseUrl}/api/bookings?status=confirmed&page=1&limit=5&sort=-totalPrice`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pages >= 1);
    assert.ok(body.data.every((item) => item.status === 'confirmed'));
  });
});
