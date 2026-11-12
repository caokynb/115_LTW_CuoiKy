const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const AppError = require('../utils/AppError');

const router = express.Router();

const sanitizeUser = (userDoc) => {
  const userObj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.passwordHash;
  delete userObj.__v;
  return userObj;
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return next(new AppError(messages.join('. '), 400));
  }
  return next();
};

const updateMeValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ và tên phải có độ dài từ 2 đến 100 ký tự'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+() -]{8,15}$/)
    .withMessage('Số điện thoại không hợp lệ'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
  validate,
];

router.use(verifyToken);

/**
 * GET /api/users/me
 * Lấy thông tin hồ sơ người dùng đang đăng nhập
 */
router.get('/me', async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/users/me
 * Cập nhật tên hiển thị, số điện thoại và/hoặc đổi mật khẩu
 */
router.put('/me', updateMeValidation, async (req, res, next) => {
  try {
    const { fullName, phone, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return next(new AppError('Không tìm thấy tài khoản người dùng!', 404));
    }

    if (fullName !== undefined) {
      user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      user.phone = typeof phone === 'string' ? phone.trim() : '';
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) {
        return next(new AppError('Vui lòng nhập mật khẩu hiện tại!', 400));
      }

      const isCurrentValid = await user.comparePassword(currentPassword);
      if (!isCurrentValid) {
        return next(new AppError('Mật khẩu hiện tại không chính xác!', 400));
      }

      user.passwordHash = await User.hashPassword(newPassword);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
