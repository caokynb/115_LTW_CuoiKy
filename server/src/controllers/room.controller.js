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

    const hasShowtimes = await Showtime.exists({ room: room._id });
    if (hasShowtimes) {
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
