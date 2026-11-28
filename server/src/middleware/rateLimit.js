const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

/**
 * Giới hạn số lần thử đăng nhập/xác thực sai:
 * Tối đa 10 lần thất bại trong 15 phút.
 * Bỏ qua các request thành công (skipSuccessfulRequests: true).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  // bỏ qua GET /api/auth/me để reload trang liên tục không bị cộng dồn khóa 429
  skip: (req) =>
    req.method === 'GET' &&
    (req.path === '/me' || String(req.originalUrl || '').split('?')[0] === '/api/auth/me'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    return next(
      new AppError('Bạn đã thử đăng nhập sai quá 10 lần. Vui lòng thử lại sau 15 phút!', 429)
    );
  },
});

module.exports = { authLimiter };
