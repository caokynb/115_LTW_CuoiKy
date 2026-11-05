/**
 * Custom Operational Application Error
 * Dùng cho các lỗi nghiệp vụ dự đoán trước được (400, 401, 403, 404, 409, ...)
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
