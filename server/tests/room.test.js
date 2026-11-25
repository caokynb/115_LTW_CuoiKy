const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const Showtime = require('../src/models/Showtime');
const { signToken } = require('../src/utils/token');

describe('Room API', () => {
  let server;
  let baseUrl;
  let adminToken;
  let memberToken;
  let room;
  let occupiedRoom;
  let showtime;
  let movie;
  let admin;
  let member;

  const request = (method, url, token, body) => fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  before(async () => {
    if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI trong server/.env');
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
    const suffix = Date.now();
    [admin, member] = await User.create([
      { fullName: 'Room test admin', email: `room_admin_${suffix}@example.com`, passwordHash: 'not-used', role: 'admin' },
      { fullName: 'Room test member', email: `room_member_${suffix}@example.com`, passwordHash: 'not-used', role: 'member' },
    ]);
    adminToken = signToken(admin);
    memberToken = signToken(member);
    [room, occupiedRoom] = await Room.create([
      { name: `Room empty ${suffix}`, rows: 5, seatsPerRow: 5, vipRows: [] },
      { name: `Room occupied ${suffix}`, rows: 5, seatsPerRow: 5, vipRows: [2] },
    ]);
    movie = await require('../src/models/Movie').create({
      title: `Room test movie ${suffix}`, description: 'Room API test', genres: ['Drama'],
      duration: 90, releaseDate: new Date('2026-01-01'), posterUrl: 'https://example.com/p.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    showtime = await Showtime.create({
      movieId: movie._id, roomId: occupiedRoom._id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25.5 * 60 * 60 * 1000),
      standardPrice: 70000, vipPrice: 90000,
    });
  });

  after(async () => {
    if (showtime) await Showtime.deleteOne({ _id: showtime._id });
    if (movie) await require('../src/models/Movie').deleteOne({ _id: movie._id });
    if (room || occupiedRoom) await Room.deleteMany({ _id: { $in: [room?._id, occupiedRoom?._id].filter(Boolean) } });
    if (admin || member) await User.deleteMany({ _id: { $in: [admin?._id, member?._id].filter(Boolean) } });
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('yêu cầu đăng nhập để truy cập danh sách phòng', async () => {
    const response = await request('GET', '/api/rooms');
    assert.equal(response.status, 401);
  });

  it('từ chối member xem API quản lý phòng', async () => {
    const response = await request('GET', '/api/rooms', memberToken);
    assert.equal(response.status, 403);
  });

  it('admin xem danh sách phòng được', async () => {
    const response = await request('GET', '/api/rooms', adminToken);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).data.some((item) => item._id === room.id));
  });

  it('trả 400 khi tạo phòng có số hàng ngoài giới hạn', async () => {
    const response = await request('POST', '/api/rooms', adminToken, {
      name: `Invalid room ${Date.now()}`, rows: 4, seatsPerRow: 5, vipRows: [],
    });
    assert.equal(response.status, 400);
  });

  it('không cho xóa phòng còn suất chiếu và trả 409', async () => {
    const response = await request('DELETE', `/api/rooms/${occupiedRoom.id}`, adminToken);
    assert.equal(response.status, 409);
  });

  it('xóa được phòng chưa có suất chiếu', async () => {
    const response = await request('DELETE', `/api/rooms/${room.id}`, adminToken);
    assert.equal(response.status, 200);
    room = null;
  });
});
