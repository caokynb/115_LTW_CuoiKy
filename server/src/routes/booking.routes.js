const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
} = require('../controllers/booking.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Tất cả các endpoints đặt vé đều yêu cầu xác thực người dùng (verifyToken)
router.use(verifyToken);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);

module.exports = router;
