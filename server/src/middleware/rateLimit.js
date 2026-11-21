const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new AppError('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút!', 429)),
});

module.exports = { authLimiter };