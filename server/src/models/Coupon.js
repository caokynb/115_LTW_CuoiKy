const mongoose = require('mongoose');

// schema lưu thông tin mã giảm giá
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã giảm giá không được để trống'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: {
        values: ['percent', 'fixed'],
        message: 'Loại giảm giá chỉ chấp nhận percent hoặc fixed',
      },
      default: 'percent',
    },
    discountValue: {
      type: Number,
      required: [true, 'Giá trị giảm không được để trống'],
      min: [0, 'Giá trị giảm không được âm'],
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, 'Mức giảm tối đa không được âm'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Giá trị đơn tối thiểu không được âm'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Ngày hết hạn không được để trống'],
    },
    maxUses: {
      type: Number,
      required: [true, 'Số lượt dùng tối đa không được để trống'],
      min: [1, 'Số lượt dùng tối đa phải lớn hơn 0'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Số lượt đã dùng không được âm'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
