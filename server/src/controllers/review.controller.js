const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
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

const updateMovieRating = async (movieId) => {
  const [summary] = await Review.aggregate([
    { $match: { movieId: new mongoose.Types.ObjectId(movieId) } },
    { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  await Movie.findByIdAndUpdate(movieId, {
    averageRating: summary ? Math.round(summary.averageRating * 10) / 10 : 0,
    reviewCount: summary?.reviewCount || 0,
  });
};

const hasVerifiedBooking = async (movieId, userId) => {
  const showtimeIds = await Showtime.distinct('_id', { movieId });
  return Booking.exists({ userId, showtimeId: { $in: showtimeIds }, status: { $in: ['confirmed', 'checked-in'] } });
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

    const purchased = await hasVerifiedBooking(id, req.user._id);
    if (!purchased) return next(new AppError('Chỉ khách đã mua vé xem phim này mới được đánh giá.', 403));

    const duplicate = await Review.exists({ movieId: id, userId: req.user._id });
    if (duplicate) return next(new AppError('Bạn đã đánh giá phim này rồi.', 409));

    let review;
    try {
      review = await Review.create({ movieId: id, userId: req.user._id, rating, comment, verifiedPurchase: true });
    } catch (error) {
      // Unique index vẫn cần xử lý trường hợp hai request được gửi cùng lúc.
      if (error.code === 11000) {
        return next(new AppError('Bạn đã đánh giá phim này rồi.', 409));
      }
      throw error;
    }
    await updateMovieRating(id);
    await review.populate('userId', 'fullName');
    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    return next(error);
  }
};

const updateMovieReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isObjectIdOrHexString(id)) return next(new AppError('Mã phim không hợp lệ.', 400));
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 1000) return next(new AppError('Số sao phải từ 1 đến 5 và nhận xét từ 3 đến 1000 ký tự.', 400));
    const review = await Review.findOneAndUpdate({ movieId: id, userId: req.user._id }, { rating, comment }, { new: true, runValidators: true }).populate('userId', 'fullName');
    if (!review) return next(new AppError('Không tìm thấy đánh giá của bạn.', 404));
    await updateMovieRating(id);
    return res.json({ success: true, data: review });
  } catch (error) { return next(error); }
};

const deleteMovieReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isObjectIdOrHexString(id)) return next(new AppError('Mã phim không hợp lệ.', 400));
    const review = await Review.findOneAndDelete({ movieId: id, userId: req.user._id });
    if (!review) return next(new AppError('Không tìm thấy đánh giá của bạn.', 404));
    await updateMovieRating(id);
    return res.json({ success: true, message: 'Đã xóa đánh giá.' });
  } catch (error) { return next(error); }
};

module.exports = { getMovieReviews, createMovieReview, updateMovieReview, deleteMovieReview };
