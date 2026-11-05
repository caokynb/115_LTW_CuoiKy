const path = require('path');
const dotenv = require('dotenv');

// Nạp biến môi trường từ server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');

// Kết nối cơ sở dữ liệu MongoDB Atlas
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Đang chạy tại cổng ${PORT} trong môi trường ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] URL kiểm tra: http://localhost:${PORT}/api/health`);
});

// Xử lý lỗi không đồng bộ chưa được bắt (Unhandled Rejections)
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection] Đang tắt máy chủ do lỗi nghiêm trọng:', err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Xử lý lỗi đồng bộ chưa được bắt (Uncaught Exceptions)
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception] Lỗi nghiêm trọng:', err.name, err.message);
  process.exit(1);
});
