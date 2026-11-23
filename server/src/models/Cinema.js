const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên rạp là bắt buộc.'],
      trim: true,
      unique: true,
      maxlength: [120, 'Tên rạp không được vượt quá 120 ký tự.'],
    },
    address: {
      type: String,
      required: [true, 'Địa chỉ rạp là bắt buộc.'],
      trim: true,
      maxlength: [250, 'Địa chỉ không được vượt quá 250 ký tự.'],
    },
    hotline: {
      type: String,
      required: [true, 'Hotline là bắt buộc.'],
      trim: true,
      maxlength: [20, 'Hotline không hợp lệ.'],
    },
    rooms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    }],
  },
  { timestamps: true }
);

cinemaSchema.index({ rooms: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Cinema', cinemaSchema);
