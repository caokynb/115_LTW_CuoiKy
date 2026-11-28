const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    cinemaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cinema',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên phòng không được để trống'],
      unique: true,
      trim: true,
    },
    rows: {
      type: Number,
      required: [true, 'Nhập tổng số hàng ghế'],
      min: [5, 'Số hàng ghế tối thiểu là 5'],
      max: [50, 'Số hàng ghế tối đa là 50'],
      validate: {
        validator: Number.isInteger,
        message: 'Số hàng ghế phải là số nguyên',
      },
    },
    seatsPerRow: {
      type: Number,
      required: [true, 'Nhập số ghế trên mỗi hàng'],
      min: [5, 'Số ghế mỗi hàng tối thiểu là 5'],
      max: [50, 'Số ghế mỗi hàng tối đa là 50'],
      validate: {
        validator: Number.isInteger,
        message: 'Số ghế mỗi hàng phải là số nguyên',
      },
    },
    vipRows: {
      type: [Number],
      default: [],
      validate: [
        {
          validator: (rows) => rows.every(Number.isInteger),
          message: 'Các hàng VIP phải là số nguyên',
        },
        {
          validator: (rows) => new Set(rows).size === rows.length,
          message: 'Hàng VIP không được trùng nhau',
        },
        {
          validator: function (rows) {
            return rows.every((row) => row >= 1 && row <= this.rows);
          },
          message: 'Hàng VIP phải nằm trong phạm vi hàng ghế của phòng',
        },
      ],
    },
    disabledSeats: {
      type: [{ row: { type: String, trim: true, uppercase: true, required: true }, number: { type: Number, min: 1, required: true } }],
      default: [],
      validate: [
        {
          validator: function (seats) {
            return seats.every((seat) => {
              const rowIndex = String(seat.row).charCodeAt(0) - 64;
              return /^[A-Z]$/.test(seat.row) && rowIndex >= 1 && rowIndex <= this.rows && seat.number >= 1 && seat.number <= this.seatsPerRow;
            });
          },
          message: 'Ghế khóa phải nằm trong phạm vi hàng và ghế của phòng.',
        },
        {
          validator: (seats) => new Set(seats.map((seat) => `${seat.row}-${seat.number}`)).size === seats.length,
          message: 'Danh sách ghế khóa không được trùng.',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
