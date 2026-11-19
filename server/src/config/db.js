const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Bỏ qua nếu môi trường không cho phép cấu hình DNS
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[MongoDB] Kết nối thành công tới Host: ${conn.connection.host}`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Error] Kết nối thất bại: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
