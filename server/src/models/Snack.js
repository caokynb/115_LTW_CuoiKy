const mongoose = require('mongoose');

// schema lưu danh sách bắp nước và combo F&B
const snackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên combo bắp nước không được để trống'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Giá bán không được để trống'],
      min: [0, 'Giá bán không được âm'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: {
        values: ['combo', 'popcorn', 'drink'],
        message: 'Danh mục chỉ chấp nhận combo, popcorn hoặc drink',
      },
      default: 'combo',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Snack', snackSchema);
