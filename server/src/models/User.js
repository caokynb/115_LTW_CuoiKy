const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ và tên không được để trống'],
      trim: true,
      minlength: [2, 'Họ và tên phải có ít nhất 2 ký tự'],
      maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Email không được để trống'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Email không đúng định dạng',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Mật khẩu không được để trống'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['member', 'admin'],
        message: 'Vai trò chỉ chấp nhận member hoặc admin',
      },
      default: 'member',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Method kiểm tra mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Mật khẩu mã hóa không tồn tại trên đối tượng người dùng');
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method mã hóa mật khẩu
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

module.exports = mongoose.model('User', userSchema);
