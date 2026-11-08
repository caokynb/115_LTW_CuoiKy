const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyToken: verifyJwt } = require('../utils/token');

/**
 * Middleware xác thực JWT token (Authentication)
 * Kiểm tra header Authorization: Bearer <token>
 */
const verifyToken = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!', 401)
      );
    }

    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(
          new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', 401)
        );
      }
      return next(
        new AppError('Mã xác thực không hợp lệ. Vui lòng đăng nhập lại!', 401)
      );
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('Tài khoản gắn với mã xác thực này không còn tồn tại!', 401)
      );
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware phân quyền theo vai trò (Authorization)
 * Hỗ trợ truyền vào danh sách các vai trò được phép: requireRole('admin') hoặc requireRole('admin', 'member')
 * @param {...String|Array<String>} roles - Các vai trò được phép truy cập
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!', 401)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền truy cập vào tài nguyên này!', 403)
      );
    }

    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
};
