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
const { validateMovieInput } = require('../src/validators/movie.validator');
const { signToken } = require('../src/utils/token');

describe('TMDB Posters & Movie posterUrls Support', () => {
  let server;
  let baseUrl;
  let adminUser;
  let memberUser;
  let adminToken;
  let memberToken;
  const createdMovieIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    const suffix = Date.now();
    adminUser = await User.create({
      fullName: 'TMDB Test Admin',
      email: `tmdb_admin_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
    });

    memberUser = await User.create({
      fullName: 'TMDB Test Member',
      email: `tmdb_member_${suffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });

    adminToken = signToken(adminUser);
    memberToken = signToken(memberUser);
  });

  after(async () => {
    if (createdMovieIds.length > 0) {
      await Movie.deleteMany({ _id: { $in: createdMovieIds } });
    }
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (memberUser) await User.findByIdAndDelete(memberUser._id);
    if (server) server.close();
    await mongoose.disconnect();
  });

  it('validateMovieInput chấp nhận posterUrls hợp lệ và chặn URL sai hoặc vượt quá 6 ảnh', () => {
    const valid = validateMovieInput({
      title: 'Phim kiểm thử',
      description: 'Mô tả phim',
      genres: ['Hành động'],
      duration: 120,
      releaseDate: '2026-12-01',
      posterUrl: 'https://image.tmdb.org/t/p/w500/main.jpg',
      posterUrls: ['https://image.tmdb.org/t/p/w500/alt1.jpg'],
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/bg.jpg',
      trailerYoutubeId: 'zSWdZVtXT7E',
    });
    assert.equal(valid.isValid, true);

    const invalidBackdrop = validateMovieInput(
      {
        backdropUrl: 'invalid-backdrop-url',
      },
      true
    );
    assert.equal(invalidBackdrop.isValid, false);

    const invalidProtocol = validateMovieInput(
      {
        posterUrls: ['not-a-valid-url'],
      },
      true
    );
    assert.equal(invalidProtocol.isValid, false);

    const tooMany = validateMovieInput(
      {
        posterUrls: Array.from({ length: 7 }, (_, idx) => `https://example.com/p${idx}.jpg`),
      },
      true
    );
    assert.equal(tooMany.isValid, false);
  });

  it('POST và PUT /api/movies lưu chuẩn hóa danh sách posterUrls (loại bỏ trùng với poster chính)', async () => {
    const createRes = await fetch(`${baseUrl}/api/movies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: `TMDB Test Movie ${Date.now()}`,
        description: 'Kiểm thử lưu nhiều poster',
        genres: ['Khoa học viễn tưởng'],
        duration: 130,
        releaseDate: '2026-12-01',
        status: 'now_showing',
        ageRating: 'T13',
        posterUrl: 'https://image.tmdb.org/t/p/w500/p0.jpg',
        posterUrls: [
          'https://image.tmdb.org/t/p/w500/p0.jpg',
          'https://image.tmdb.org/t/p/w500/p1.jpg',
          'https://image.tmdb.org/t/p/w500/p2.jpg',
          'https://image.tmdb.org/t/p/w500/p1.jpg',
        ],
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/bg0.jpg',
        trailerYoutubeId: 'zSWdZVtXT7E',
      }),
    });

    assert.equal(createRes.status, 201);
    const createdJson = await createRes.json();
    const movieId = createdJson.data?._id;
    assert.ok(movieId);
    createdMovieIds.push(movieId);

    assert.deepEqual(createdJson.data.posterUrls, [
      'https://image.tmdb.org/t/p/w500/p1.jpg',
      'https://image.tmdb.org/t/p/w500/p2.jpg',
    ]);
    assert.equal(createdJson.data.backdropUrl, 'https://image.tmdb.org/t/p/w1280/bg0.jpg');

    const updateRes = await fetch(`${baseUrl}/api/movies/${movieId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        posterUrls: ['https://image.tmdb.org/t/p/w500/p3.jpg'],
        backdropUrl: 'https://image.tmdb.org/t/p/w1280/bg1.jpg',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updatedJson = await updateRes.json();
    assert.deepEqual(updatedJson.data.posterUrls, ['https://image.tmdb.org/t/p/w500/p3.jpg']);
    assert.equal(updatedJson.data.backdropUrl, 'https://image.tmdb.org/t/p/w1280/bg1.jpg');
  });

  it('GET /api/movies/tmdb/posters bảo vệ phân quyền Admin và kiểm tra tham số đầu vào', async () => {
    const guestRes = await fetch(`${baseUrl}/api/movies/tmdb/posters?q=Interstellar`);
    assert.equal(guestRes.status, 401);

    const memberRes = await fetch(`${baseUrl}/api/movies/tmdb/posters?q=Interstellar`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.equal(memberRes.status, 403);

    const missingQueryRes = await fetch(`${baseUrl}/api/movies/tmdb/posters`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(missingQueryRes.status, 400);
  });
});
