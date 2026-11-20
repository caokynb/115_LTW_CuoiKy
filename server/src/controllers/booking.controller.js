import mongoose from 'mongoose';
import Booking from '../models/booking.model.js';

const ALLOWED_SORT = ['createdAt', 'status'];

const withDetails = (query) =>
  query
    .populate({ path: 'showtime', populate: [{ path: 'movie' }, { path: 'room' }] })
    .populate('seats');

export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    const booking = await withDetails(Booking.findById(id));
    if (!booking) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xem vé này' });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const listBookings = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin được xem danh sách vé' });
    }

    const filter = {};

    if (req.query.status) {
      const statuses = String(req.query.status)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }

    const range = {};
    if (req.query.from) {
      const d = new Date(req.query.from);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'from không hợp lệ' });
      range.$gte = d;
    }
    if (req.query.to) {
      const d = new Date(req.query.to);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'to không hợp lệ' });
      range.$lte = d;
    }
    if (Object.keys(range).length) filter.createdAt = range;

    const sortParam = String(req.query.sort || '-createdAt');
    const desc = sortParam.startsWith('-');
    const field = desc ? sortParam.slice(1) : sortParam;
    if (!ALLOWED_SORT.includes(field)) {
      return res.status(400).json({ message: 'sort không hợp lệ' });
    }
    const sort = { [field]: desc ? -1 : 1, _id: -1 };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const [data, total] = await Promise.all([
      withDetails(Booking.find(filter))
        .populate('user', 'name email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};