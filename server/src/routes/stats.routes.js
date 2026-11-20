const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getRevenueByMovie,
  getRevenueByDay,
} = require('../controllers/stats.controller');

const router = express.Router();

router.use(verifyToken, requireRole('admin'));

router.get('/revenue-by-movie', getRevenueByMovie);
router.get('/revenue-by-day', getRevenueByDay);

module.exports = router;
