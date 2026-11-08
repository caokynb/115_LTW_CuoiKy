const AppError = require('../utils/AppError');

// Middleware bắt các route không tồn tại (404)
const notFound = (req, res, next) => {
  next(new AppError(`Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`, 404));
};

// Xử lý lỗi Mongoose CastError (ID sai định dạng ObjectId)
const handleCastErrorDB = (err) => {
  const message = `Giá trị không hợp lệ cho trường ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Xử lý lỗi trùng lặp dữ liệu trong MongoDB (Unique Index - code 11000)
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'dữ liệu';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `Trường '${field}' đã tồn tại giá trị '${value}'. Vui lòng chọn giá trị khác!`;
  const statusCode = field === 'email' ? 400 : 409;
  return new AppError(message, statusCode);
};

// Xử lý lỗi Schema Validation của Mongoose
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Dữ liệu không hợp lệ: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Xử lý lỗi JWT không hợp lệ
const handleJWTError = () =>
  new AppError('Mã xác thực (Token) không hợp lệ. Vui lòng đăng nhập lại!', 401);

// Xử lý lỗi JWT hết hạn
const handleJWTExpiredError = () =>
  new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 401);

// Trả về response lỗi trong môi trường Development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

// Trả về response lỗi trong môi trường Production
const sendErrorProd = (err, res) => {
  // Lỗi nghiệp vụ (Operational error): Trả về thông điệp rõ ràng cho client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // Lỗi lập trình hoặc lỗi chưa xác định từ thư viện: Không để lộ chi tiết
  console.error('[UNEXPECTED ERROR]', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Đã xảy ra sự cố từ máy chủ. Vui lòng thử lại sau!',
  });
};

// Middleware xử lý lỗi tập trung
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Chuyển đổi các lỗi ngoại lệ phổ biến thành AppError chuẩn
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = {
  notFound,
  errorHandler,
};
