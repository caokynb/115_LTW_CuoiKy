import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import GenreTag from './GenreTag';
import AgeRatingBadge from './AgeRatingBadge';

// Ảnh mặc định khi poster bị lỗi hoặc chưa có ảnh
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
      day: '2-digit', //để dạng 2 ký tự
      month: '2-digit',
      year: 'numeric', //phải là số
    });
  } catch {
    return '';
  }
};

// Component thẻ hiển thị thông tin từng bộ phim
export function MovieCard({ movie }) {
  const {
    _id,
    title,
    genres = [],
    duration,
    releaseDate,
    status,
    ageRating = 'P',
    posterUrls = [],
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

  // nếu không có dữ liệu phim thì không render
  if (!movie) return null;

  // cờ kiểm tra phim đang chiếu hay sắp chiếu
  const isNowShowing = status === 'now_showing';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Vùng ảnh poster có hiệu ứng hover zoom nhẹ */}
      <Link
        to={`/movies/${_id}`}
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
      >
        {posters.map((src, idx) => (
          <img
            key={`${src}-${idx}`}
            src={src}
            alt={idx === 0 ? title : `${title} - poster ${idx + 1}`}
            loading={idx === 0 ? 'lazy' : 'eager'}
            decoding="async"
            onError={(e) => {
              // nếu link ảnh hỏng thì tự đổi về ảnh mặc định tránh vỡ giao diện
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_POSTER;
            }}
            aria-hidden={idx !== activePosterIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-in-out group-hover:scale-105 motion-reduce:transition-none ${
              idx === activePosterIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {/* Nhãn trạng thái đang chiếu hoặc sắp chiếu gắn ở góc trên bên trái */}
        <div className="absolute left-3 top-3">
          {isNowShowing ? (
            <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              Đang chiếu
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              Sắp chiếu
            </span>
          )}
        </div>

        {/* Nhãn phân loại độ tuổi gắn ở góc trên bên phải poster */}
        <div className="absolute right-3 top-3">
          <AgeRatingBadge rating={ageRating} />
        </div>

        {/* Thời lượng phim gắn ở góc dưới bên phải poster */}
        {duration > 0 && (
          <div className="absolute bottom-3 right-3 rounded-md bg-slate-950/80 px-2 py-0.5 text-xs font-medium text-slate-200 backdrop-blur-sm">
            {duration} phút
          </div>
        )}
      </Link>

      {/* Phần nội dung chi tiết phía dưới poster */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        {/* Danh sách nhãn thể loại, tối đa hiển thị 2 nhãn đầu để không bị tràn dòng */}
        {Array.isArray(genres) && genres.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {genres.slice(0, 2).map((g, idx) => (
              <GenreTag key={`${_id}-genre-${idx}`} genre={g} />
            ))}
            {genres.length > 2 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                +{genres.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Tên phim (bấm vào chuyển sang trang chi tiết) */}
        <h3 className="line-clamp-2 break-words text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-500">
          <Link to={`/movies/${_id}`} title={title}>
            {title}
          </Link>
        </h3>

        {/* Ngày khởi chiếu */}
        {releaseDate && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Khởi chiếu: {formatDate(releaseDate)}
          </p>
        )}

        {/* Nút hành động ở cuối thẻ */}
        <div className="mt-auto pt-4">
          <Link
            to={`/movies/${_id}`}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {isNowShowing ? 'Đặt vé ngay' : 'Xem thông tin'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MovieCard;
