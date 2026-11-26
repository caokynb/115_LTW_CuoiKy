const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');

// chuẩn hóa và kiểm tra dữ liệu đầu vào khi tạo hoặc cập nhật voucher
const parseCouponPayload = (body = {}, { isUpdate = false } = {}) => {
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) {
    throw new AppError('Mã giảm giá không được để trống.', 400);
  }
  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    throw new AppError('Mã giảm giá chỉ gồm chữ, số, dấu gạch ngang/gạch dưới (2–32 ký tự).', 400);
  }

  const discountType = body.discountType || 'percent';
  if (!['percent', 'fixed'].includes(discountType)) {
    throw new AppError('Loại giảm giá chỉ chấp nhận percent hoặc fixed.', 400);
  }

  const discountValue = Number(body.discountValue);
  if (Number.isNaN(discountValue) || discountValue <= 0) {
    throw new AppError('Giá trị giảm phải lớn hơn 0.', 400);
  }
  if (discountType === 'percent' && discountValue > 100) {
    throw new AppError('Phần trăm giảm giá không được vượt quá 100%.', 400);
  }

  let maxDiscount = null;
  if (discountType === 'percent' && body.maxDiscount !== null && body.maxDiscount !== undefined && body.maxDiscount !== '') {
    maxDiscount = Number(body.maxDiscount);
    if (Number.isNaN(maxDiscount) || maxDiscount < 0) {
      throw new AppError('Mức giảm tối đa không hợp lệ.', 400);
    }
  }

  const minOrderAmount =
    body.minOrderAmount !== undefined && body.minOrderAmount !== '' ? Number(body.minOrderAmount) : 0;
  if (Number.isNaN(minOrderAmount) || minOrderAmount < 0) {
    throw new AppError('Giá trị đơn tối thiểu không hợp lệ.', 400);
  }

  const maxUses = Number(body.maxUses);
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    throw new AppError('Số lượt dùng tối đa phải là số nguyên lớn hơn 0.', 400);
  }

  if (!body.expiresAt) {
    throw new AppError('Ngày hết hạn không được để trống.', 400);
  }
  const expiresAt = new Date(body.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new AppError('Ngày hết hạn không hợp lệ.', 400);
  }
  if (!isUpdate && expiresAt <= new Date()) {
    throw new AppError('Ngày hết hạn phải ở trong tương lai.', 400);
  }

  return {
    code,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    discountType,
    discountValue,
    maxDiscount,
    minOrderAmount,
    expiresAt,
    maxUses,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };
};

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

// Lấy danh sách mã giảm giá cho Admin: GET /api/coupons
const getAllCoupons = async (req, res, next) => {
  try {
    const { search = '', status = 'all' } = req.query;
    const filter = {};

    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ code: regex }, { description: regex }];
    }

    const now = new Date();
    if (status === 'active') {
      filter.isActive = true;
      filter.expiresAt = { $gt: now };
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else if (status === 'expired') {
      filter.expiresAt = { $lte: now };
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    return next(error);
  }
};

// Tạo mã giảm giá mới: POST /api/coupons
const createCoupon = async (req, res, next) => {
  try {
    const payload = parseCouponPayload(req.body, { isUpdate: false });
    const existing = await Coupon.findOne({ code: payload.code });
    if (existing) {
      throw new AppError('Mã giảm giá này đã tồn tại.', 409);
    }

    const coupon = await Coupon.create(payload);
    return res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công.',
      data: coupon,
    });
  } catch (error) {
    return next(error);
  }
};

// Cập nhật thông tin mã giảm giá: PUT /api/coupons/:id
const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID mã giảm giá không hợp lệ.', 400);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá.', 404);
    }

    const payload = parseCouponPayload(req.body, { isUpdate: true });
    if (payload.code !== coupon.code) {
      const duplicate = await Coupon.findOne({ code: payload.code, _id: { $ne: id } });
      if (duplicate) {
        throw new AppError('Mã giảm giá này đã tồn tại.', 409);
      }
    }

    Object.assign(coupon, payload);
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật mã giảm giá thành công.',
      data: coupon,
    });
  } catch (error) {
    return next(error);
  }
};

// Khóa / mở khóa nhanh trạng thái mã giảm giá: PATCH /api/coupons/:id/toggle
const toggleCouponStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID mã giảm giá không hợp lệ.', 400);
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá.', 404);
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: coupon.isActive ? 'Đã kích hoạt mã giảm giá.' : 'Đã khóa mã giảm giá.',
      data: coupon,
    });
  } catch (error) {
    return next(error);
  }
};

// Xóa mã giảm giá: DELETE /api/coupons/:id
const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID mã giảm giá không hợp lệ.', 400);
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw new AppError('Không tìm thấy mã giảm giá.', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa mã giảm giá thành công.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  validateCoupon,
  evaluateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
};
