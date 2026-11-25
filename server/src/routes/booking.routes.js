const express = require('express');
const {
  createBooking,
  listBookings,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/booking.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Tất cả các endpoints đặt vé đều yêu cầu xác thực người dùng (verifyToken)
router.use(verifyToken);

router.post('/', createBooking);
router.get('/', requireRole('admin'), listBookings);
router.get('/my', getMyBookings);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
