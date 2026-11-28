const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Room = require('../src/models/Room');
const Showtime = require('../src/models/Showtime');
const { signToken } = require('../src/utils/token');

describe('Showtime API overlap and access', () => {
  let server;
  let baseUrl;
  let adminToken;
  let memberToken;
  let admin;
  let member;
  let movie;
  let room;
  let otherRoom;
  let existing;
  const createdShowtimes = [];
  let baseStart;

  const request = (method, url, token, body) => fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = (roomId, startTime) => ({
    movieId: movie.id,
    roomId,
    startTime: new Date(startTime).toISOString(),
    standardPrice: 70000,
    vipPrice: 90000,
  });

  const create = async (roomId, startTime) => {
    const response = await request('POST', '/api/showtimes', adminToken, payload(roomId, startTime));
    if (response.status === 201) createdShowtimes.push((await response.json()).data._id);
    return response;
  };

  before(async () => {
    if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI trong server/.env');
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
    const suffix = Date.now();
    [admin, member] = await User.create([
      { fullName: 'Showtime test admin', email: `show_admin_${suffix}@example.com`, passwordHash: 'not-used', role: 'admin' },
      { fullName: 'Showtime test member', email: `show_member_${suffix}@example.com`, passwordHash: 'not-used', role: 'member' },
    ]);
    adminToken = signToken(admin);
    memberToken = signToken(member);
    movie = await Movie.create({
      title: `Showtime test movie ${suffix}`, description: 'Showtime API test', genres: ['Drama'],
      duration: 90, releaseDate: new Date('2026-01-01'), posterUrl: 'https://example.com/p.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    [room, otherRoom] = await Room.create([
      { name: `Showtime room A ${suffix}`, rows: 5, seatsPerRow: 5, vipRows: [] },
      { name: `Showtime room B ${suffix}`, rows: 5, seatsPerRow: 5, vipRows: [] },
    ]);
    baseStart = Date.now() + 10 * 24 * 60 * 60 * 1000;
    existing = await Showtime.create({
      movieId: movie._id, roomId: room._id,
      startTime: new Date(baseStart), endTime: new Date(baseStart + 90 * 60 * 1000),
      standardPrice: 70000, vipPrice: 90000,
    });
  });

  after(async () => {
    await Showtime.deleteMany({ _id: { $in: [existing?._id, ...createdShowtimes].filter(Boolean) } });
    if (movie) await Movie.deleteOne({ _id: movie._id });
    if (room || otherRoom) await Room.deleteMany({ _id: { $in: [room?._id, otherRoom?._id].filter(Boolean) } });
    if (admin || member) await User.deleteMany({ _id: { $in: [admin?._id, member?._id].filter(Boolean) } });
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  it('yêu cầu đăng nhập khi tạo suất chiếu', async () => {
    const response = await request('POST', '/api/showtimes', null, payload(room.id, baseStart + 5 * 60 * 1000));
    assert.equal(response.status, 401);
  });

  it('member không được tạo suất chiếu', async () => {
    const response = await request('POST', '/api/showtimes', memberToken, payload(room.id, baseStart + 5 * 60 * 1000));
    assert.equal(response.status, 403);
  });

  it('admin tạo suất chiếu không trùng được', async () => {
    const response = await create(otherRoom.id, baseStart + 5 * 60 * 1000);
    assert.equal(response.status, 201);
  });

  it('chặn hai suất có cùng thời điểm bắt đầu trong cùng phòng', async () => {
    const response = await create(room.id, baseStart);
    assert.equal(response.status, 409);
  });

  it('chặn suất mới bắt đầu bên trong suất cũ', async () => {
    const response = await create(room.id, baseStart + 30 * 60 * 1000);
    assert.equal(response.status, 409);
  });

  it('chặn suất mới bao trùm suất cũ', async () => {
    const response = await create(room.id, baseStart - 30 * 60 * 1000);
    assert.equal(response.status, 409);
  });

  it('từ chối suất chiếu nếu cách suất trước dưới 15 phút', async () => {
    const response = await create(room.id, baseStart + 90 * 60 * 1000);
    assert.equal(response.status, 409);
  });

  it('cho phép suất chiếu cách suất trước đúng 15 phút', async () => {
    const response = await create(room.id, baseStart + 105 * 60 * 1000);
    assert.equal(response.status, 201);
  });

  it('trả 400 với ID phim không hợp lệ', async () => {
    const body = { ...payload(room.id, baseStart + 5 * 60 * 1000), movieId: 'bad-id' };
    const response = await request('POST', '/api/showtimes', adminToken, body);
    assert.equal(response.status, 400);
  });

  it('chặn cập nhật thành suất bị chồng giờ', async () => {
    const movable = await Showtime.create({
      movieId: movie._id, roomId: otherRoom._id,
      startTime: new Date(baseStart + 5 * 60 * 60 * 1000),
      endTime: new Date(baseStart + 6.5 * 60 * 60 * 1000),
      standardPrice: 70000, vipPrice: 90000,
    });
    createdShowtimes.push(movable._id);
    const response = await request('PUT', `/api/showtimes/${movable.id}`, adminToken, {
      roomId: room.id,
      startTime: new Date(baseStart + 30 * 60 * 1000).toISOString(),
    });
    assert.equal(response.status, 409);
  });
});
