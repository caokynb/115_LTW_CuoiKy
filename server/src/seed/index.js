const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Movie = require('../models/Movie');
const Room = require('../models/Room');
const Cinema = require('../models/Cinema');
const Showtime = require('../models/Showtime');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Coupon = require('../models/Coupon');
const Snack = require('../models/Snack');

const demoUsers = require('./data/users');
const movieSeeds = require('./data/movies');
const roomSeeds = require('./data/rooms');
const cinemaSeeds = require('./data/cinemas');
const showtimeConfig = require('./data/showtimes');
const couponSeeds = require('./data/coupons');
const snackSeeds = require('./data/snacks');

const saigonDateAfter = (daysAhead, reference = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(
    Number(dateParts.year),
    Number(dateParts.month) - 1,
    Number(dateParts.day) + daysAhead
  ));
  return date.toISOString().slice(0, 10);
};

const releaseDateFromOffset = (offsetDays, reference) =>
  new Date(`${saigonDateAfter(offsetDays, reference)}T00:00:00.000Z`);

const seedUsers = async () => {
  let created = 0;

  for (const { password, ...userData } of demoUsers) {
    const passwordHash = await User.hashPassword(password);
    const result = await User.updateOne(
      { email: userData.email },
      { $set: { ...userData, passwordHash } },
      { upsert: true }
    );
    created += result.upsertedCount || 0;
  }

  return created;
};

const seedMovies = async (reference) => {
  let created = 0;

  for (const { releaseOffsetDays, ...movieData } of movieSeeds) {
    const document = {
      ...movieData,
      releaseDate: releaseDateFromOffset(releaseOffsetDays, reference),
    };
    const result = await Movie.updateOne(
      { title: document.title },
      { $setOnInsert: document },
      { upsert: true }
    );
    created += result.upsertedCount || 0;

    // nâng cấp dữ liệu phim mẫu cũ nếu vẫn dùng ảnh placeholder, chưa có poster phụ hoặc chưa có backdrop ngang
    await Movie.updateOne(
      {
        title: document.title,
        $or: [
          { posterUrl: /placehold\.co/i },
          { posterUrls: { $exists: false } },
          { posterUrls: { $size: 0 } },
          { backdropUrl: { $exists: false } },
          { backdropUrl: '' },
        ],
      },
      {
        $set: {
          posterUrl: document.posterUrl,
          posterUrls: document.posterUrls || [],
          backdropUrl: document.backdropUrl || '',
          ...(document.tmdbId ? { tmdbId: document.tmdbId } : {}),
        },
      }
    );
  }

  return created;
};

const seedCinemas = async () => {
  for (const cinemaData of cinemaSeeds) {
    await Cinema.updateOne(
      { name: cinemaData.name },
      { $setOnInsert: cinemaData },
      { upsert: true }
    );
  }
  return Cinema.findOne({ name: cinemaSeeds[0].name });
};

const seedRooms = async (cinema) => {
  let created = 0;

  for (const roomData of roomSeeds) {
    const result = await Room.updateOne(
      { name: roomData.name },
      { $setOnInsert: roomData },
      { upsert: true }
    );
    created += result.upsertedCount || 0;
  }

  if (cinema) {
    const rooms = await Room.find({ name: { $in: roomSeeds.map(({ name }) => name) } }).select('_id');
    const roomIds = rooms.map((room) => room._id);
    if (roomIds.length) {
      // Chỉ chuẩn hóa phòng mẫu được quản lý bởi seed, không xóa dữ liệu rạp khác.
      await Cinema.updateMany(
        { _id: { $ne: cinema._id }, rooms: { $in: roomIds } },
        { $pull: { rooms: { $in: roomIds } } }
      );
      await Room.updateMany({ _id: { $in: roomIds } }, { $set: { cinemaId: cinema._id } });
      await Cinema.updateOne({ _id: cinema._id }, { $addToSet: { rooms: { $each: roomIds } } });
    }
  }

  return created;
};

const seedShowtimes = async (reference) => {
  const [movies, rooms] = await Promise.all([
    Movie.find({ title: { $in: movieSeeds.map(({ title }) => title) } }).sort({ title: 1 }),
    Room.find({ name: { $in: roomSeeds.map(({ name }) => name) } }).sort({ name: 1 }),
  ]);
  const movieByTitle = new Map(movies.map((movie) => [movie.title, movie]));
  const roomByName = new Map(rooms.map((room) => [room.name, room]));
  let created = 0;

  for (let day = 1; day <= showtimeConfig.daysAhead; day += 1) {
    const date = saigonDateAfter(day, reference);
    const calendarDay = Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 86_400_000);

    for (let roomIndex = 0; roomIndex < roomSeeds.length; roomIndex += 1) {
      const room = roomByName.get(roomSeeds[roomIndex].name);
      if (!room) throw new Error(`Không tìm thấy phòng seed: ${roomSeeds[roomIndex].name}`);

      for (let slotIndex = 0; slotIndex < showtimeConfig.utcStartHours.length; slotIndex += 1) {
        const movieSeedIndex = (calendarDay + roomIndex + slotIndex) % movieSeeds.length;
        const movie = movieByTitle.get(movieSeeds[movieSeedIndex].title);
        if (!movie) throw new Error(`Không tìm thấy phim seed: ${movieSeeds[movieSeedIndex].title}`);

        const hour = String(showtimeConfig.utcStartHours[slotIndex]).padStart(2, '0');
        const startTime = new Date(`${date}T${hour}:00:00.000Z`);
        const endTime = new Date(startTime.getTime() + movie.duration * 60_000);
        const identity = { roomId: room._id, movieId: movie._id, startTime };
        const existing = await Showtime.findOne(identity).select('_id');
        const overlapQuery = {
          roomId: room._id,
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        };
        if (existing) overlapQuery._id = { $ne: existing._id };

        const overlap = await Showtime.findOne(overlapQuery)
          .populate('movieId', 'title')
          .select('movieId startTime endTime');
        if (overlap) {
          throw new Error(
            `Suất seed ${movie.title} trùng giờ với một suất khác trong phòng ${room.name}.`
          );
        }

        const result = await Showtime.updateOne(
          identity,
          {
            $setOnInsert: {
              ...identity,
              endTime,
              standardPrice: showtimeConfig.standardPrice,
              vipPrice: showtimeConfig.vipPrice,
            },
          },
          { upsert: true }
        );
        created += result.upsertedCount || 0;
      }
    }
  }

  return created;
};

const getRowName = (number) => {
  let row = '';
  let current = number;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    row = String.fromCharCode(65 + remainder) + row;
    current = Math.floor((current - 1) / 26);
  }

  return row;
};

const seedSampleBooking = async (reference) => {
  const memberSeed = demoUsers.find(({ role }) => role === 'member');
  const [member, showtime] = await Promise.all([
    User.findOne({ email: memberSeed.email }),
    Showtime.findOne({ startTime: { $gt: reference } }).sort({ startTime: 1 }),
  ]);

  if (!member || !showtime) return { bookingsCreated: 0, ticketsCreated: 0 };

  const existingBooking = await Booking.findOne({
    userId: member._id,
    showtimeId: showtime._id,
    status: 'confirmed',
  }).select('_id');
  if (existingBooking) return { bookingsCreated: 0, ticketsCreated: 0 };

  const room = await Room.findById(showtime.roomId);
  if (!room) return { bookingsCreated: 0, ticketsCreated: 0 };

  const occupiedTickets = await Ticket.find({ showtimeId: showtime._id, status: 'active' })
    .select('row number')
    .lean();
  const occupiedSeats = new Set(occupiedTickets.map(({ row, number }) => `${row}-${number}`));
  const seats = [];

  for (let rowNumber = 1; rowNumber <= room.rows && seats.length < 2; rowNumber += 1) {
    const row = getRowName(rowNumber);
    for (let number = 1; number <= room.seatsPerRow && seats.length < 2; number += 1) {
      if (!occupiedSeats.has(`${row}-${number}`)) {
        seats.push({ row, number, seatType: room.vipRows.includes(rowNumber) ? 'vip' : 'standard' });
      }
    }
  }

  if (seats.length === 0) return { bookingsCreated: 0, ticketsCreated: 0 };

  const tickets = seats.map((seat) => ({
    ...seat,
    price: seat.seatType === 'vip' ? showtime.vipPrice : showtime.standardPrice,
  }));
  const totalPrice = tickets.reduce((total, ticket) => total + ticket.price, 0);
  const booking = await Booking.create({
    userId: member._id,
    showtimeId: showtime._id,
    totalPrice,
    originalPrice: totalPrice,
    status: 'confirmed',
  });

  try {
    await Ticket.insertMany(tickets.map((ticket) => ({
      bookingId: booking._id,
      showtimeId: showtime._id,
      row: ticket.row,
      number: ticket.number,
      seatType: ticket.seatType,
      price: ticket.price,
      status: 'active',
    })));
  } catch (error) {
    await Ticket.deleteMany({ bookingId: booking._id });
    await Booking.deleteOne({ _id: booking._id });
    throw error;
  }

  return { bookingsCreated: 1, ticketsCreated: tickets.length };
};

const seedCoupons = async (reference) => {
  let created = 0;

  for (const { expiresOffsetDays, ...couponData } of couponSeeds) {
    const document = {
      ...couponData,
      expiresAt: releaseDateFromOffset(expiresOffsetDays, reference),
    };
    const result = await Coupon.updateOne(
      { code: document.code },
      { $setOnInsert: document },
      { upsert: true }
    );
    created += result.upsertedCount || 0;
  }

  return created;
};

const seedSnacks = async () => {
  let created = 0;

  for (const snackData of snackSeeds) {
    const result = await Snack.updateOne(
      { name: snackData.name },
      { $setOnInsert: snackData },
      { upsert: true }
    );
    created += result.upsertedCount || 0;
  }

  return created;
};

const seed = async () => {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<')) {
    throw new Error('Hãy cấu hình MONGODB_URI hợp lệ trong server/.env trước khi seed.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const reference = new Date();
  const cinema = await seedCinemas();
  const [usersCreated, moviesCreated, roomsCreated, couponsCreated, snacksCreated] = await Promise.all([
    seedUsers(),
    seedMovies(reference),
    seedRooms(cinema),
    seedCoupons(reference),
    seedSnacks(),
  ]);
  const showtimesCreated = await seedShowtimes(reference);
  const sampleBooking = await seedSampleBooking(reference);

  console.log('Seed hoàn tất.');
  console.log(`Tài khoản mới: ${usersCreated}; phim mới: ${moviesCreated}; phòng mới: ${roomsCreated}; suất chiếu mới: ${showtimesCreated}; booking mẫu mới: ${sampleBooking.bookingsCreated}; vé mẫu mới: ${sampleBooking.ticketsCreated}; mã giảm giá mới: ${couponsCreated}; bắp nước mới: ${snacksCreated}.`);
  console.log('Tài khoản demo:');
  for (const { email, password, role } of demoUsers) {
    console.log(`- ${role}: ${email} / ${password}`);
  }
};

if (require.main === module) {
  seed()
    .catch((error) => {
      console.error(`Seed thất bại: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { seed };
