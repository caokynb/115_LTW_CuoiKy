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
const Coupon = require('../src/models/Coupon');
const Booking = require('../src/models/Booking');
const Ticket = require('../src/models/Ticket');
const { signToken } = require('../src/utils/token');

describe('Coupon API & Server Discount Calculation (A12)', () => {
  let server;
  let baseUrl;
  let memberUser;
  let memberToken;
  let adminUser;
  let adminToken;
  let testMovie;
  let testRoom;
  let testShowtime;
  let validCoupon;
  let expiredCoupon;
  let exhaustedCoupon;
  const createdBookingIds = [];
  const createdCouponIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await Ticket.init();

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    const suffix = Date.now();
    memberUser = await User.create({
      fullName: 'Coupon Test Member',
      email: `coupon_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });
    memberToken = signToken(memberUser);

    adminUser = await User.create({
      fullName: 'Coupon Test Admin',
      email: `coupon_admin_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });
    adminToken = signToken(adminUser);

    testRoom = await Room.create({
      name: `Phòng Coupon ${suffix}`,
      rows: 6,
      seatsPerRow: 8,
      vipRows: [5],
    });

    testMovie = await Movie.create({
      title: `Phim Coupon ${suffix}`,
      description: 'Phim kiểm thử mã giảm giá',
      genres: ['Hành động'],
      duration: 120,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/coupon-movie.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 120 * 60 * 1000);
    testShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime: futureStart,
      endTime: futureEnd,
      standardPrice: 100000,
      vipPrice: 150000,
    });

    validCoupon = await Coupon.create({
      code: `TEST10_${suffix}`,
      description: 'Giảm 10%',
      discountType: 'percent',
      discountValue: 10,
      maxDiscount: 50000,
      minOrderAmount: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 5,
      usedCount: 0,
      isActive: true,
    });

    expiredCoupon = await Coupon.create({
      code: `EXPIRED_${suffix}`,
      description: 'Mã hết hạn',
      discountType: 'fixed',
      discountValue: 20000,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      maxUses: 5,
      usedCount: 0,
      isActive: true,
    });

    exhaustedCoupon = await Coupon.create({
      code: `EMPTY_${suffix}`,
      description: 'Mã hết lượt',
      discountType: 'fixed',
      discountValue: 20000,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 1,
      usedCount: 1,
      isActive: true,
    });
  });

  after(async () => {
    if (createdBookingIds.length > 0) {
      await Ticket.deleteMany({ bookingId: { $in: createdBookingIds } });
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    await Coupon.deleteMany({
      _id: {
        $in: [validCoupon?._id, expiredCoupon?._id, exhaustedCoupon?._id, ...createdCouponIds].filter(Boolean),
      },
    });
    if (testShowtime) await Showtime.findByIdAndDelete(testShowtime._id);
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (memberUser) await User.findByIdAndDelete(memberUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (server) server.close();
    await mongoose.disconnect();
  });

  it('POST /api/coupons/validate tính đúng tiền giảm cho mã hợp lệ', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validCoupon.code.toLowerCase(), orderAmount: 200000 }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.discountAmount, 20000);
    assert.equal(body.data.finalAmount, 180000);
  });

  it('POST /api/coupons/validate từ chối mã hết hạn, hết lượt hoặc không tồn tại', async () => {
    const expiredRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: expiredCoupon.code, orderAmount: 100000 }),
    });
    assert.equal(expiredRes.status, 400);

    const exhaustedRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: exhaustedCoupon.code, orderAmount: 100000 }),
    });
    assert.equal(exhaustedRes.status, 400);

    const unknownRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'KHONG_TON_TAI', orderAmount: 100000 }),
    });
    assert.equal(unknownRes.status, 404);
  });

  it('POST /api/bookings tự tính lại tổng tiền sau giảm trên server và tăng usedCount', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtime._id,
        seats: [{ row: 'A', number: 1 }],
        couponCode: validCoupon.code,
        totalPrice: 1, // cố tình gửi giá giả từ client
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    const booking = body.data.booking;
    createdBookingIds.push(booking._id);

    // 1 ghế thường 100.000đ giảm 10% -> còn 90.000đ do server tự tính
    assert.equal(booking.originalPrice, 100000);
    assert.equal(booking.discountAmount, 10000);
    assert.equal(booking.totalPrice, 90000);
    assert.equal(booking.couponCode, validCoupon.code);

    const updatedCoupon = await Coupon.findById(validCoupon._id);
    assert.equal(updatedCoupon.usedCount, 1);
  });

  it('Admin CRUD voucher: chặn member (403), validate đầu vào (400/409), tạo/sửa/khóa-mở/xóa thành công', async () => {
    // 1. Chưa đăng nhập -> 401; member -> 403
    const unauthRes = await fetch(`${baseUrl}/api/coupons`);
    assert.equal(unauthRes.status, 401);

    const memberListRes = await fetch(`${baseUrl}/api/coupons`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.equal(memberListRes.status, 403);

    const memberCreateRes = await fetch(`${baseUrl}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        code: 'MEMBERFAIL',
        discountType: 'percent',
        discountValue: 10,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 5,
      }),
    });
    assert.equal(memberCreateRes.status, 403);

    // 2. Validate đầu vào khi Admin tạo voucher sai
    const invalidPercentRes = await fetch(`${baseUrl}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'BADPCT',
        discountType: 'percent',
        discountValue: 150,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 5,
      }),
    });
    assert.equal(invalidPercentRes.status, 400);

    const pastDateRes = await fetch(`${baseUrl}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'PASTDATE',
        discountType: 'fixed',
        discountValue: 20000,
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
        maxUses: 5,
      }),
    });
    assert.equal(pastDateRes.status, 400);

    // 3. Admin tạo mới thành công (201)
    const adminCode = `ADMIN_${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: adminCode.toLowerCase(),
        description: 'Ưu đãi Admin test',
        discountType: 'fixed',
        discountValue: 30000,
        minOrderAmount: 100000,
        expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
        maxUses: 10,
      }),
    });
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    const created = createBody.data;
    createdCouponIds.push(created._id);
    assert.equal(created.code, adminCode.toUpperCase());

    // 4. Tạo trùng mã -> 409
    const dupRes = await fetch(`${baseUrl}/api/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: adminCode,
        discountType: 'fixed',
        discountValue: 15000,
        expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
        maxUses: 10,
      }),
    });
    assert.equal(dupRes.status, 409);

    // 5. Admin lấy danh sách
    const listRes = await fetch(`${baseUrl}/api/coupons`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.data));
    assert.ok(listBody.data.some((c) => c._id === created._id));

    // 6. Admin cập nhật voucher
    const updateRes = await fetch(`${baseUrl}/api/coupons/${created._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: `${adminCode}_V2`,
        description: 'Đã cập nhật',
        discountType: 'percent',
        discountValue: 20,
        maxDiscount: 40000,
        minOrderAmount: 50000,
        expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        maxUses: 20,
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.data.discountType, 'percent');
    assert.equal(updateBody.data.discountValue, 20);

    // 7. Admin khóa / mở voucher
    const toggleRes = await fetch(`${baseUrl}/api/coupons/${created._id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(toggleRes.status, 200);
    const toggleBody = await toggleRes.json();
    assert.equal(toggleBody.data.isActive, false);

    // 8. Admin xóa voucher
    const deleteRes = await fetch(`${baseUrl}/api/coupons/${created._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(deleteRes.status, 200);
  });
});
