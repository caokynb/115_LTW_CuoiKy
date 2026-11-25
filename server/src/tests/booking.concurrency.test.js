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

describe('Booking Concurrency (Promise.all - 2 & 10 requests on same seat)', () => {
  let server;
  let baseUrl;
  let authToken;
  let testUser;
  let testRoom;
  let testMovie;
  let futureShowtime;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    await Ticket.init();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    testUser = await User.create({
      fullName: 'Concurrency Test User',
      email: `concurrency_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });

    authToken = signToken(testUser);

    testRoom = await Room.create({
      name: `Room Concurrency ${uniqueSuffix}`,
      rows: 8,
      seatsPerRow: 10,
      vipRows: [5, 6],
    });

    testMovie = await Movie.create({
      title: `Movie Concurrency ${uniqueSuffix}`,
      description: 'Test chống đặt trùng đồng thời',
      genres: ['Hành Động'],
      duration: 120,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/poster.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);

    futureShowtime = await Showtime.create({
      movieId: testMovie._id,
      roomId: testRoom._id,
      startTime,
      endTime,
      standardPrice: 70000,
      vipPrice: 90000,
    });
  });

  after(async () => {
    if (futureShowtime) {
      await Ticket.deleteMany({ showtimeId: futureShowtime._id });
      await Booking.deleteMany({ showtimeId: futureShowtime._id });
      await Showtime.findByIdAndDelete(futureShowtime._id);
    }
    if (testMovie) await Movie.findByIdAndDelete(testMovie._id);
    if (testRoom) await Room.findByIdAndDelete(testRoom._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('gửi song song 2 request cùng ghế: đúng 1 request 201 và 1 request 409', async () => {
    const payload = JSON.stringify({
      showtimeId: futureShowtime._id.toString(),
      seats: [{ row: 'A', number: 1 }],
    });

    const requests = Array.from({ length: 2 }, () =>
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: payload,
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    assert.strictEqual(successCount, 1);
    assert.strictEqual(conflictCount, 1);

    const activeTickets = await Ticket.find({
      showtimeId: futureShowtime._id,
      row: 'A',
      number: 1,
      status: 'active',
    });
    assert.strictEqual(activeTickets.length, 1);
  });

  it('gửi song song 10 request cùng ghế: đúng 1 request 201 và 9 request 409', async () => {
    const payload = JSON.stringify({
      showtimeId: futureShowtime._id.toString(),
      seats: [{ row: 'B', number: 2 }],
    });

    const requests = Array.from({ length: 10 }, () =>
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: payload,
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const conflictCount = statuses.filter((s) => s === 409).length;

    assert.strictEqual(successCount, 1);
    assert.strictEqual(conflictCount, 9);

    const activeTickets = await Ticket.find({
      showtimeId: futureShowtime._id,
      row: 'B',
      number: 2,
      status: 'active',
    });
    assert.strictEqual(activeTickets.length, 1);
  });
});
