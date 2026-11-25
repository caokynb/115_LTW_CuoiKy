const mongoose = require('mongoose');
const Snack = require('../models/Snack');
const AppError = require('../utils/AppError');

const ALLOWED_CATEGORIES = ['combo', 'popcorn', 'drink'];

// kiểm tra dữ liệu đầu vào khi tạo/sửa combo bắp nước
const validateSnackPayload = (body = {}, isUpdate = false) => {
  const { name, price, category } = body;

  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return 'Tên combo bắp nước không được để trống.';
    }
  }

  if (!isUpdate || price !== undefined) {
    const numPrice = Number(price);
    if (price === undefined || price === null || price === '' || Number.isNaN(numPrice) || numPrice < 0) {
      return 'Giá bán phải là số lớn hơn hoặc bằng 0.';
    }
  }

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    return 'Danh mục chỉ chấp nhận combo, popcorn hoặc drink.';
  }

  return null;
};

// lấy danh sách bắp nước (khách chỉ xem món đang bán, admin truyền all=true để xem hết)
const getSnacks = async (req, res, next) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isAvailable: true };
    const snacks = await Snack.find(filter).sort({ category: 1, price: 1, name: 1 });
    return res.status(200).json({
      success: true,
      data: snacks,
    });
  } catch (error) {
    return next(error);
  }
};

// lấy chi tiết một món bắp nước theo id
const getSnackById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('ID combo không hợp lệ.', 400));
    }

    const snack = await Snack.findById(id);
    if (!snack) {
      return next(new AppError('Không tìm thấy combo bắp nước.', 404));
    }

    return res.status(200).json({
      success: true,
      data: snack,
    });
  } catch (error) {
    return next(error);
  }
};

// admin tạo mới combo bắp nước
const createSnack = async (req, res, next) => {
  try {
    const validationError = validateSnackPayload(req.body, false);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { name, description = '', price, imageUrl = '', category = 'combo', isAvailable = true } = req.body;
    const created = await Snack.create({
      name: name.trim(),
      description: String(description || '').trim(),
      price: Number(price),
      imageUrl: String(imageUrl || '').trim(),
      category,
      isAvailable: Boolean(isAvailable),
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo combo bắp nước thành công.',
      data: created,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Tên combo bắp nước này đã tồn tại.', 409));
    }
    return next(error);
  }
};

// admin cập nhật thông tin combo bắp nước
const updateSnack = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('ID combo không hợp lệ.', 400));
    }

    const validationError = validateSnackPayload(req.body, true);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description ?? '').trim();
    if (req.body.price !== undefined) updates.price = Number(req.body.price);
    if (req.body.imageUrl !== undefined) updates.imageUrl = String(req.body.imageUrl ?? '').trim();
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.isAvailable !== undefined) updates.isAvailable = Boolean(req.body.isAvailable);

    const updated = await Snack.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!updated) {
      return next(new AppError('Không tìm thấy combo bắp nước để cập nhật.', 404));
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật combo bắp nước thành công.',
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Tên combo bắp nước này đã tồn tại.', 409));
    }
    return next(error);
  }
};

// admin xóa combo bắp nước
const deleteSnack = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('ID combo không hợp lệ.', 400));
    }

    const deleted = await Snack.findByIdAndDelete(id);
    if (!deleted) {
      return next(new AppError('Không tìm thấy combo bắp nước để xóa.', 404));
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa combo bắp nước thành công.',
      data: { id },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSnacks,
  getSnackById,
  createSnack,
  updateSnack,
  deleteSnack,
};
