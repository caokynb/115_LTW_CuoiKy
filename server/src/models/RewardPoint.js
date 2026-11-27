const mongoose = require('mongoose');

const rewardPointSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Thiếu thông tin người dùng'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Thiếu số điểm'],
    },
    type: {
      type: String,
      enum: {
        values: ['earn', 'redeem', 'refund'],
        message: 'Loại biến động điểm chỉ chấp nhận earn, redeem hoặc refund',
      },
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: [0, 'Số dư điểm không được âm'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RewardPoint', rewardPointSchema);
