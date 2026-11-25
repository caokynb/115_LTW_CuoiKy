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
const { signToken } = require('../src/utils/token');

describe('Movie API Endpoints (/api/movies)', () => {
  let server;
  let baseUrl;
  let adminUser;
  let memberUser;
  let adminToken;
  let memberToken;
  let testRoom;
  const createdMovieIds = [];
  const createdShowtimeIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    const suffix = Date.now();
    adminUser = await User.create({
      fullName: 'Movie Test Admin',
      email: `movie_admin_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });

    memberUser = await User.create({
      fullName: 'Movie Test Member',
      email: `movie_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });

    adminToken = signToken(adminUser);
    memberToken = signToken(memberUser);

    testRoom = await Room.create({
      name: `Phòng Test Movie ${suffix}`,
      rows: 6,
      seatsPerRow: 8,
      vipRows: [4],
    });
  });

  after(async () => {
    // dọn sạch dữ liệu test khỏi MongoDB
    if (createdShowtimeIds.length > 0) {
      await Showtime.deleteMany({ _id: { $in: createdShowtimeIds } });
    }
    if (createdMovieIds.length > 0) {
      await Movie.deleteMany({ _id: { $in: createdMovieIds } });
    }
    if (testRoom) {
      await Room.findByIdAndDelete(testRoom._id);
    }
    if (adminUser) {
      await User.findByIdAndDelete(adminUser._id);
    }
    if (memberUser) {
      await User.findByIdAndDelete(memberUser._id);
    }
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  });

  it('POST /api/movies: member bị chặn 403, thiếu trường trả 400, admin tạo thành công 201', async () => {
    const validMovie = {
      title: `Dune Test ${Date.now()}`,
      description: 'Phim thử nghiệm API movies',
      genres: ['Khoa học viễn tưởng', 'Phiêu lưu'],
      duration: 155,
      releaseDate: '2026-04-01',
      status: 'now_showing',
      posterUrl: 'https://example.com/dune-test.jpg',
      trailerYoutubeId: 'Way9Dexny3w',
    };

    // chưa đăng nhập -> 401
    const unauthRes = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validMovie),
    });
    assert.equal(unauthRes.status, 401);

    // tài khoản member -> 403
    const memberRes = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify(validMovie),
    });
    assert.equal(memberRes.status, 403);

    // thiếu trường bắt buộc -> 400
    const invalidRes = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: 'Thiếu trường' }),
    });
    assert.equal(invalidRes.status, 400);

    // admin gửi đầy đủ -> 201
    const createRes = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(validMovie),
    });
    const body = await createRes.json();
    assert.equal(createRes.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.title, validMovie.title);
    createdMovieIds.push(body.data._id);
  });

  it('GET /api/movies và GET /api/movies/:id trả về đúng phân trang và xử lý 404', async () => {
    const uniqueTitle = `Searchable Movie ${Date.now()}`;
    const movie = await Movie.create({
      title: uniqueTitle,
      description: 'Mô tả test tìm kiếm',
      genres: ['Hành động'],
      duration: 120,
      releaseDate: new Date('2026-05-01'),
      status: 'now_showing',
      posterUrl: 'https://example.com/search.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    createdMovieIds.push(movie._id);

    const listRes = await fetch(
      `${baseUrl}/api/movies?q=${encodeURIComponent(uniqueTitle)}&genre=${encodeURIComponent('Hành động')}&page=1&limit=5`
    );
    const listBody = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.equal(listBody.success, true);
    assert.ok(Array.isArray(listBody.data));
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.total, 1);
    assert.equal(listBody.page, 1);

    // GET /:id hợp lệ
    const detailRes = await fetch(`${baseUrl}/api/movies/${movie._id}`);
    const detailBody = await detailRes.json();
    assert.equal(detailRes.status, 200);
    assert.equal(detailBody.data.title, uniqueTitle);

    // GET /:id không tồn tại -> 404
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${baseUrl}/api/movies/${fakeId}`);
    assert.equal(notFoundRes.status, 404);
  });

  it('PUT /api/movies/:id cập nhật phim thành công với quyền admin', async () => {
    const movie = await Movie.create({
      title: `Before Update ${Date.now()}`,
      description: 'Mô tả ban đầu',
      genres: ['Kịch tính'],
      duration: 100,
      releaseDate: new Date('2026-06-01'),
      status: 'coming_soon',
      posterUrl: 'https://example.com/update.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    createdMovieIds.push(movie._id);

    const updateRes = await fetch(`${baseUrl}/api/movies/${movie._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ title: 'After Update Title', status: 'now_showing' }),
    });
    const updateBody = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateBody.data.title, 'After Update Title');
    assert.equal(updateBody.data.status, 'now_showing');
  });

  it('DELETE /api/movies/:id chặn xóa phim còn suất chiếu tương lai (409) và cho phép xóa phim hết suất', async () => {
    // 1. Tạo phim có suất chiếu trong tương lai -> phải trả 409
    const movieWithFuture = await Movie.create({
      title: `Movie Future Showtime ${Date.now()}`,
      description: 'Phim còn suất chiếu tương lai',
      genres: ['Hành động'],
      duration: 120,
      releaseDate: new Date('2026-07-01'),
      status: 'now_showing',
      posterUrl: 'https://example.com/future.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    createdMovieIds.push(movieWithFuture._id);

    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 120 * 60 * 1000);
    const futureShowtime = await Showtime.create({
      movieId: movieWithFuture._id,
      roomId: testRoom._id,
      startTime: futureStart,
      endTime: futureEnd,
      standardPrice: 70000,
      vipPrice: 95000,
    });
    createdShowtimeIds.push(futureShowtime._id);

    const conflictRes = await fetch(`${baseUrl}/api/movies/${movieWithFuture._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const conflictBody = await conflictRes.json();
    assert.equal(conflictRes.status, 409);
    assert.match(conflictBody.message, /suất chiếu trong tương lai/i);

    // phim vẫn còn trong DB
    const stillExists = await Movie.findById(movieWithFuture._id);
    assert.ok(stillExists);

    // 2. Tạo phim chỉ có suất chiếu trong quá khứ (hết suất) -> phải xóa được (200)
    const moviePastOnly = await Movie.create({
      title: `Movie Past Showtime ${Date.now()}`,
      description: 'Phim đã hết suất chiếu',
      genres: ['Tâm lý'],
      duration: 95,
      releaseDate: new Date('2025-01-01'),
      status: 'now_showing',
      posterUrl: 'https://example.com/past.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    createdMovieIds.push(moviePastOnly._id);

    const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pastEnd = new Date(pastStart.getTime() + 95 * 60 * 1000);
    const pastShowtime = await Showtime.create({
      movieId: moviePastOnly._id,
      roomId: testRoom._id,
      startTime: pastStart,
      endTime: pastEnd,
      standardPrice: 60000,
      vipPrice: 85000,
    });
    createdShowtimeIds.push(pastShowtime._id);

    const deletePastRes = await fetch(`${baseUrl}/api/movies/${moviePastOnly._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(deletePastRes.status, 200);

    const deletedDoc = await Movie.findById(moviePastOnly._id);
    assert.equal(deletedDoc, null);
  });
});
