const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
