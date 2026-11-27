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
const RewardPoint = require('../models/RewardPoint');
const { signToken } = require('../utils/token');

describe('Loyalty & Reward Points API (T18: Loyalty Points & Membership Tier)', () => {
  let server;
  let baseUrl;
  let memberToken;
  let memberUser;
  let testMovie;
  let testRoom;
  let testShowtime;

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
    memberUser = await User.create({
      fullName: 'Loyalty Tester',
      email: `loyalty-${ts}@test.local`,
      passwordHash: 'dummyhash',
      role: 'member',
      rewardPoints: 20000,
    });
    memberToken = signToken({ _id: memberUser._id, role: 'member' });

    testMovie = await Movie.create({
      title: `Loyalty Movie ${ts}`,
      description: 'Test loyalty points movie description',
      genres: ['Hành Động'],
      duration: 100,
      releaseDate: new Date(),
      status: 'now_showing',
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    testRoom = await Room.create({
      name: `Loyalty Room ${ts}`,
      rows: 5,
      seatsPerRow: 6,
    });

    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      standardPrice: 100000,
      vipPrice: 120000,
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: /loyalty-/ });
    if (testMovie) await Movie.deleteOne({ _id: testMovie._id });
    if (testRoom) await Room.deleteOne({ _id: testRoom._id });
    if (testShowtime) await Showtime.deleteOne({ _id: testShowtime._id });
    await Booking.deleteMany({ userId: memberUser._id });
    await Ticket.deleteMany({ bookingId: { $in: await Booking.find({ userId: memberUser._id }).distinct('_id') } });
    await RewardPoint.deleteMany({ userId: memberUser._id });
    await mongoose.disconnect();
  });

  it('GET /api/loyalty/me trả về thông tin điểm, hạng thành viên và lịch sử biến động điểm', async () => {
    const res = await fetch(`${baseUrl}/api/loyalty/me`, {
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.points, 20000);
    assert.ok(body.data.tier);
    assert.ok(Array.isArray(body.data.history));
  });

  it('từ chối thanh toán bằng điểm khi số điểm sử dụng vượt quá số dư tài khoản (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id.toString(),
        seats: [{ row: 'B', number: 1 }],
        pointsToUse: 50000, // Số dư hiện tại là 20.000
      }),
    });
    assert.equal(res.status, 400);
  });

  it('dùng điểm thanh toán thì trừ điểm chính xác trên server và giảm tổng tiền đơn vé', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id.toString(),
        seats: [{ row: 'B', number: 1 }],
        pointsToUse: 10000,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    // Giá vé gốc 100.000 - 10.000 dùng điểm = 90.000
    assert.equal(body.data.booking.totalPrice, 90000);
    assert.equal(body.data.booking.pointsUsed, 10000);

    // Kiểm tra lịch sử điểm và số dư trong DB
    const userInDb = await User.findById(memberUser._id);
    // Số dư cũ 20.000 - 10.000 (dùng điểm) + 5% của 90.000 (4.500) = 14.500
    assert.equal(userInDb.rewardPoints, 14500);

    // Kiểm tra RewardPoint log
    const logs = await RewardPoint.find({ userId: memberUser._id }).sort({ createdAt: -1 });
    assert.ok(logs.some((l) => l.type === 'redeem' && l.points === -10000));
    assert.ok(logs.some((l) => l.type === 'earn' && l.points === 4500));
  });

  it('đặt vé thành công được cộng 5% điểm tự động vào tài khoản', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id.toString(),
        seats: [{ row: 'B', number: 2 }],
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    // Giá vé 100.000 -> Tích 5% = 5.000
    assert.equal(body.data.booking.pointsEarned, 5000);

    const userInDb = await User.findById(memberUser._id);
    // 14.500 + 5.000 = 19.500
    assert.equal(userInDb.rewardPoints, 19500);

    const latestEarn = await RewardPoint.findOne({
      userId: memberUser._id,
      bookingId: body.data.booking._id,
      type: 'earn',
    });
    assert.ok(latestEarn);
    assert.equal(latestEarn.points, 5000);
  });
});
