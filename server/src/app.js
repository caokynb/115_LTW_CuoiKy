const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { authLimiter } = require('./middleware/rateLimit');
const AppError = require('./utils/AppError');
const authRouter = require('./routes/auth.routes');
const adminRouter = require('./routes/admin.routes');
const movieRouter = require('./routes/movie.routes');
const userRouter = require('./routes/user.routes');
const roomRouter = require('./routes/room.routes');
const showtimeRouter = require('./routes/showtime.routes');
const bookingRouter = require('./routes/booking.routes');
const statsRouter = require('./routes/stats.routes');
const cinemaRouter = require('./routes/cinema.routes');
const couponRouter = require('./routes/coupon.routes');

const app = express();

// 1. Thêm các HTTP header bảo mật và ẩn X-Powered-By
app.use(helmet());

// 2. Cấu hình CORS theo Whitelist cho phép Client giao tiếp
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép requests không có origin (như Postman, mobile apps, curl) hoặc origin nằm trong whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new AppError('CORS policy: Nguồn truy cập không được phép!', 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// 3. Phân tích dữ liệu JSON và urlencoded từ request body với giới hạn kích thước an toàn (100KB)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Bắt lỗi payload quá kích thước (HTTP 413 Payload Too Large)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Dữ liệu gửi lên vượt quá kích thước cho phép! Giới hạn tối đa là 100KB.',
    });
  }
  return next(err);
});

// Route kiểm tra trạng thái hoạt động của Server
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hệ thống Cinema API đang hoạt động bình thường',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Route kiểm tra middleware lỗi tập trung (dành cho kiểm thử)
app.get('/api/test-error', (req, res, next) => {
  next(new AppError('Đây là lỗi thử nghiệm của hệ thống xử lý lỗi tập trung', 400));
});

// 4. Các Routes nghiệp vụ (Áp dụng rate limiter cho các route xác thực auth)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/movies', movieRouter);
app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/showtimes', showtimeRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/stats', statsRouter);
app.use('/api/cinemas', cinemaRouter);
app.use('/api/coupons', couponRouter);

// Bắt các route không tồn tại (404 Not Found)
app.use(notFound);

// Middleware xử lý lỗi tập trung (Centralized Error Handler)
app.use(errorHandler);

module.exports = app;
