const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const authRouter = require('./routes/auth.routes');
const adminRouter = require('./routes/admin.routes');
const movieRouter = require('./routes/movie.routes');

const app = express();

// Cấu hình CORS cho phép Client giao tiếp
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Phân tích dữ liệu JSON và urlencoded từ request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/movies', movieRouter);

// Bắt các route không tồn tại (404 Not Found)
app.use(notFound);

// Middleware xử lý lỗi tập trung (Centralized Error Handler)
app.use(errorHandler);

module.exports = app;
