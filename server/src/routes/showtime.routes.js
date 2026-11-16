const express = require('express');
const {
  getShowtimes,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
} = require('../controllers/showtime.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Khách và thành viên được xem lịch chiếu; thao tác quản lý chỉ dành cho admin.
router.get('/', getShowtimes);
router.get('/:id', getShowtimeById);
router.post('/', verifyToken, requireRole('admin'), createShowtime);
router.put('/:id', verifyToken, requireRole('admin'), updateShowtime);
router.delete('/:id', verifyToken, requireRole('admin'), deleteShowtime);

module.exports = router;
