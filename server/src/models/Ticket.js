const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Thiếu thông tin đơn đặt vé'],
      index: true,
    },
    showtimeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showtime',
      required: [true, 'Thiếu thông tin suất chiếu'],
    },
    row: {
      type: String,
      required: [true, 'Thiếu hàng ghế'],
      trim: true,
      uppercase: true,
    },
    number: {
      type: Number,
      required: [true, 'Thiếu số ghế'],
      min: [1, 'Số ghế phải lớn hơn 0'],
      validate: {
        validator: Number.isInteger,
        message: 'Số ghế phải là số nguyên',
      },
    },
    seatType: {
      type: String,
      enum: {
        values: ['standard', 'vip'],
        message: 'Loại ghế chỉ chấp nhận standard hoặc vip',
      },
      default: 'standard',
    },
    price: {
      type: Number,
      min: [0, 'Giá vé không được âm'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'cancelled'],
        message: 'Trạng thái vé chỉ chấp nhận active hoặc cancelled',
      },
      default: 'active',
    },
  },
  { timestamps: true }
);

// Unique partial index chống đặt trùng ghế khi vé đang ở trạng thái active
ticketSchema.index(
  { showtimeId: 1, row: 1, number: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
