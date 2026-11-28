const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Showtime = require('../models/Showtime');
const { validateMovieInput } = require('../validators/movie.validator');
const { fetchPostersByTitle, fetchPostersById } = require('../services/tmdb.service');
const AppError = require('../utils/AppError');

// chuẩn hóa mảng poster phụ, loại bỏ phần tử rỗng và phần tử trùng với poster chính
const normalizePosterUrls = (rawPosterUrls, primaryPosterUrl) => {
    if (!Array.isArray(rawPosterUrls)) return undefined;
    const seen = new Set(primaryPosterUrl ? [String(primaryPosterUrl).trim()] : []);
    const normalized = [];

    for (const url of rawPosterUrls) {
        if (typeof url !== 'string') continue;
        const clean = url.trim();
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        normalized.push(clean);
        if (normalized.length >= 6) break;
    }

    return normalized;
};

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

        // Bộ lọc date dùng ngày chiếu tại TP.HCM, không dùng ngày khởi chiếu.
        if (date) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return next(new AppError('date phải có định dạng YYYY-MM-DD.', 400));
            }
            const dayStart = new Date(`${date}T00:00:00.000Z`);
            if (Number.isNaN(dayStart.getTime()) || dayStart.toISOString().slice(0, 10) !== date) {
                return next(new AppError('Ngày lọc không hợp lệ.', 400));
            }
            const from = new Date(dayStart.getTime() - 7 * 60 * 60 * 1000);
            const until = new Date(from.getTime() + 24 * 60 * 60 * 1000);
            const movieIds = await Showtime.distinct('movieId', {
                startTime: { $gte: from, $lt: until },
            });
            query._id = { $in: movieIds };
        }

        // Giữ releaseDate/fromDate/toDate để tương thích các màn hình cũ.
        const targetDate = releaseDate;
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

// lấy danh sách thể loại kèm số lượng phim theo từng thể loại
const getMovieGenres = async (req, res, next) => {
    try {
        const { status } = req.query;
        const pipeline = [];

        // nếu truyền status thì lọc trước khi gom nhóm
        if (status && status.trim() !== '') {
            pipeline.push({ $match: { status: status.trim() } });
        }

        pipeline.push(
            { $unwind: '$genres' },
            {
                $group: {
                    _id: '$genres',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    genre: '$_id',
                    count: 1,
                },
            },
            { $sort: { count: -1, genre: 1 } }
        );

        const genres = await Movie.aggregate(pipeline);

        return res.status(200).json({
            success: true,
            data: genres,
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
        if (!mongoose.isObjectIdOrHexString(id)) {
            return next(new AppError('Không tìm thấy phim với ID này!', 404));
        }
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
        if (movieData.posterUrls !== undefined) {
            movieData.posterUrls = normalizePosterUrls(movieData.posterUrls, movieData.posterUrl);
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
        if (movieData.posterUrls !== undefined) {
            movieData.posterUrls = normalizePosterUrls(movieData.posterUrls, movieData.posterUrl);
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

        const movie = await Movie.findById(id);
        if (!movie) {
            return next(new AppError('Không tìm thấy phim để xóa!', 404));
        }

        // kiểm tra nếu phim còn suất chiếu trong tương lai thì chặn xóa (trả về 409)
        const hasFutureShowtime = await Showtime.exists({
            movieId: id,
            startTime: { $gt: new Date() },
        });
        if (hasFutureShowtime) {
            return next(
                new AppError('Không thể xóa phim vì vẫn còn suất chiếu trong tương lai!', 409)
            );
        }

        await Movie.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: 'Xóa phim thành công.',
            data: { id },
        });
    } catch (error) {
        next(error);
    }
};

// lấy danh sách poster tiếng Việt từ TMDB cho trang quản trị
const getTmdbPosters = async (req, res, next) => {
    try {
        const { q, tmdbId } = req.query;

        if (tmdbId !== undefined && String(tmdbId).trim() !== '') {
            const result = await fetchPostersById(tmdbId);
            return res.status(200).json({
                success: true,
                data: result,
            });
        }

        if (!q || String(q).trim() === '') {
            return next(new AppError('Vui lòng nhập tên phim hoặc tmdbId để tìm poster!', 400));
        }

        const result = await fetchPostersByTitle(String(q).trim());
        if (!result) {
            return next(new AppError('Không tìm thấy phim phù hợp trên TMDB!', 404));
        }

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMovies,
    getMovieGenres,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie,
    getTmdbPosters,
};
