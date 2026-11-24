const express = require('express');
const {
  getSnacks,
  getSnackById,
  createSnack,
  updateSnack,
  deleteSnack,
} = require('../controllers/snack.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// khách và thành viên xem danh sách bắp nước
router.get('/', getSnacks);
router.get('/:id', getSnackById);

// chỉ admin được phép thêm/sửa/xóa combo bắp nước
router.post('/', verifyToken, requireRole('admin'), createSnack);
router.put('/:id', verifyToken, requireRole('admin'), updateSnack);
router.delete('/:id', verifyToken, requireRole('admin'), deleteSnack);

module.exports = router;
