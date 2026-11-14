const mongoose = require('mongoose');

const showtimeSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Phim của suất chiếu là bắt buộc.'],
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Phòng chiếu là bắt buộc.'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Thời gian bắt đầu là bắt buộc.'],
    },
    endTime: {
      type: Date,
      required: [true, 'Thời gian kết thúc là bắt buộc.'],
    },
    standardPrice: {
      type: Number,
      required: [true, 'Giá vé thường là bắt buộc.'],
      min: [0, 'Giá vé thường không được âm.'],
    },
    vipPrice: {
      type: Number,
      required: [true, 'Giá vé VIP là bắt buộc.'],
      min: [0, 'Giá vé VIP không được âm.'],
    },
  },
  { timestamps: true }
);

showtimeSchema.index({ roomId: 1, startTime: 1, endTime: 1 });

showtimeSchema.pre('validate', function validateShowtime() {
  if (
    this.startTime instanceof Date &&
    this.endTime instanceof Date &&
    this.endTime <= this.startTime
  ) {
    this.invalidate('endTime', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  }
});

module.exports = mongoose.model('Showtime', showtimeSchema);
