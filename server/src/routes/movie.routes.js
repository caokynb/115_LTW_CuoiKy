const express = require('express');
const {
    getMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie,
} = require('../controllers/movie.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/movies
 * @desc    Lấy danh sách phim (tìm kiếm, lọc, phân trang)
 * @access  Public
 */
router.get('/', getMovies);

/**
 * @route   GET /api/movies/:id
 * @desc    Lấy chi tiết phim theo ID
 * @access  Public
 */
router.get('/:id', getMovieById);

/**
 * @route   POST /api/movies
 * @desc    Tạo mới một bộ phim
 * @access  Private (Chỉ dành cho Admin)
 */
router.post('/', verifyToken, requireRole('admin'), createMovie);

/**
 * @route   PUT /api/movies/:id
 * @desc    Cập nhật thông tin phim theo ID
 * @access  Private (Chỉ dành cho Admin)
 */
router.put('/:id', verifyToken, requireRole('admin'), updateMovie);

/**
 * @route   DELETE /api/movies/:id
 * @desc    Xóa phim theo ID
 * @access  Private (Chỉ dành cho Admin)
 */
router.delete('/:id', verifyToken, requireRole('admin'), deleteMovie);

module.exports = router;
