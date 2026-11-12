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
    status: {
      type: String,
      enum: {
        values: ['confirmed', 'cancelled'],
        message: 'Trạng thái đơn đặt vé chỉ chấp nhận confirmed hoặc cancelled',
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
