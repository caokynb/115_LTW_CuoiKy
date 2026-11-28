const express = require('express');
const {
  validateCoupon,
  getAvailableCoupons,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} = require('../controllers/coupon.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// kiểm tra và tính tiền giảm theo mã coupon
router.post('/validate', validateCoupon);
router.get('/available', verifyToken, getAvailableCoupons);

// các API quản trị voucher yêu cầu đăng nhập và quyền admin
router.get('/', verifyToken, requireRole('admin'), getAllCoupons);
router.post('/', verifyToken, requireRole('admin'), createCoupon);
router.put('/:id', verifyToken, requireRole('admin'), updateCoupon);
router.patch('/:id/toggle', verifyToken, requireRole('admin'), toggleCouponStatus);
router.delete('/:id', verifyToken, requireRole('admin'), deleteCoupon);

module.exports = router;
