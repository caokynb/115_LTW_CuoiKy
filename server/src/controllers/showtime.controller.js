const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const Room = require('../models/Room');
const AppError = require('../utils/AppError');

const invalidId = (id) => !mongoose.isObjectIdOrHexString(id);

const parseDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validatePrices = (body) => {
  const errors = {};
  for (const field of ['standardPrice', 'vipPrice']) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = 'Trường này là bắt buộc.';
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors[field] = 'Giá phải là số hợp lệ và không âm.';
    }
  }
  return errors;
};

const findOverlap = (roomId, startTime, endTime, excludeId) => {
  const query = {
    roomId,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Showtime.findOne(query).populate('movieId', 'title duration');
};

const showOverlapError = (showtime) => {
  const title = showtime.movieId?.title || 'Phim không xác định';
  return new AppError(
    `Suất chiếu bị trùng với “${title}” từ ${showtime.startTime.toISOString()} đến ${showtime.endTime.toISOString()}.`,
    409
  );
};

const getShowtimes = async (req, res, next) => {
  try {
    const { movieId, date } = req.query;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return next(new AppError('page phải từ 1; limit phải từ 1 đến 100.', 400));
    }
    if (movieId && invalidId(movieId)) {
      return next(new AppError('movieId không hợp lệ.', 400));
    }

    const filter = {};
    if (movieId) filter.movieId = movieId;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return next(new AppError('date phải có định dạng YYYY-MM-DD.', 400));
      }
      const from = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(from.getTime()) || from.toISOString().slice(0, 10) !== date) {
        return next(new AppError('Ngày lọc không hợp lệ.', 400));
      }
      const until = new Date(from);
      until.setUTCDate(until.getUTCDate() + 1);
      filter.startTime = { $gte: from, $lt: until };
    }

    const [data, total] = await Promise.all([
      Showtime.find(filter)
        .populate('movieId', 'title duration posterUrl')
        .populate('roomId', 'name rows seatsPerRow vipRows')
        .sort({ startTime: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Showtime.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return next(error);
  }
};

const getShowtimeById = async (req, res, next) => {
  try {
    if (invalidId(req.params.id)) {
      return next(new AppError('ID suất chiếu không hợp lệ.', 400));
    }

    const showtime = await Showtime.findById(req.params.id)
      .populate('movieId', 'title duration posterUrl')
      .populate('roomId', 'name rows seatsPerRow vipRows');
    if (!showtime) return next(new AppError('Không tìm thấy suất chiếu.', 404));

    return res.status(200).json({ success: true, data: showtime });
  } catch (error) {
    return next(error);
  }
};

const createShowtime = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { movieId, roomId } = body;
    const startTime = parseDate(body.startTime);
    const errors = validatePrices(body);

    if (!movieId || invalidId(movieId)) errors.movieId = 'Phim không hợp lệ.';
    if (!roomId || invalidId(roomId)) errors.roomId = 'Phòng chiếu không hợp lệ.';
    if (!startTime) errors.startTime = 'Thời gian bắt đầu không hợp lệ.';
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: 'Dữ liệu suất chiếu không hợp lệ.', errors });
    }

    const movie = await Movie.findById(movieId).select('title duration');
    const room = await Room.findById(roomId).select('_id');
    if (!movie) return next(new AppError('Không tìm thấy phim.', 404));
    if (!room) return next(new AppError('Không tìm thấy phòng chiếu.', 404));

    const endTime = new Date(startTime.getTime() + movie.duration * 60_000);
    const overlap = await findOverlap(roomId, startTime, endTime);
    if (overlap) return next(showOverlapError(overlap));

    const showtime = await Showtime.create({
      movieId,
      roomId,
      startTime,
      endTime,
      standardPrice: body.standardPrice,
      vipPrice: body.vipPrice,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo suất chiếu thành công.',
      data: await showtime.populate([
        { path: 'movieId', select: 'title duration posterUrl' },
        { path: 'roomId', select: 'name rows seatsPerRow vipRows' },
      ]),
    });
  } catch (error) {
    return next(error);
  }
};

const updateShowtime = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { id } = req.params;
    if (invalidId(id)) return next(new AppError('ID suất chiếu không hợp lệ.', 400));

    const showtime = await Showtime.findById(id);
    if (!showtime) return next(new AppError('Không tìm thấy suất chiếu để cập nhật.', 404));

    const movieId = body.movieId ?? showtime.movieId;
    const roomId = body.roomId ?? showtime.roomId;
    const startTime = body.startTime === undefined
      ? showtime.startTime
      : parseDate(body.startTime);
    const standardPrice = body.standardPrice ?? showtime.standardPrice;
    const vipPrice = body.vipPrice ?? showtime.vipPrice;
    const errors = validatePrices({ standardPrice, vipPrice });

    if (invalidId(String(movieId))) errors.movieId = 'Phim không hợp lệ.';
    if (invalidId(String(roomId))) errors.roomId = 'Phòng chiếu không hợp lệ.';
    if (!startTime) errors.startTime = 'Thời gian bắt đầu không hợp lệ.';
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: 'Dữ liệu suất chiếu không hợp lệ.', errors });
    }

    const movie = await Movie.findById(movieId).select('title duration');
    const room = await Room.findById(roomId).select('_id');
    if (!movie) return next(new AppError('Không tìm thấy phim.', 404));
    if (!room) return next(new AppError('Không tìm thấy phòng chiếu.', 404));

    const endTime = new Date(startTime.getTime() + movie.duration * 60_000);
    const overlap = await findOverlap(roomId, startTime, endTime, showtime._id);
    if (overlap) return next(showOverlapError(overlap));

    showtime.set({ movieId, roomId, startTime, endTime, standardPrice, vipPrice });
    await showtime.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật suất chiếu thành công.',
      data: await showtime.populate([
        { path: 'movieId', select: 'title duration posterUrl' },
        { path: 'roomId', select: 'name rows seatsPerRow vipRows' },
      ]),
    });
  } catch (error) {
    return next(error);
  }
};

const deleteShowtime = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return next(new AppError('ID suất chiếu không hợp lệ.', 400));

    const showtime = await Showtime.findById(id);
    if (!showtime) return next(new AppError('Không tìm thấy suất chiếu để xóa.', 404));

    const Booking = mongoose.models.Booking;
    const Ticket = mongoose.models.Ticket;
    const [bookingCount, ticketCount] = await Promise.all([
      Booking ? Booking.countDocuments({ showtimeId: id }) : 0,
      Ticket ? Ticket.countDocuments({ showtimeId: id }) : 0,
    ]);
    if (bookingCount || ticketCount) {
      return next(new AppError('Không thể xóa suất chiếu đã có vé đặt.', 409));
    }

    await showtime.deleteOne();
    return res.status(200).json({
      success: true,
      message: 'Xóa suất chiếu thành công.',
      data: { id },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getShowtimes,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
};
