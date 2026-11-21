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

const app = express();

// Thêm các HTTP header bảo mật (đồng thời ẩn X-Powered-By)
app.use(helmet());

// CORS theo whitelist: CORS_ORIGINS có thể gồm nhiều origin cách nhau bằng dấu phẩy,
// nếu không khai báo thì dùng CLIENT_URL như trước đây.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  // Request không có Origin (Postman, curl, server-to-server) được cho qua;
  // trình duyệt chỉ được phép nếu origin nằm trong whitelist.
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Phân tích dữ liệu JSON và urlencoded từ request body (giới hạn kích thước)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Body vượt giới hạn -> 413 (nếu không, errorHandler sẽ trả 500 ở môi trường production)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Dữ liệu gửi lên vượt quá kích thước cho phép! Giới hạn tối đa là 100KB.',
    });
  }
  next(err);
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

// Các Routes nghiệp vụ
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/movies', movieRouter);
app.use('/api/users', userRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/showtimes', showtimeRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/stats', statsRouter); // Dashboard.jsx gọi /stats/revenue-by-movie và /stats/revenue-by-day

// Bắt các route không tồn tại (404 Not Found)
app.use(notFound);

// Middleware xử lý lỗi tập trung (Centralized Error Handler)
app.use(errorHandler);

module.exports = app;