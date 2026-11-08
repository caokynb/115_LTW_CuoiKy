const jwt = require('jsonwebtoken');

/**
 * Ký tạo JWT token
 * Payload chỉ bao gồm id và role theo đúng quy chuẩn barem N9 & yêu cầu K03
 * @param {Object} user - User document hoặc object có _id (hoặc id) và role
 * @returns {String} token
 */
const signToken = (user) => {
  const userId = user._id ? user._id.toString() : user.id;
  return jwt.sign(
    {
      id: userId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Xác thực và giải mã JWT token
 * @param {String} token
 * @returns {Object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken,
};
