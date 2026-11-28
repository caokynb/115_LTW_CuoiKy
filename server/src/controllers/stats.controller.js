const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const Ticket = require('../models/Ticket');
const AppError = require('../utils/AppError');

const SAIGON_OFFSET_MS = 7 * 60 * 60 * 1000;

const parseDateBound = (value, field, inclusiveEnd = false) => {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`${field} phải có định dạng YYYY-MM-DD.`, 400);
  }

  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1000 ||
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new AppError(`${field} không phải ngày hợp lệ.`, 400);
  }

  const nextDay = inclusiveEnd ? 1 : 0;
  return new Date(Date.UTC(year, month - 1, day + nextDay) - SAIGON_OFFSET_MS);
};

const getDateRange = (query) => {
  const { fromDate, toDate } = query;
  const from = parseDateBound(fromDate, 'fromDate');
  const until = parseDateBound(toDate, 'toDate', true);
  if (fromDate !== undefined && toDate !== undefined && fromDate > toDate) {
    throw new AppError('fromDate không được sau toDate.', 400);
  }

  const createdAt = {};
  if (from) createdAt.$gte = from;
  if (until) createdAt.$lt = until;

  return Object.keys(createdAt).length ? createdAt : null;
};

const bookingMatch = (createdAt) => {
  const match = { status: { $in: ['confirmed', 'checked-in'] } };
  if (createdAt) match.createdAt = createdAt;
  return match;
};

const getRevenueByMovie = async (req, res, next) => {
  try {
    const createdAt = getDateRange(req.query);
    const data = await Booking.aggregate([
      { $match: bookingMatch(createdAt) },
      {
        $lookup: {
          from: Showtime.collection.name,
          localField: 'showtimeId',
          foreignField: '_id',
          as: 'showtime',
        },
      },
      {
        $unwind: {
          path: '$showtime',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: Ticket.collection.name,
          let: { currentBooking: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$bookingId', '$$currentBooking'] },
                    { $in: ['$status', ['active', 'checked-in']] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'ticketCount',
        },
      },
      {
        $group: {
          _id: '$showtime.movieId',
          totalRevenue: { $sum: '$totalPrice' },
          bookingCount: { $sum: 1 },
          ticketCount: {
            $sum: { $ifNull: [{ $arrayElemAt: ['$ticketCount.count', 0] }, 0] },
          },
        },
      },
      {
        $lookup: {
          from: Movie.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'movie',
        },
      },
      {
        $unwind: {
          path: '$movie',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          movieId: '$_id',
          title: { $ifNull: ['$movie.title', 'Phim không xác định'] },
          totalRevenue: 1,
          bookingCount: 1,
          ticketCount: 1,
        },
      },
      { $sort: { totalRevenue: -1, title: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data,
      totalRevenue: data.reduce((total, item) => total + item.totalRevenue, 0),
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
    });
  } catch (error) {
    return next(error);
  }
};

const getRevenueByDay = async (req, res, next) => {
  try {
    const createdAt = getDateRange(req.query);
    const data = await Booking.aggregate([
      { $match: bookingMatch(createdAt) },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
          totalRevenue: { $sum: '$totalPrice' },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalRevenue: 1,
          bookingCount: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data,
      totalRevenue: data.reduce((total, item) => total + item.totalRevenue, 0),
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
    });
  } catch (error) {
    return next(error);
  }
};

const getOccupancyByShowtime = async (req, res, next) => {
  try {
    const data = await Showtime.aggregate([
      {
        $lookup: {
          from: Room.collection.name,
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Ticket.collection.name,
          let: { currentShowtime: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$showtimeId', '$$currentShowtime'] },
                    { $in: ['$status', ['active', 'checked-in']] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'ticketCount',
        },
      },
      {
        $lookup: {
          from: Movie.collection.name,
          localField: 'movieId',
          foreignField: '_id',
          as: 'movie',
        },
      },
      { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalSeats: { $multiply: ['$room.rows', '$room.seatsPerRow'] },
          soldTickets: { $ifNull: [{ $arrayElemAt: ['$ticketCount.count', 0] }, 0] },
        },
      },
      {
        $addFields: {
          occupancyRate: {
            $cond: [
              { $gt: ['$totalSeats', 0] },
              { $multiply: [{ $divide: ['$soldTickets', '$totalSeats'] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          startTime: 1,
          endTime: 1,
          movieTitle: { $ifNull: ['$movie.title', 'Phim không xác định'] },
          roomName: { $ifNull: ['$room.name', 'Phòng không xác định'] },
          soldTickets: 1,
          totalSeats: 1,
          occupancyRate: 1,
        },
      },
      { $sort: { occupancyRate: -1, startTime: 1 } },
    ]);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getRevenueByMovie, getRevenueByDay, getOccupancyByShowtime };
