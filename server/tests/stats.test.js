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
const Booking = require('../src/models/Booking');
const Ticket = require('../src/models/Ticket');
const { signToken } = require('../src/utils/token');

describe('Dashboard statistics API', () => {
  let server;
  let baseUrl;
  let token;
  let movie;
  let room;
  let soldShowtime;
  let emptyShowtime;
  let booking;
  let admin;

  before(async () => {
    if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI trong server/.env');
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
    const suffix = Date.now();

    admin = await User.create({
      fullName: 'Stats test admin',
      email: `stats_admin_${suffix}@example.com`,
      passwordHash: 'not-used',
      role: 'admin',
    });
    token = signToken(admin);

    movie = await Movie.create({
      title: `Stats test movie ${suffix}`,
      description: 'Dashboard statistics test',
      genres: ['Drama'],
      duration: 90,
      releaseDate: new Date('2026-01-01'),
      posterUrl: 'https://example.com/p.jpg',
      trailerYoutubeId: 'dQw4w9WgXcQ',
    });
    room = await Room.create({ name: `Stats test room ${suffix}`, rows: 5, seatsPerRow: 5, vipRows: [] });

    const firstStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const secondStart = new Date(firstStart.getTime() + 4 * 60 * 60 * 1000);
    [soldShowtime, emptyShowtime] = await Showtime.create([
      {
        movieId: movie._id,
        roomId: room._id,
        startTime: firstStart,
        endTime: new Date(firstStart.getTime() + 90 * 60 * 1000),
        standardPrice: 100,
        vipPrice: 150,
      },
      {
        movieId: movie._id,
        roomId: room._id,
        startTime: secondStart,
        endTime: new Date(secondStart.getTime() + 90 * 60 * 1000),
        standardPrice: 100,
        vipPrice: 150,
      },
    ]);

    booking = await Booking.create({
      userId: admin._id,
      showtimeId: soldShowtime._id,
      totalPrice: 200,
      originalPrice: 200,
      status: 'confirmed',
    });
    await Ticket.insertMany([
      { bookingId: booking._id, showtimeId: soldShowtime._id, row: 'A', number: 1, price: 100, status: 'active' },
      { bookingId: booking._id, showtimeId: soldShowtime._id, row: 'A', number: 2, price: 100, status: 'active' },
      { bookingId: booking._id, showtimeId: soldShowtime._id, row: 'A', number: 3, price: 100, status: 'cancelled' },
    ]);
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (booking) await Ticket.deleteMany({ bookingId: booking._id });
    if (booking) await Booking.deleteOne({ _id: booking._id });
    if (soldShowtime || emptyShowtime) {
      await Showtime.deleteMany({ _id: { $in: [soldShowtime?._id, emptyShowtime?._id].filter(Boolean) } });
    }
    if (room) await Room.deleteOne({ _id: room._id });
    if (movie) await Movie.deleteOne({ _id: movie._id });
    if (admin) await User.deleteOne({ _id: admin._id });
    await mongoose.disconnect();
  });

  it('reports confirmed booking revenue, active ticket count, and zero occupancy for an empty showtime', async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const [movieResponse, occupancyResponse] = await Promise.all([
      fetch(`${baseUrl}/api/stats/revenue-by-movie`, { headers }),
      fetch(`${baseUrl}/api/stats/occupancy-by-showtime`, { headers }),
    ]);

    assert.equal(movieResponse.status, 200);
    assert.equal(occupancyResponse.status, 200);

    const moviePayload = await movieResponse.json();
    const occupancyPayload = await occupancyResponse.json();
    const movieStats = moviePayload.data.find((item) => item.movieId === movie._id.toString());
    const soldStats = occupancyPayload.data.find((item) => item._id === soldShowtime._id.toString());
    const emptyStats = occupancyPayload.data.find((item) => item._id === emptyShowtime._id.toString());

    assert.equal(movieStats.totalRevenue, 200);
    assert.equal(movieStats.bookingCount, 1);
    assert.equal(movieStats.ticketCount, 2);
    assert.equal(soldStats.soldTickets, 2);
    assert.equal(soldStats.totalSeats, 25);
    assert.equal(soldStats.occupancyRate, 8);
    assert.equal(emptyStats.soldTickets, 0);
    assert.equal(emptyStats.totalSeats, 25);
    assert.equal(emptyStats.occupancyRate, 0);
  });
});
