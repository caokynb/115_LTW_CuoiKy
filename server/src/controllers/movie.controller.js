const Movie = require('../models/Movie');
const { validateMovieInput } = require('../validators/movie.validator');
const AppError = require('../utils/AppError');

/**
 * @route   GET /api/movies
 * @desc    Lấy danh sách phim có phân trang, tìm kiếm theo tên và lọc theo thể loại, trạng thái, ngày chiếu
 * @access  Public
 */
const getMovies = async (req, res, next) => {
    try {
        const {
            q,
            genre,
            status,
            date,
            releaseDate,
            fromDate,
            toDate,
            page = 1,
            limit = 8,
        } = req.query;

        const query = {};

        // 1. Tìm kiếm theo tên phim ($regex không phân biệt hoa thường, đã escape ký tự đặc biệt)
        if (q && q.trim() !== '') {
            const sanitizedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.title = { $regex: sanitizedQ, $options: 'i' };
        }

        // 2. Lọc theo thể loại ($in mảng genres)
        if (genre && genre.trim() !== '') {
            query.genres = { $in: [genre.trim()] };
        }

        // 3. Lọc theo trạng thái ('now_showing' hoặc 'coming_soon')
        if (status && status.trim() !== '') {
            query.status = status.trim();
        }

        // 4. Lọc theo ngày chiếu (releaseDate)
        const targetDate = date || releaseDate;
        if (targetDate && !isNaN(Date.parse(targetDate))) {
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.releaseDate = { $gte: startOfDay, $lte: endOfDay };
        } else if (fromDate || toDate) {
            query.releaseDate = {};
            if (fromDate && !isNaN(Date.parse(fromDate))) {
                query.releaseDate.$gte = new Date(fromDate);
            }
            if (toDate && !isNaN(Date.parse(toDate))) {
                query.releaseDate.$lte = new Date(toDate);
            }
        }

        // 5. Phân trang
        const currentPage = Math.max(1, parseInt(page, 10) || 1);
        const limitPerPage = Math.max(1, parseInt(limit, 10) || 8);
        const skip = (currentPage - 1) * limitPerPage;

        // Chạy song song 2 truy vấn lấy dữ liệu và tổng số lượng
        const [movies, total] = await Promise.all([
            Movie.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitPerPage),
            Movie.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: movies,
            total,
            page: currentPage,
            pages: Math.ceil(total / limitPerPage) || 1,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/movies/:id
 * @desc    Lấy chi tiết một bộ phim theo ID
 * @access  Public
 */
const getMovieById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const movie = await Movie.findById(id);

        if (!movie) {
            return next(new AppError('Không tìm thấy phim với ID này!', 404));
        }

        return res.status(200).json({
            success: true,
            data: movie,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/movies
 * @desc    Tạo mới một bộ phim
 * @access  Private (Chỉ dành cho Admin)
 */
const createMovie = async (req, res, next) => {
    try {
        const { isValid, errors } = validateMovieInput(req.body, false);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu đầu vào không hợp lệ!',
                errors,
            });
        }

        const movieData = { ...req.body };
        // Chuẩn hóa posterUrl nếu client gửi posterURL
        if (movieData.posterURL && !movieData.posterUrl) {
            movieData.posterUrl = movieData.posterURL;
        }

        const newMovie = await Movie.create(movieData);
        return res.status(201).json({
            success: true,
            message: 'Tạo phim mới thành công.',
            data: newMovie,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   PUT /api/movies/:id
 * @desc    Cập nhật thông tin bộ phim theo ID
 * @access  Private (Chỉ dành cho Admin)
 */
const updateMovie = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { isValid, errors } = validateMovieInput(req.body, true);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu cập nhật không hợp lệ!',
                errors,
            });
        }

        const movieData = { ...req.body };
        if (movieData.posterURL && !movieData.posterUrl) {
            movieData.posterUrl = movieData.posterURL;
        }

        const updatedMovie = await Movie.findByIdAndUpdate(id, movieData, {
            returnDocument: 'after',
            runValidators: true,
        });

        if (!updatedMovie) {
            return next(new AppError('Không tìm thấy phim để cập nhật!', 404));
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật phim thành công.',
            data: updatedMovie,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @route   DELETE /api/movies/:id
 * @desc    Xóa bộ phim theo ID
 * @access  Private (Chỉ dành cho Admin)
 */
const deleteMovie = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedMovie = await Movie.findByIdAndDelete(id);

        if (!deletedMovie) {
            return next(new AppError('Không tìm thấy phim để xóa!', 404));
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa phim thành công.',
            data: { id },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie,
};
