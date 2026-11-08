const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const AppError = require('../utils/AppError');

const router = express.Router();

/**
 * Middleware kiểm tra kết quả validation của express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return next(new AppError(errorMessages.join('. '), 400));
  }
  next();
};

// Validation rules cho POST /api/auth/register
const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Họ và tên không được để trống')
    .isLength({ min: 2, max: 100 })
    .withMessage('Họ và tên phải có độ dài từ 2 đến 100 ký tự'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email không được để trống')
    .isEmail()
    .withMessage('Email không đúng định dạng')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+() -]{8,15}$/)
    .withMessage('Số điện thoại không hợp lệ'),
  validate,
];

// Validation rules cho POST /api/auth/login
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email không được để trống')
    .isEmail()
    .withMessage('Email không đúng định dạng')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),
  validate,
];

// Định nghĩa các route xác thực
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
