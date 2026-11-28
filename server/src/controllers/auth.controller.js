const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
let resetMailer;

const getResetMailer = () => {
  if (resetMailer) return resetMailer;
  resetMailer = process.env.SMTP_HOST && process.env.SMTP_USER
    ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    : nodemailer.createTransport({ jsonTransport: true });
  return resetMailer;
};

/**
 * Xử lý làm sạch đối tượng User trước khi trả về Client
 * Đảm bảo 100% không để lộ trường passwordHash
 * @param {Object} userDoc
 * @returns {Object}
 */
const sanitizeUser = (userDoc) => {
  const userObj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.passwordHash;
  delete userObj.__v;
  return userObj;
};

/**
 * Đăng ký tài khoản mới (POST /api/auth/register)
 */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;

    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    // Kiểm tra trùng lặp email (DoD: Đăng ký trùng email trả 400)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return next(
        new AppError('Email này đã được sử dụng. Vui lòng chọn email khác!', 400)
      );
    }

    // Mã hóa mật khẩu bằng bcrypt
    const passwordHash = await User.hashPassword(password);

    // Tạo người dùng mới với vai trò mặc định là 'member'
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone ? phone.trim() : '',
      role: 'member',
    });

    // Tạo JWT token với payload chỉ chứa id và role
    const token = signToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: {
        token,
        user: sanitizeUser(newUser),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Đăng nhập tài khoản (POST /api/auth/login)
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError('Vui lòng cung cấp đầy đủ email và mật khẩu!', 400)
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Tìm kiếm user và lấy kèm trường passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash'
    );

    // Kiểm tra sự tồn tại của người dùng
    if (!user) {
      return next(
        new AppError('Email hoặc mật khẩu không chính xác!', 401)
      );
    }

    if (!user.isActive) return next(new AppError('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403));

    // So sánh mật khẩu bằng bcrypt (DoD: sai mật khẩu trả 401)
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return next(
        new AppError('Email hoặc mật khẩu không chính xác!', 401)
      );
    }

    // Tạo JWT token với payload chỉ chứa id và role
    const token = signToken(user);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim();
      const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;
      await getResetMailer().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@cinehub.local',
        to: user.email,
        subject: 'Đặt lại mật khẩu CineHub',
        text: `Mở liên kết sau để đặt lại mật khẩu (có hiệu lực trong 15 phút): ${resetUrl}`,
      });
    }
    res.status(200).json({ success: true, message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true,
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) return next(new AppError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 400));

    user.passwordHash = await User.hashPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.tokenVersion = (Number(user.tokenVersion) || 0) + 1;
    await user.save();
    res.status(200).json({ success: true, message: 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy thông tin tài khoản hiện tại từ JWT token (GET /api/auth/me)
 */
const getMe = async (req, res, next) => {
  try {
    // req.user đã được gán bởi middleware verifyToken
    res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
};
