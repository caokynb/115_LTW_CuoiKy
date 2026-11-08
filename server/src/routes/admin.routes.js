const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Áp dụng xác thực và kiểm tra vai trò admin cho tất cả route admin
router.use(verifyToken, requireRole('admin'));

/**
 * @route   GET /api/admin/ping
 * @desc    Route thử nghiệm kiểm tra phân quyền vai trò admin (Task K04)
 * @access  Private (Chỉ dành cho Admin)
 */
router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin route ping thành công',
    data: {
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
