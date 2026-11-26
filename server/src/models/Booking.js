const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Thiếu thông tin người đặt vé'],
      index: true,
    },
    showtimeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showtime',
      required: [true, 'Thiếu thông tin suất chiếu'],
      index: true,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Tổng tiền không được để trống'],
      min: [0, 'Tổng tiền không được âm'],
      default: 0,
    },
    originalPrice: {
      type: Number,
      min: [0, 'Giá gốc không được âm'],
      default: 0,
    },
    discountAmount: {
      type: Number,
      min: [0, 'Số tiền giảm không được âm'],
      default: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    snackTotal: {
      type: Number,
      min: [0, 'Tiền bắp nước không được âm'],
      default: 0,
    },
    snacks: [
      {
        snackId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Snack',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled'],
        message: 'Trạng thái đơn đặt vé chỉ chấp nhận pending, confirmed hoặc cancelled',
      },
      default: 'confirmed',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'bookingId',
});

module.exports = mongoose.model('Booking', bookingSchema);
