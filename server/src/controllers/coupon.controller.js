const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');

// kiểm tra điều kiện mã giảm giá và tính số tiền được giảm
const evaluateCoupon = async (rawCode, orderAmount) => {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!code) {
    throw new AppError('Vui lòng nhập mã giảm giá.', 400);
  }

  const amount = Number(orderAmount);
  if (Number.isNaN(amount) || amount < 0) {
    throw new AppError('Tổng tiền đơn hàng không hợp lệ.', 400);
  }

  const coupon = await Coupon.findOne({ code });
  if (!coupon) {
    throw new AppError('Mã giảm giá không tồn tại.', 404);
  }

  if (!coupon.isActive) {
    throw new AppError('Mã giảm giá hiện đang tạm khóa.', 400);
  }

  if (new Date(coupon.expiresAt) <= new Date()) {
    throw new AppError('Mã giảm giá đã hết hạn.', 400);
  }

  if (coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Mã giảm giá đã hết lượt sử dụng.', 400);
  }

  if (amount < (coupon.minOrderAmount || 0)) {
    throw new AppError(
      `Đơn hàng tối thiểu ${Number(coupon.minOrderAmount).toLocaleString('vi-VN')} đ mới áp dụng được mã này.`,
      400
    );
  }

  // tính số tiền giảm dựa trên loại percent hoặc fixed
  let discountAmount = 0;
  if (coupon.discountType === 'percent') {
    discountAmount = Math.round((amount * coupon.discountValue) / 100);
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  // không để tiền giảm vượt quá tổng tiền đơn hàng
  discountAmount = Math.max(0, Math.min(discountAmount, amount));
  const finalAmount = Math.max(0, amount - discountAmount);

  return { coupon, discountAmount, finalAmount };
};

// API kiểm tra mã giảm giá: POST /api/coupons/validate
const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body || {};
    const { coupon, discountAmount, finalAmount } = await evaluateCoupon(code, orderAmount);

    return res.status(200).json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công.',
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalAmount: Number(orderAmount),
        finalAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCoupon,
  evaluateCoupon,
};
