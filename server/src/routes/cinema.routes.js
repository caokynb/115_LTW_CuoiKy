const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getCinemas,
  getCinemaById,
  createCinema,
  updateCinema,
  deleteCinema,
} = require('../controllers/cinema.controller');

const router = express.Router();

router.get('/', getCinemas);
router.get('/:id', getCinemaById);
router.post('/', verifyToken, requireRole('admin'), createCinema);
router.put('/:id', verifyToken, requireRole('admin'), updateCinema);
router.delete('/:id', verifyToken, requireRole('admin'), deleteCinema);

module.exports = router;
