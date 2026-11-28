const Room = require('../models/Room');
const AppError = require('../utils/AppError');

const getRoomFields = (body) => {
  const allowedFields = ['name', 'rows', 'seatsPerRow', 'vipRows'];
  return Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]])
  );
};

const getRoomRestrictions = async (roomId) => {
  const Showtime = getShowtimeModel();
  if (!Showtime) {
    throw new AppError('Chưa thể kiểm tra suất chiếu vì model Showtime chưa sẵn sàng', 503);
  }

  const showtimes = await Showtime.find({ roomId }).select('_id startTime').lean();
  const showtimeIds = showtimes.map((showtime) => showtime._id);
  const [hasTickets, hasPastShowtime] = await Promise.all([
    showtimeIds.length
      ? require('../models/Ticket').exists({ showtimeId: { $in: showtimeIds } })
      : false,
    showtimes.some((showtime) => new Date(showtime.startTime) <= new Date()),
  ]);
  return { hasTickets: Boolean(hasTickets), hasPastShowtime };
};

const getShowtimeModel = () => {
  try {
    return require('../models/Showtime');
  } catch (error) {
    const isMissingShowtimeModel =
      error.code === 'MODULE_NOT_FOUND' &&
      error.message.includes('../models/Showtime');

    if (isMissingShowtimeModel) {
      return null;
    }

    throw error;
  }
};

exports.createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(getRoomFields(req.body));
    return res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return next(new AppError('Không tìm thấy phòng này', 404));
    }

    return res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return next(new AppError('Không tìm thấy phòng này', 404));
    }

    const restrictions = await getRoomRestrictions(room._id);
    if (restrictions.hasTickets || restrictions.hasPastShowtime) {
      return next(new AppError('Không thể sửa phòng đã có vé đặt hoặc suất chiếu đã qua.', 409));
    }

    Object.assign(room, getRoomFields(req.body));
    await room.save();

    return res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return next(new AppError('Không tìm thấy phòng này', 404));
    }

    const Showtime = getShowtimeModel();
    if (!Showtime) {
      return next(
        new AppError('Chưa thể kiểm tra suất chiếu vì model Showtime chưa sẵn sàng', 503)
      );
    }

    const showtimes = await Showtime.find({ roomId: room._id }).select('_id startTime').lean();
    const showtimeIds = showtimes.map((showtime) => showtime._id);
    const hasTickets = showtimeIds.length
      ? await require('../models/Ticket').exists({ showtimeId: { $in: showtimeIds } })
      : false;
    const hasPastShowtime = showtimes.some((showtime) => new Date(showtime.startTime) <= new Date());
    if (showtimes.length || hasTickets || hasPastShowtime) {
      return next(new AppError('Không thể xóa phòng đang có suất chiếu', 409));
    }

    await room.deleteOne();
    return res.status(200).json({
      success: true,
      message: 'Xóa phòng thành công',
    });
  } catch (error) {
    return next(error);
  }
};
