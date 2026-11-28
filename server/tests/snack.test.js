const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // bỏ qua nếu môi trường không cho phép đổi DNS
}

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Room = require('../src/models/Room');
const Showtime = require('../src/models/Showtime');
const Snack = require('../src/models/Snack');
const Booking = require('../src/models/Booking');
const Ticket = require('../src/models/Ticket');
const { signToken } = require('../src/utils/token');

describe('Snack & F&B Combo API (A16)', () => {
  let server;
  let baseUrl;
  let adminUser;
  let memberUser;
  let adminToken;
  let memberToken;
  let testRoom;
  let testMovie;
  let testShowtime;
  const createdSnackIds = [];
  const createdBookingIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await Ticket.init();

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    const suffix = Date.now();
    adminUser = await User.create({
      fullName: 'Snack Admin',
      email: `snack_admin_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });
    memberUser = await User.create({
      fullName: 'Snack Member',
      email: `snack_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    adminToken = signToken(adminUser);
    memberToken = signToken(memberUser);

    testRoom = await Room.create({
      name: `Phòng Snack ${suffix}`,
      rows: 6,
      seatsPerRow: 8,
      vipRows: [5],
    });
    testMovie = await Movie.create({
      title: `Phim Snack ${suffix}`,
      description: 'Phim kiểm thử combo bắp nước',
      genres: ['Hài hước'],
      duration: 110,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/snack-movie.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 110 * 60 * 1000);
    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: futureStart,
      endTime: futureEnd,
      standardPrice: 80000,
      vipPrice: 110000,
    });
  });

  after(async () => {
    if (createdBookingIds.length > 0) {
      await Ticket.deleteMany({ bookingId: { $in: createdBookingIds } });
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    if (createdSnackIds.length > 0) {
      await Snack.deleteMany({ _id: { $in: createdSnackIds } });
    }
    if (testShowtime) await Showtime.findByIdAndDelete(testShowtime._id);
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (memberUser) await User.findByIdAndDelete(memberUser._id);
    if (server) server.close();
    await mongoose.disconnect();
  });

  it('Admin CRUD combo bắp nước và chặn member trả về 403', async () => {
    const snackName = `Combo Test ${Date.now()}`;

    // member không được tạo combo
    const memberRes = await fetch(`${baseUrl}/api/snacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ name: snackName, price: 75000, category: 'combo' }),
    });
    assert.equal(memberRes.status, 403);

    // admin tạo combo thành công -> 201
    const createRes = await fetch(`${baseUrl}/api/snacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: snackName,
        description: 'Bắp lớn + 2 nước',
        price: 95000,
        category: 'combo',
      }),
    });
    const createdBody = await createRes.json();
    assert.equal(createRes.status, 201);
    const snackId = createdBody.data._id;
    createdSnackIds.push(snackId);

    // cập nhật giá bán -> 200
    const updateRes = await fetch(`${baseUrl}/api/snacks/${snackId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ price: 99000 }),
    });
    const updateBody = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateBody.data.price, 99000);

    // danh sách public chứa combo đang bán
    const listRes = await fetch(`${baseUrl}/api/snacks`);
    const listBody = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.ok(listBody.data.some((item) => item._id === snackId));
  });

  it('POST /api/bookings cộng dồn tiền combo từ server và từ chối combo ngừng bán', async () => {
    const activeSnack = await Snack.create({
      name: `Bắp Phô Mai ${Date.now()}`,
      price: 60000,
      category: 'popcorn',
      isAvailable: true,
    });
    const inactiveSnack = await Snack.create({
      name: `Combo Ngừng Bán ${Date.now()}`,
      price: 50000,
      category: 'combo',
      isAvailable: false,
    });
    createdSnackIds.push(activeSnack._id, inactiveSnack._id);

    // đặt kèm combo ngừng bán -> 400
    const badRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'A', number: 1 }],
        snacks: [{ snackId: inactiveSnack._id, quantity: 1 }],
      }),
    });
    assert.equal(badRes.status, 400);

    // đặt 1 ghế thường (80.000đ) + 2 bắp (2 * 60.000đ = 120.000đ) -> tổng 200.000đ
    const okRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'A', number: 2 }],
        snacks: [{ snackId: activeSnack._id, quantity: 2, price: 1 }], // cố tình gửi giá giả
      }),
    });
    const okBody = await okRes.json();
    assert.equal(okRes.status, 201);
    const booking = okBody.data.booking;
    createdBookingIds.push(booking._id);

    assert.equal(booking.snackTotal, 120000);
    assert.equal(booking.totalPrice, 190000);
    assert.equal(booking.snacks.length, 1);
    assert.equal(booking.snacks[0].quantity, 2);
  });
});
