const express = require('express');
const {
    getMovies,
    getMovieGenres,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie,
    getTmdbPosters,
} = require('../controllers/movie.controller');
const { getMovieReviews, createMovieReview } = require('../controllers/review.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/movies
 * @desc    Lấy danh sách phim (tìm kiếm, lọc, phân trang)
 * @access  Public
 */
router.get('/', getMovies);

// đặt route /genres và /tmdb/posters trước /:id để tránh bị hiểu nhầm thành id phim
router.get('/genres', getMovieGenres);
router.get('/tmdb/posters', verifyToken, requireRole('admin'), getTmdbPosters);

// Đánh giá phim: xem công khai, gửi đánh giá cần đăng nhập.
router.get('/:id/reviews', getMovieReviews);
router.post('/:id/reviews', verifyToken, createMovieReview);

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
