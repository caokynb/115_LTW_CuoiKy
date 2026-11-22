import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GenreTag } from '../movie';

const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

// banner phim nổi bật tự động chuyển slide sau mỗi 5 giây
export function HeroCarousel({
  movies = [], // danh sách phim nổi bật đưa vào banner
  autoPlayInterval = 5000, // thời gian tự chuyển slide (mặc định 5000ms)
  loading = false, // trạng thái đang tải dữ liệu
}) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = movies.length;

  // reset về slide đầu khi danh sách phim thay đổi
  useEffect(() => {
    setActiveIndex(0);
  }, [totalSlides]);

  // cuộn khung banner tới vị trí slide đang chọn
  const scrollToSlide = (index) => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;
    const width = container.clientWidth || 0;
    if (width > 0) {
      container.scrollTo({ left: index * width, behavior: 'smooth' });
    }
  };

  // hẹn giờ tự chuyển slide mỗi 5 giây và dọn dẹp timer khi rời trang hoặc rê chuột
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % totalSlides;
        scrollToSlide(next);
        return next;
      });
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [totalSlides, isPaused, autoPlayInterval]);

  // chuyển tới slide chỉ định khi bấm nút mũi tên hoặc chấm tròn
  const goToSlide = (index) => {
    if (totalSlides === 0) return;
    const nextIndex = (index + totalSlides) % totalSlides;
    setActiveIndex(nextIndex);
    scrollToSlide(nextIndex);
  };

  // đồng bộ lại dấu chấm active khi người dùng vuốt tay trên mobile
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container || !container.clientWidth) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    if (index >= 0 && index < totalSlides && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="h-[380px] w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-[440px]" />
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="flex flex-col items-start justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 px-6 py-12 text-white shadow-lg sm:px-10 sm:py-16">
        <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-400">
          CineHub Cinema
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
          Trải nghiệm điện ảnh đỉnh cao
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
          Đặt vé xem phim nhanh chóng, chọn ghế trực quan theo thời gian thực.
        </p>
        <Link
          to="/movies"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Khám phá lịch chiếu
        </Link>
      </div>
    );
  }

  return (
    <section
      aria-label="Phim nổi bật"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl"
    >
      {/* vùng cuộn ngang hỗ trợ vuốt chạm trên mobile */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-testid="hero-carousel-track"
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {movies.map((movie, idx) => {
          const poster = movie.posterUrl || DEFAULT_POSTER;
          const isNowShowing = movie.status === 'now_showing';
          return (
            <div
              key={movie._id || idx}
              aria-hidden={idx !== activeIndex}
              className="relative w-full shrink-0 snap-start"
            >
              {/* ảnh nền làm mờ tạo không khí rạp chiếu */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25 blur-sm scale-105"
                style={{ backgroundImage: `url(${poster})` }}
                aria-hidden="true"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/60"
                aria-hidden="true"
              />

              <div className="relative z-10 grid items-center gap-6 px-6 py-8 sm:px-12 sm:py-12 md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_260px]">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isNowShowing
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
                    </span>
                    {movie.duration && (
                      <span className="text-xs font-medium text-slate-300">
                        {movie.duration} phút
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {movie.title}
                  </h2>

                  {Array.isArray(movie.genres) && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {movie.genres.slice(0, 3).map((genre) => (
                        <GenreTag key={genre} genre={genre} />
                      ))}
                    </div>
                  )}

                  {movie.description && (
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-300 line-clamp-3 sm:text-base">
                      {movie.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      to={`/movies/${movie._id}`}
                      className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                    >
                      Đặt vé ngay
                    </Link>
                    <Link
                      to="/movies"
                      className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
                    >
                      Xem tất cả phim
                    </Link>
                  </div>
                </div>

                {/* poster phim bên phải trên tablet/desktop */}
                <div className="hidden justify-end md:flex">
                  <img
                    src={poster}
                    alt={movie.title}
                    className="aspect-[2/3] w-48 rounded-xl border border-slate-700/80 object-cover shadow-2xl lg:w-56"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* nút chuyển slide trái phải */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={() => goToSlide(activeIndex - 1)}
            aria-label="Slide trước"
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition-colors hover:bg-black/75 sm:left-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goToSlide(activeIndex + 1)}
            aria-label="Slide tiếp theo"
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-xs transition-colors hover:bg-black/75 sm:right-3"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* thanh chấm chỉ vị trí slide hiện tại */}
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {movies.map((movie, idx) => (
              <button
                key={movie._id || idx}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                aria-current={idx === activeIndex ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all ${
                  idx === activeIndex
                    ? 'w-7 bg-brand-500'
                    : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default HeroCarousel;
