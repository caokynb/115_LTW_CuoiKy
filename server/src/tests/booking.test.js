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

describe('Booking API Endpoints (POST /api/bookings)', () => {
  let server;
  let baseUrl;
  let authToken;
  let adminToken;
  let testUser;
  let testAdmin;
  let testRoom;
  let testMovie;
  let futureShowtime;
  let pastShowtime;

  before(async () => {
    // 1. Kết nối MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Đảm bảo partial unique index trên Ticket đã được tạo
    await Ticket.init();

    // 2. Khởi chạy HTTP server trên cổng ngẫu nhiên (ephemeral port)
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // 3. Tạo dữ liệu mẫu cô lập cho kiểm thử
    const uniqueSuffix = Date.now();

    testUser = await User.create({
      fullName: 'Test Member',
      email: `test_member_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });

    authToken = signToken(testUser);

    testAdmin = await User.create({
      fullName: 'Test Admin',
      email: `test_admin_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });

    adminToken = signToken(testAdmin);

    testRoom = await Room.create({
      name: `Phòng Test M4 ${uniqueSuffix}`,
      rows: 8,
      seatsPerRow: 10,
      vipRows: [5, 6], // Hàng 5 (E) và hàng 6 (F) là hàng ghế VIP
    });

    testMovie = await Movie.create({
      title: `Test Movie M4 ${uniqueSuffix}`,
      description: 'Phim kiểm thử tính năng đặt vé Milestone M4',
      genres: ['Hành Động'],
      duration: 120,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    // Suất chiếu trong tương lai (ngày mai)
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 120 * 60 * 1000);
    futureShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: futureStart,
      endTime: futureEnd,
      standardPrice: 70000,
      vipPrice: 90000,
    });

    // Suất chiếu trong quá khứ (hôm qua)
    const pastStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pastEnd = new Date(pastStart.getTime() + 120 * 60 * 1000);
    pastShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: pastStart,
      endTime: pastEnd,
      standardPrice: 70000,
      vipPrice: 90000,
    });
  });

  after(async () => {
    // Dọn dẹp dữ liệu kiểm thử
    if (futureShowtime && pastShowtime) {
      await Ticket.deleteMany({
        showtimeId: { $in: [futureShowtime._id, pastShowtime._id] },
      });
      await Booking.deleteMany({
        showtimeId: { $in: [futureShowtime._id, pastShowtime._id] },
      });
      await Showtime.deleteMany({
        _id: { $in: [futureShowtime._id, pastShowtime._id] },
      });
    }
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    if (testAdmin) await User.findByIdAndDelete(testAdmin._id);

    // Đóng HTTP server và kết nối MongoDB
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('Test 1: Successful booking creation (HTTP 201) and authoritative server price calculation (client price ignored)', async () => {
    // 2 ghế standard (A1, A2: hàng 1) + 1 ghế VIP (E1: hàng 5)
    // Giá chuẩn do server tính: (2 * 70000) + (1 * 90000) = 230000 VND
    // Gửi kèm giá giả mạo từ client: totalPrice = 9999, price = 1 -> Server bắt buộc phải bỏ qua
    const payload = {
      showtimeId: futureShowtime._id.toString(),
      seats: [
        { row: 'A', number: 1, price: 1 },
        { row: 'A', number: 2, price: 1 },
        { row: 'E', number: 1, price: 1 },
      ],
      totalPrice: 9999,
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 201, `Expected status 201 but got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'Đặt vé thành công');
    assert.ok(data.data && data.data.booking);
    assert.ok(data.data.tickets && data.data.tickets.length === 3);

    // Xác thực giá do Server tính authoritative
    assert.strictEqual(data.data.booking.totalPrice, 218500, 'Server applies the silver member discount to the authoritative price');
    assert.strictEqual(data.data.booking.status, 'confirmed');

    // Xác thực chi tiết từng vé
    const ticketA1 = data.data.tickets.find((t) => t.row === 'A' && t.number === 1);
    const ticketA2 = data.data.tickets.find((t) => t.row === 'A' && t.number === 2);
    const ticketE1 = data.data.tickets.find((t) => t.row === 'E' && t.number === 1);

    assert.ok(ticketA1 && ticketA1.seatType === 'standard' && ticketA1.price === 70000);
    assert.ok(ticketA2 && ticketA2.seatType === 'standard' && ticketA2.price === 70000);
    assert.ok(ticketE1 && ticketE1.seatType === 'vip' && ticketE1.price === 90000);
  });

  it('Test 2: Rejection of booking when showtime is in the past (HTTP 400)', async () => {
    const payload = {
      showtimeId: pastShowtime._id.toString(),
      seats: [{ row: 'B', number: 1 }],
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 400, `Expected status 400 but got ${res.status}`);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Suất chiếu đã bắt đầu hoặc dữ liệu không hợp lệ');
  });

  it('Test 3: Rejection of booking with duplicate seat collision (HTTP 409 with conflictingSeats)', async () => {
    // Bước 1: Đặt ghế B5 thành công
    const initialBookingRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [{ row: 'B', number: 5 }],
      }),
    });
    assert.strictEqual(initialBookingRes.status, 201);

    // Bước 2: Đặt lại ghế B5 (kèm ghế B6 mới) -> Bắt buộc bị từ chối với HTTP 409
    const collisionRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'B', number: 5 },
          { row: 'B', number: 6 },
        ],
      }),
    });

    const collisionData = await collisionRes.json();

    assert.strictEqual(collisionRes.status, 409, `Expected 409 but got ${collisionRes.status}`);
    assert.strictEqual(collisionData.success, false);
    assert.strictEqual(collisionData.message, 'Ghế đã được đặt');
    assert.ok(Array.isArray(collisionData.conflictingSeats), 'conflictingSeats must be an array');
    assert.ok(
      collisionData.conflictingSeats.some((s) => s.row === 'B' && s.number === 5),
      'conflictingSeats must identify seat B5 as conflicting'
    );

    // Bước 3: Kiểm thử tranh chấp đồng thời (concurrent race condition)
    // Gửi 2 request đồng thời cùng đặt ghế C7
    const [resA, resB] = await Promise.all([
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          showtimeId: futureShowtime._id.toString(),
          seats: [{ row: 'C', number: 7 }],
        }),
      }),
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          showtimeId: futureShowtime._id.toString(),
          seats: [{ row: 'C', number: 7 }],
        }),
      }),
    ]);

    const statuses = [resA.status, resB.status];
    assert.ok(statuses.includes(201), 'One concurrent request must succeed with 201');
    assert.ok(statuses.includes(409), 'One concurrent request must fail with 409 conflict');

    const failedRes = resA.status === 409 ? resA : resB;
    const failedData = await failedRes.json();
    assert.strictEqual(failedData.message, 'Ghế đã được đặt');
    assert.ok(
      failedData.conflictingSeats.some((s) => s.row === 'C' && s.number === 7)
    );

    // Bước 4: Kiểm thử tranh chấp đồng thời đa ghế (multi-seat concurrent collision)
    const [resMultiA, resMultiB] = await Promise.all([
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          showtimeId: futureShowtime._id.toString(),
          seats: [
            { row: 'A', number: 7 },
            { row: 'A', number: 8 },
          ],
        }),
      }),
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          showtimeId: futureShowtime._id.toString(),
          seats: [{ row: 'A', number: 8 }],
        }),
      }),
    ]);

    const multiStatuses = [resMultiA.status, resMultiB.status];
    assert.ok(multiStatuses.includes(201), 'One multi request must succeed with 201');
    assert.ok(multiStatuses.includes(409), 'One multi request must fail with 409 conflict');

    if (resMultiA.status === 409) {
      const orphanSeatA7 = await Ticket.findOne({
        showtimeId: futureShowtime._id,
        row: 'A',
        number: 7,
        status: 'active',
      });
      assert.strictEqual(
        orphanSeatA7,
        null,
        'Preceding seat A7 must not be left orphaned when multi-seat booking fails'
      );
    }
  });

  it('Test 4: Rejection of unauthenticated requests (HTTP 401)', async () => {
    const payload = {
      showtimeId: futureShowtime._id.toString(),
      seats: [{ row: 'D', number: 1 }],
    };

    // Gửi request không có Authorization header
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 401, `Expected status 401 but got ${res.status}`);
    assert.strictEqual(data.success, false);
  });

  it('Test 5: Rejection of invalid inputs (empty seats, >8 seats, invalid showtimeId, duplicate seats) (HTTP 400)', async () => {
    // 5a. Mảng ghế rỗng
    const resEmpty = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [],
      }),
    });
    assert.strictEqual(resEmpty.status, 400, 'Empty seats must return 400');

    // 5b. Vượt quá giới hạn 8 ghế (9 ghế)
    const resTooMany = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'D', number: 1 },
          { row: 'D', number: 2 },
          { row: 'D', number: 3 },
          { row: 'D', number: 4 },
          { row: 'D', number: 5 },
          { row: 'D', number: 6 },
          { row: 'D', number: 7 },
          { row: 'D', number: 8 },
          { row: 'D', number: 9 },
        ],
      }),
    });
    assert.strictEqual(resTooMany.status, 400, '>8 seats must return 400');

    // 5c. ID suất chiếu không hợp lệ
    const resInvalidId = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: 'invalid-object-id',
        seats: [{ row: 'D', number: 1 }],
      }),
    });
    assert.strictEqual(resInvalidId.status, 400, 'Invalid showtimeId must return 400');

    // 5d. Ghế bị trùng trong request payload
    const resDuplicateInPayload = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'D', number: 2 },
          { row: 'D', number: 2 },
        ],
      }),
    });
    assert.strictEqual(resDuplicateInPayload.status, 400, 'Duplicate seats in body must return 400');

    // 5e. Ghế ngoài phạm vi phòng chiếu
    const resOutOfBounds = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [{ row: 'Z', number: 99 }],
      }),
    });
    assert.strictEqual(resOutOfBounds.status, 400, 'Out of bounds seat must return 400');
  });

  it('Test 6: Multi-seat collision write-time rollback cleans up partially inserted tickets (no orphaned tickets in DB)', async () => {
    let failedBookingId = null;
    let otherBookingId = null;
    const originalBookingCreate = Booking.create;

    let triggerCollision = true;
    Booking.create = async function (...args) {
      const result = await originalBookingCreate.apply(this, args);
      if (triggerCollision) {
        triggerCollision = false;
        failedBookingId = result._id;

        // Giả lập va chạm ghi đồng thời: tạo trước ghế F1 ngay sau khi Tier 1 check vừa hoàn thành
        const otherBooking = await originalBookingCreate.apply(Booking, [
          {
            userId: testUser._id,
            showtimeId: futureShowtime._id,
            totalPrice: 90000,
            status: 'confirmed',
          },
        ]);
        otherBookingId = otherBooking._id;

        await Ticket.create({
          bookingId: otherBooking._id,
          showtimeId: futureShowtime._id,
          row: 'F',
          number: 2,
          seatType: 'vip',
          price: 90000,
          status: 'active',
        });
      }
      return result;
    };

    try {
      // Đặt 2 ghế: F1 (chưa ai đặt) và F2 (sẽ va chạm E11000 khi insertMany ghi vé F2)
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          showtimeId: futureShowtime._id.toString(),
          seats: [
            { row: 'F', number: 1 },
            { row: 'F', number: 2 },
          ],
        }),
      });

      const data = await res.json();

      assert.strictEqual(res.status, 409, `Expected 409 but got ${res.status}`);
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Ghế đã được đặt');
      assert.ok(
        data.conflictingSeats.some((s) => s.row === 'F' && s.number === 2),
        'conflictingSeats must identify F2 as conflicting'
      );

      // Xác minh failedBookingId đã được ghi nhận và đơn đặt vé đã bị xóa
      assert.ok(failedBookingId, 'failedBookingId must have been captured');
      const failedBookingInDb = await Booking.findById(failedBookingId);
      assert.strictEqual(failedBookingInDb, null, 'Failed booking must be deleted from DB');

      // Xác minh Ticket.countDocuments({ bookingId: failedBookingId }) là 0
      const failedBookingTicketsCount = await Ticket.countDocuments({
        bookingId: failedBookingId,
      });
      assert.strictEqual(
        failedBookingTicketsCount,
        0,
        'Ticket.countDocuments({ bookingId: failedBookingId }) must be 0'
      );

      // Xác minh ghế đứng trước (F1) không bị lưu dạng orphan active ticket trong DB
      const orphanSeatF1 = await Ticket.findOne({
        showtimeId: futureShowtime._id,
        row: 'F',
        number: 1,
        status: 'active',
      });
      assert.strictEqual(
        orphanSeatF1,
        null,
        'Preceding non-colliding seat F1 must NOT be left as orphaned active ticket in DB'
      );
    } finally {
      Booking.create = originalBookingCreate;

      if (otherBookingId) {
        await Ticket.deleteMany({ bookingId: otherBookingId });
        await Booking.findByIdAndDelete(otherBookingId);
      }
      await Ticket.deleteMany({
        showtimeId: futureShowtime._id,
        row: 'F',
        number: { $in: [1, 2] },
      });
    }
  });

  it('Test 7: Rejection of booking creation when user role is admin (HTTP 403 Forbidden)', async () => {
    const payload = {
      showtimeId: futureShowtime._id.toString(),
      seats: [{ row: 'A', number: 5 }],
    };

    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 403, `Expected status 403 but got ${res.status}`);
    assert.strictEqual(data.success, false);
    assert.strictEqual(
      data.message,
      'Tài khoản Quản trị viên chỉ dùng để quản lý hệ thống, không được phép đặt vé xem phim'
    );
  });
});
