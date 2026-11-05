const mongoose = require('mongoose');

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
