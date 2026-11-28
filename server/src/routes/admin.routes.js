const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const router = express.Router();

// Áp dụng xác thực và kiểm tra vai trò admin cho tất cả route admin
router.use(verifyToken, requireRole('admin'));

/**
 * @route   GET /api/admin/ping
 * @desc    Route thử nghiệm kiểm tra phân quyền vai trò admin (Task K04)
 * @access  Private (Chỉ dành cho Admin)
 */
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin route ping thành công',
    data: {
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || '').trim().slice(0, 80);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = search ? { $or: [
      { fullName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).select('fullName email role isActive rewardPoints createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users, page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new AppError('Tài khoản không hợp lệ.', 400));
    if (!['member', 'admin'].includes(req.body.role)) return next(new AppError('Vai trò không hợp lệ.', 400));
    if (String(req.user._id) === id) {
      if (req.body.role !== req.user.role) return next(new AppError('Không thể tự thay đổi vai trò của mình.', 400));
      const currentUser = await User.findById(id).select('fullName email role isActive rewardPoints createdAt');
      if (!currentUser) return next(new AppError('Không tìm thấy tài khoản.', 404));
      return res.json({ success: true, data: { user: currentUser } });
    }
    const user = await User.findByIdAndUpdate(id, { $set: { role: req.body.role }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true }).select('fullName email role isActive rewardPoints createdAt');
    if (!user) return next(new AppError('Không tìm thấy tài khoản.', 404));
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new AppError('Tài khoản không hợp lệ.', 400));
    if (String(req.user._id) === id) return next(new AppError('Không thể tự khóa tài khoản đang sử dụng.', 400));
    if (typeof req.body.isActive !== 'boolean') return next(new AppError('Trạng thái tài khoản không hợp lệ.', 400));
    const user = await User.findByIdAndUpdate(id, { $set: { isActive: req.body.isActive }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true }).select('fullName email role isActive rewardPoints createdAt');
    if (!user) return next(new AppError('Không tìm thấy tài khoản.', 404));
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

module.exports = router;
