const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');

const getMovieReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isObjectIdOrHexString(id)) {
      return next(new AppError('Mã phim không hợp lệ.', 400));
    }
    const movie = await Movie.findById(id).select('_id');
    if (!movie) return next(new AppError('Không tìm thấy phim.', 404));

    const [reviews, summary] = await Promise.all([
      Review.find({ movieId: id })
        .populate('userId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Review.aggregate([
        { $match: { movieId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      averageRating: summary[0]?.averageRating || 0,
      reviewCount: summary[0]?.reviewCount || 0,
    });
  } catch (error) {
    return next(error);
  }
};

const createMovieReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isObjectIdOrHexString(id)) {
      return next(new AppError('Mã phim không hợp lệ.', 400));
    }
    if (!req.user?._id) return next(new AppError('Bạn cần đăng nhập để đánh giá phim.', 401));

    const movie = await Movie.findById(id).select('_id');
    if (!movie) return next(new AppError('Không tìm thấy phim.', 404));

    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return next(new AppError('Số sao phải từ 1 đến 5.', 400));
    }
    if (comment.length < 3 || comment.length > 1000 || !/[\p{L}\p{N}]/u.test(comment)) {
      return next(new AppError('Nhận xét cần từ 3 đến 1000 ký tự và có nội dung hợp lệ.', 400));
    }
    if (/(.)\1{7,}/u.test(comment)) {
      return next(new AppError('Nhận xét có nội dung lặp lại bất thường.', 400));
    }

    const duplicate = await Review.exists({ movieId: id, userId: req.user._id });
    if (duplicate) return next(new AppError('Bạn đã đánh giá phim này rồi.', 409));

    let review;
    try {
      review = await Review.create({ movieId: id, userId: req.user._id, rating, comment });
    } catch (error) {
      // Unique index vẫn cần xử lý trường hợp hai request được gửi cùng lúc.
      if (error.code === 11000) {
        return next(new AppError('Bạn đã đánh giá phim này rồi.', 409));
      }
      throw error;
    }
    await review.populate('userId', 'fullName');
    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMovieReviews, createMovieReview };
