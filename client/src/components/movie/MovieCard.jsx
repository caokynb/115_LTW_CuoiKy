import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import GenreTag from './GenreTag';
import AgeRatingBadge from './AgeRatingBadge';
import { getButtonClasses } from '../ui';
import TrailerModal from './TrailerModal';

const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

const POSTER_ROTATE_MS = 4500;

// Format ngày khởi chiếu sang định dạng ngày/tháng/năm của Việt Nam
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export function MovieCard({ movie }) {
  const {
    _id,
    title,
    description,
    genres = [],
    duration,
    releaseDate,
    status,
    ageRating = 'P',
    posterUrls = [],
    trailerYoutubeId,
    averageRating = 0,
    reviewCount = 0,
    formats = [],
  } = movie || {};

  // gom danh sách poster không trùng lặp để luân phiên trên thẻ phim
  const posters = useMemo(() => {
    const list = [];
    const seen = new Set();
    [movie?.posterUrl, ...(Array.isArray(posterUrls) ? posterUrls : [])].forEach((url) => {
      if (typeof url === 'string' && url.trim() && !seen.has(url.trim())) {
        seen.add(url.trim());
        list.push(url.trim());
      }
    });
    return list.length > 0 ? list : [DEFAULT_POSTER];
  }, [movie?.posterUrl, posterUrls]);

  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    setActivePosterIndex(0);
  }, [_id, posters.length]);

  useEffect(() => {
    if (!movie || posters.length <= 1 || isPaused) return undefined;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return undefined;
      }
    }

    // lệch pha thời gian bắt đầu nhẹ theo _id để các thẻ không chớp cùng lúc
    const staggerMs = _id
      ? (_id.charCodeAt(_id.length - 1) % 4) * 350
      : 0;
    let intervalId = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setActivePosterIndex((prev) => (prev + 1) % posters.length);
      }, POSTER_ROTATE_MS);
    }, staggerMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [movie, _id, posters.length, isPaused]);

  if (!movie) return null;
  const isNowShowing = status === 'now_showing';
  const synopsisText =
    description || 'Khám phá chi tiết suất chiếu và đặt ghế trực tuyến tại CineHub.';

  return (
    <article
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="cinema-surface cinema-movie-card group relative z-0 flex flex-col overflow-hidden rounded-2xl transition-[transform,border-color,box-shadow] duration-300 ease-out hover:z-30 focus-within:z-30 hover:border-brand-500/70 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] sm:hover:-translate-y-1.5 sm:hover:scale-[1.06]"
    >
      <Link
        to={`/movies/${_id}`}
        className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-200 dark:bg-cinema-elevated"
      >
        {posters.map((src, idx) => (
          <img
            key={`${src}-${idx}`}
            src={src}
            alt={idx === 0 ? title : `${title} - poster ${idx + 1}`}
            loading={idx === 0 ? 'lazy' : 'eager'}
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_POSTER;
            }}
            aria-hidden={idx !== activePosterIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-in-out group-hover:scale-105 motion-reduce:transition-none ${
              idx === activePosterIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
        />

        <div className="absolute left-3 top-3 z-10">
          {isNowShowing ? (
            <span className="inline-flex items-center rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Đang chiếu
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-sm">
              Sắp chiếu
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10">
          <AgeRatingBadge rating={ageRating} />
        </div>

        {duration > 0 && (
          <div className="absolute bottom-3 right-3 z-10 rounded-md bg-black/85 px-2.5 py-0.5 text-xs font-medium text-neutral-100 transition-opacity duration-100 group-hover:invisible group-hover:opacity-0 group-focus-within:invisible group-focus-within:opacity-0">
            {duration} phút
          </div>
        )}

        {/* Khung tóm tắt phim phủ mượt toàn poster, không gãy mép khi hover */}
        <div
          style={{
            background:
              'linear-gradient(to top, rgba(16, 16, 16, 0.96) 0%, rgba(16, 16, 16, 0.88) 26%, rgba(16, 16, 16, 0.42) 44%, rgba(16, 16, 16, 0.08) 56%, rgba(16, 16, 16, 0) 64%)',
          }}
          className="pointer-events-none absolute inset-0 z-20 flex translate-y-2 flex-col justify-end px-4 pb-4 pt-24 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-300">
            Tóm tắt phim
          </span>
          <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-neutral-100">
            {synopsisText}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-neutral-300">
            {duration > 0 && <span>{duration} phút</span>}
            {duration > 0 && <span aria-hidden="true">&bull;</span>}
            <span>{isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}</span>
          </div>
        </div>
      </Link>

      {/* rãnh xé vé xem phim hai bên thẻ phim */}
      <div className="relative flex items-center bg-neutral-100/90 dark:bg-[#232323]" aria-hidden="true">
        <div className="-ml-3 h-6 w-6 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-cinema-borderSubtle dark:bg-cinema-bg" />
        <div className="mx-1.5 flex-1 border-t-2 border-dashed border-neutral-300 dark:border-neutral-600/80" />
        <div className="-mr-3 h-6 w-6 shrink-0 rounded-full border border-neutral-200 bg-neutral-50 dark:border-cinema-borderSubtle dark:bg-cinema-bg" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-neutral-100/90 p-4 pt-3 dark:bg-[#232323]">
        {Array.isArray(genres) && genres.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {genres.slice(0, 2).map((g, idx) => (
              <GenreTag key={`${_id}-genre-${idx}`} genre={g} />
            ))}
            {genres.length > 2 && (
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                +{genres.length - 2}
              </span>
            )}
          </div>
        )}

        <h3 className="line-clamp-2 break-words text-base font-bold text-neutral-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
          <Link to={`/movies/${_id}`} title={title}>
            {title}
          </Link>
        </h3>

        {releaseDate && (
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            Khởi chiếu: {formatDate(releaseDate)}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
          {Number(averageRating) > 0 && <span className="font-semibold text-amber-600 dark:text-amber-300" aria-label={`Đánh giá ${averageRating} trên 5`}>★ {Number(averageRating).toFixed(1)} <span className="font-normal text-neutral-500">({reviewCount})</span></span>}
          {formats.length > 0 && <span>{formats.join(' · ')}</span>}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <Link
            to={`/movies/${_id}`}
            className={getButtonClasses({
              variant: isNowShowing ? 'primary' : 'secondary',
              size: 'md',
              fullWidth: !trailerYoutubeId,
            })}
          >
            {isNowShowing ? 'Đặt vé ngay' : 'Xem thông tin'}
          </Link>
          {trailerYoutubeId && <button type="button" onClick={() => setTrailerOpen(true)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-brand-500 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-cinema-border dark:text-neutral-100 dark:hover:text-brand-200"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg> Xem trailer</button>}
        </div>
      </div>
      {trailerYoutubeId && <TrailerModal isOpen={trailerOpen} onClose={() => setTrailerOpen(false)} youtubeId={trailerYoutubeId} movieTitle={title} />}
    </article>
  );
}

export default MovieCard;
