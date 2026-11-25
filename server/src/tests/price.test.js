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

describe('Seat Price Calculation (Standard vs VIP)', () => {
  let server;
  let baseUrl;
  let authToken;
  let testUser;
  let testRoom;
  let testMovie;
  let futureShowtime;

  const standardPrice = 75000;
  const vipPrice = 105000;

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
      fullName: 'Price Test User',
      email: `price_${uniqueSuffix}@example.com`,
      passwordHash: await User.hashPassword('Password123!'),
      role: 'member',
    });

    authToken = signToken(testUser);

    testRoom = await Room.create({
      name: `Room Price ${uniqueSuffix}`,
      rows: 8,
      seatsPerRow: 10,
      vipRows: [5, 6],
    });

    testMovie = await Movie.create({
      title: `Movie Price ${uniqueSuffix}`,
      description: 'Test tính tiền ghế thường/VIP',
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
      standardPrice,
      vipPrice,
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

  it('tính đúng tiền ghế thường (standard)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'A', number: 1 },
          { row: 'A', number: 2 },
        ],
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.data.booking.totalPrice, standardPrice * 2);
    for (const ticket of data.data.tickets) {
      assert.strictEqual(ticket.seatType, 'standard');
      assert.strictEqual(ticket.price, standardPrice);
    }
  });

  it('tính đúng tiền ghế VIP', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'E', number: 1 },
          { row: 'F', number: 2 },
        ],
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.data.booking.totalPrice, vipPrice * 2);
    for (const ticket of data.data.tickets) {
      assert.strictEqual(ticket.seatType, 'vip');
      assert.strictEqual(ticket.price, vipPrice);
    }
  });

  it('tính đúng tổng tiền khi kết hợp cả ghế thường và ghế VIP', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        showtimeId: futureShowtime._id.toString(),
        seats: [
          { row: 'C', number: 1 },
          { row: 'E', number: 3 },
        ],
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.data.booking.totalPrice, standardPrice + vipPrice);

    const standardTicket = data.data.tickets.find((t) => t.row === 'C' && t.number === 1);
    const vipTicket = data.data.tickets.find((t) => t.row === 'E' && t.number === 3);

    assert.strictEqual(standardTicket.seatType, 'standard');
    assert.strictEqual(standardTicket.price, standardPrice);
    assert.strictEqual(vipTicket.seatType, 'vip');
    assert.strictEqual(vipTicket.price, vipPrice);
  });
});
