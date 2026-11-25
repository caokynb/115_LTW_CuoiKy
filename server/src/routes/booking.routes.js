const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  listBookings,
} = require('../controllers/booking.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

// Tất cả các endpoints đặt vé đều yêu cầu xác thực người dùng (verifyToken)
router.use(verifyToken);

router.post('/', createBooking);
router.get('/', requireAdmin, listBookings);
router.get('/my', getMyBookings);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
