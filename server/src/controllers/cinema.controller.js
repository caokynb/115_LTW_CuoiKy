const mongoose = require('mongoose');
const Cinema = require('../models/Cinema');
const Room = require('../models/Room');
const AppError = require('../utils/AppError');

const validateRoomIds = async (roomIds = [], cinemaId = null) => {
  if (!Array.isArray(roomIds)) {
    throw new AppError('Danh sách phòng phải là một mảng.', 400);
  }
  if (roomIds.some((id) => !mongoose.isObjectIdOrHexString(id))) {
    throw new AppError('Có mã phòng không hợp lệ.', 400);
  }
  if (new Set(roomIds.map(String)).size !== roomIds.length) {
    throw new AppError('Danh sách phòng không được trùng.', 400);
  }

  const rooms = await Room.find({ _id: { $in: roomIds } }).select('_id cinemaId');
  if (rooms.length !== roomIds.length) {
    throw new AppError('Một hoặc nhiều phòng không tồn tại.', 404);
  }

  const roomFromAnotherCinema = rooms.find((room) =>
    room.cinemaId && String(room.cinemaId) !== String(cinemaId || '')
  );
  if (roomFromAnotherCinema) {
    throw new AppError('Phòng đã được gắn với một cụm rạp khác.', 409);
  }

  if (roomIds.length) {
    const assignedCinema = await Cinema.findOne({
      rooms: { $in: roomIds },
      ...(cinemaId ? { _id: { $ne: cinemaId } } : {}),
    }).select('name');
    if (assignedCinema) {
      throw new AppError(`Phòng đã thuộc cụm rạp ${assignedCinema.name}.`, 409);
    }
  }
};

const getCinemas = async (req, res, next) => {
  try {
    const cinemas = await Cinema.find()
      .populate('rooms', 'name rows seatsPerRow vipRows')
      .sort({ name: 1 });
    return res.status(200).json({ success: true, data: cinemas });
  } catch (error) {
    return next(error);
  }
};

const getCinemaById = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return next(new AppError('Mã cụm rạp không hợp lệ.', 400));
    }
    const cinema = await Cinema.findById(req.params.id)
      .populate('rooms', 'name rows seatsPerRow vipRows');
    if (!cinema) return next(new AppError('Không tìm thấy cụm rạp.', 404));
    return res.status(200).json({ success: true, data: cinema });
  } catch (error) {
    return next(error);
  }
};

const createCinema = async (req, res, next) => {
  try {
    const { name, address, hotline, rooms = [] } = req.body || {};
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof address !== 'string' || !address.trim() ||
      typeof hotline !== 'string' || !hotline.trim()
    ) {
      return next(new AppError('Tên rạp, địa chỉ và hotline là bắt buộc.', 400));
    }
    await validateRoomIds(rooms);
    const cinema = await Cinema.create({ name, address, hotline, rooms });
    if (rooms.length) await Room.updateMany({ _id: { $in: rooms } }, { $set: { cinemaId: cinema._id } });
    return res.status(201).json({ success: true, data: cinema });
  } catch (error) {
    return next(error);
  }
};

const updateCinema = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return next(new AppError('Mã cụm rạp không hợp lệ.', 400));
    }
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) return next(new AppError('Không tìm thấy cụm rạp.', 404));

    const { name, address, hotline, rooms } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) return next(new AppError('Tên rạp không được để trống.', 400));
    if (address !== undefined && (typeof address !== 'string' || !address.trim())) return next(new AppError('Địa chỉ không được để trống.', 400));
    if (hotline !== undefined && (typeof hotline !== 'string' || !hotline.trim())) return next(new AppError('Hotline không được để trống.', 400));
    if (rooms !== undefined) await validateRoomIds(rooms, cinema._id);

    if (name !== undefined) cinema.name = name;
    if (address !== undefined) cinema.address = address;
    if (hotline !== undefined) cinema.hotline = hotline;
    if (rooms !== undefined) {
      const previousRoomIds = cinema.rooms.map(String);
      const nextRoomIds = rooms.map(String);
      const removedRoomIds = previousRoomIds.filter((id) => !nextRoomIds.includes(id));
      if (removedRoomIds.length) {
        await Room.updateMany(
          { _id: { $in: removedRoomIds }, cinemaId: cinema._id },
          { $set: { cinemaId: null } }
        );
      }
      cinema.rooms = rooms;
    }
    await cinema.save();
    if (rooms !== undefined && rooms.length) {
      await Room.updateMany({ _id: { $in: rooms } }, { $set: { cinemaId: cinema._id } });
    }
    return res.status(200).json({ success: true, data: cinema });
  } catch (error) {
    return next(error);
  }
};

const deleteCinema = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return next(new AppError('Mã cụm rạp không hợp lệ.', 400));
    }
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) return next(new AppError('Không tìm thấy cụm rạp.', 404));
    if (cinema.rooms.length) {
      return next(new AppError('Hãy chuyển phòng khỏi cụm rạp trước khi xóa.', 409));
    }
    await cinema.deleteOne();
    return res.status(200).json({ success: true, message: 'Đã xóa cụm rạp.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getCinemas, getCinemaById, createCinema, updateCinema, deleteCinema };
