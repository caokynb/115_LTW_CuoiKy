const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Số sao phải là số nguyên.' },
    },
    comment: {
      type: String,
      required: [true, 'Nhận xét không được để trống.'],
      trim: true,
      minlength: [3, 'Nhận xét cần ít nhất 3 ký tự.'],
      maxlength: [1000, 'Nhận xét không được vượt quá 1000 ký tự.'],
    },
  },
  { timestamps: true }
);

reviewSchema.index({ movieId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ movieId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
