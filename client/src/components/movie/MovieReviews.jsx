import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Button, EmptyState, FormField, Spinner } from '../ui';

const formatDate = (value) => new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

export function MovieReviews({ movieId }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!movieId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    api.get(`/movies/${movieId}/reviews`, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setReviews(Array.isArray(data.data) ? data.data : []);
          setAverageRating(Number(data.averageRating) || 0);
          setReviewCount(Number(data.reviewCount) || 0);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError, 'Không tải được đánh giá.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [movieId, version]);

  const submitReview = async (event) => {
    event.preventDefault();
    const cleanComment = comment.trim();
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || cleanComment.length < 3) {
      setError('Chọn số sao và nhập nhận xét ít nhất 3 ký tự.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post(`/movies/${movieId}/reviews`, { rating: Number(rating), comment: cleanComment });
      setComment('');
      setRating(5);
      setVersion((current) => current + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không gửi được đánh giá.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card"
      aria-labelledby="movie-reviews-title"
    >
      <header>
        <h2 id="movie-reviews-title" className="text-xl font-bold text-slate-900 dark:text-white">Đánh giá phim</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300" aria-live="polite">
          ★ {averageRating.toFixed(1)} / 5 · {reviewCount} đánh giá
        </p>
      </header>

      {isAuthenticated ? (
        <form onSubmit={submitReview} className="space-y-3">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Chọn số sao</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} sao`}
                  aria-pressed={rating === star}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <FormField
            label="Nhận xét"
            name="comment"
            type="textarea"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Chia sẻ cảm nhận của bạn về phim"
            rows={4}
            maxLength={1000}
            required
          />
          <Button type="submit" loading={submitting}>Gửi đánh giá</Button>
        </form>
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          <Link to="/login" state={{ from: { pathname: location.pathname } }} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Đăng nhập</Link> để gửi đánh giá.
        </p>
      )}

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-5"><Spinner label="Đang tải đánh giá..." /></div>
      ) : reviews.length === 0 ? (
        <EmptyState title="Chưa có đánh giá" description="Hãy là người đầu tiên chia sẻ cảm nhận về phim." />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {reviews.map((review) => (
            <li key={review._id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">{review.userId?.fullName || 'Thành viên'}</p>
                <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
              </div>
              <p className="mt-1 text-sm text-amber-500" aria-label={`${review.rating} trên 5 sao`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MovieReviews;
