const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');

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
};
