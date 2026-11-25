const express = require('express');
const { validateCoupon } = require('../controllers/coupon.controller');

const router = express.Router();

// kiểm tra và tính tiền giảm theo mã coupon
router.post('/validate', validateCoupon);

module.exports = router;
