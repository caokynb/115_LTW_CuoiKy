import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GenreTag } from '../movie';
import { Skeleton, getButtonClasses } from '../ui';

const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

// component banner trình chiếu phim nổi bật trên trang chủ, hỗ trợ tự chạy và kéo vuốt
export function HeroCarousel({
  movies = [],
  autoPlayInterval = 5000,
  loading = false,
}) {
  // lưu tọa độ X khi bắt đầu kéo và các trạng thái điều khiển slide hiện tại
  const dragStartXRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [failedBackdrops, setFailedBackdrops] = useState({});

  const totalSlides = movies.length;

  // đưa carousel về slide đầu tiên mỗi khi danh sách phim thay đổi
  useEffect(() => {
    setActiveIndex(0);
    setDragOffset(0);
    setIsDragging(false);
  }, [totalSlides]);

  // tự động chuyển slide khi không di chuột hoặc kéo
  useEffect(() => {
    if (totalSlides <= 1 || isPaused || isDragging) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [totalSlides, isPaused, isDragging, autoPlayInterval]);

  // chuyển vòng tròn tới một slide chỉ định
  const goToSlide = (index) => {
    if (totalSlides === 0) return;
    const nextIndex = (index + totalSlides) % totalSlides;
    setActiveIndex(nextIndex);
    setDragOffset(0);
  };

  // bắt đầu kéo ngang trên vùng banner (bỏ qua nút và liên kết)
  const handlePointerDown = (event) => {
    if (totalSlides <= 1) return;
    if (event.target.closest('a, button')) return;
    dragStartXRef.current = event.clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (event) => {
    if (!isDragging || dragStartXRef.current === null) return;
    const delta = event.clientX - dragStartXRef.current;
    const atStart = activeIndex === 0 && delta > 0;
    const atEnd = activeIndex === totalSlides - 1 && delta < 0;
    // hãm lực kéo nhẹ ở hai đầu danh sách để tạo cảm giác đàn hồi
    setDragOffset(atStart || atEnd ? delta * 0.35 : delta);
  };

  // kết thúc thao tác kéo: chuyển slide nếu vượt ngưỡng 50px, rồi đặt lại độ lệch
  const finishDrag = () => {
    if (!isDragging) return;
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset < 0 && activeIndex < totalSlides - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (dragOffset > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  // hiển thị khung xương chờ khi đang tải danh sách phim
  if (loading) {
    return (
      <Skeleton
        role="status"
        aria-label="Đang tải banner phim nổi bật"
        className="h-[380px] w-full sm:h-[440px]"
        rounded="rounded-2xl"
      />
    );
  }

  // banner mặc định khi hệ thống chưa có phim nào để trình chiếu
  if (totalSlides === 0) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-cinema-borderSubtle bg-gradient-to-br from-cinema-bg via-cinema-card to-brand-950 px-6 py-12 text-white shadow-cinema-card sm:px-10 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/25 blur-3xl"
        />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-brand-400/40 bg-brand-600/25 px-3 py-1 text-xs font-semibold text-brand-200">
            CineHub Cinema
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Trải nghiệm điện ảnh đỉnh cao
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-200 sm:text-base">
            Đặt vé xem phim nhanh chóng, chọn ghế trực quan theo thời gian thực và tận hưởng không gian rạp chiếu hiện đại.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/movies"
              className={getButtonClasses({ variant: 'primary', size: 'md' })}
            >
              Khám phá lịch chiếu
            </Link>
            <Link
              to="/my-bookings"
              className={getButtonClasses({
                variant: 'outline',
                size: 'md',
                className:
                  'border-neutral-600/90 bg-neutral-800/95 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] hover:border-neutral-400 hover:bg-neutral-700',
              })}
            >
              Vé của tôi
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Phim nổi bật"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="group/hero relative overflow-hidden rounded-2xl border border-cinema-borderSubtle bg-cinema-bg text-white shadow-cinema-card"
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={finishDrag}
        className={`overflow-hidden touch-pan-y select-none ${
          totalSlides > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        <div
          data-testid="hero-carousel-track"
          style={{
            transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
          }}
          className={`flex will-change-transform ${
            isDragging
              ? 'transition-none'
              : 'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'
          }`}
        >
          {movies.map((movie, idx) => {
            const poster = movie.posterUrl || DEFAULT_POSTER;
            const backdrop = (movie.backdropUrl || '').trim();
            const showBackdrop = Boolean(backdrop) && !failedBackdrops[backdrop];
            const isNowShowing = movie.status === 'now_showing';
            const isActive = idx === activeIndex;
            return (
              <div
                key={movie._id || idx}
                aria-hidden={!isActive}
                className="relative w-full shrink-0 overflow-hidden"
              >
                {/* chỉ dùng ảnh nền ngang backdrop sắc nét (nếu lỗi hoặc chưa có thì chuyển nền gradient tối) */}
                {showBackdrop ? (
                  <img
                    src={backdrop}
                    alt=""
                    aria-hidden="true"
                    onError={() => setFailedBackdrops((prev) => ({ ...prev, [backdrop]: true }))}
                    className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-cinema-bg via-cinema-card to-brand-950/60"
                    aria-hidden="true"
                  />
                )}
                {/* lớp làm mờ nhẹ và tối nền kết hợp gradient hai chiều giữ tương phản chữ bên trái */}
                <div
                  className="absolute inset-0 bg-black/30 backdrop-blur-[5px]"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cinema-bg/88 via-cinema-bg/45 to-transparent"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-cinema-bg/65 via-transparent to-transparent"
                  aria-hidden="true"
                />

                <div
                  className={`relative z-10 grid min-h-[340px] items-center gap-6 px-14 pb-16 pt-7 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:min-h-[380px] sm:px-16 sm:pb-16 sm:pt-10 md:grid-cols-[minmax(0,1fr)_200px] lg:min-h-[420px] lg:grid-cols-[minmax(0,1fr)_240px] lg:px-20 lg:pb-16 lg:pt-12 xl:grid-cols-[minmax(0,1fr)_260px] ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-45 scale-[0.97]'
                  }`}
                >
                  <div className="min-w-0 space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          isNowShowing
                            ? 'border-emerald-700/60 bg-emerald-950/90 text-emerald-200'
                            : 'border-amber-600/60 bg-amber-950/90 text-amber-200'
                        }`}
                      >
                        {isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
                      </span>
                      {movie.duration && (
                        <span className="text-xs font-medium text-neutral-200">
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
                          <GenreTag
                            key={genre}
                            genre={genre}
                            className="border-neutral-600/80 bg-neutral-800/95 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_4px_rgba(0,0,0,0.45)]"
                          />
                        ))}
                      </div>
                    )}

                    {movie.description && (
                      <p className="max-w-2xl text-sm leading-relaxed text-neutral-200 line-clamp-3 sm:text-base">
                        {movie.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link
                        to={`/movies/${movie._id}`}
                        className={getButtonClasses({ variant: 'primary', size: 'md' })}
                      >
                        Đặt vé ngay
                      </Link>
                      <Link
                        to="/movies"
                        className={getButtonClasses({
                          variant: 'outline',
                          size: 'md',
                          className:
                            'border-neutral-600/90 bg-neutral-800/95 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] hover:border-neutral-400 hover:bg-neutral-700',
                        })}
                      >
                        Xem tất cả phim
                      </Link>
                    </div>
                  </div>

                  {/* cột phải hiển thị poster đứng nổi bật trên màn hình vừa và lớn */}
                  <div className="hidden justify-end md:flex">
                    <img
                      src={poster}
                      alt={movie.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_POSTER;
                      }}
                      className="h-[270px] w-[180px] shrink-0 rounded-2xl border border-cinema-border object-cover shadow-2xl lg:h-[330px] lg:w-[220px]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* mũi tên chuyển sắc mượt ở hai mép & cụm chấm tròn tách nền */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={() => goToSlide(activeIndex - 1)}
            aria-label="Slide trước"
            className="absolute inset-y-0 left-0 z-20 inline-flex w-16 items-center justify-start bg-gradient-to-r from-black/70 via-black/30 to-transparent pl-3 text-white/85 opacity-55 transition-[opacity,color] duration-300 hover:text-white hover:opacity-100 focus-visible:text-white focus-visible:opacity-100 sm:w-20 sm:pl-4"
          >
            <svg className="h-6 w-6 drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goToSlide(activeIndex + 1)}
            aria-label="Slide tiếp theo"
            className="absolute inset-y-0 right-0 z-20 inline-flex w-16 items-center justify-end bg-gradient-to-l from-black/70 via-black/30 to-transparent pr-3 text-white/85 opacity-55 transition-[opacity,color] duration-300 hover:text-white hover:opacity-100 focus-visible:text-white focus-visible:opacity-100 sm:w-20 sm:pr-4"
          >
            <svg className="h-6 w-6 drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* thanh chỉ báo tiến trình phim dạng rạp chiếu không nền đen */}
          <style>
            {`@keyframes heroSlideProgress { from { transform: scaleX(0.15); } to { transform: scaleX(1); } }`}
          </style>
          <div className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {movies.map((movie, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={movie._id || idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`Chuyển tới slide ${idx + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className="group/dot inline-flex min-h-[36px] items-center justify-center px-0.5 focus:outline-none"
                >
                  {isActive ? (
                    <span className="relative block h-1.5 w-14 overflow-hidden rounded-full bg-white/25 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                      <span
                        key={`progress-${activeIndex}-${totalSlides}`}
                        style={
                          isPaused || isDragging
                            ? undefined
                            : { animation: `heroSlideProgress ${autoPlayInterval}ms linear forwards` }
                        }
                        className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-brand-600 via-rose-500 to-amber-300 shadow-[0_0_12px_rgba(225,29,72,0.85)] motion-reduce:animate-none"
                      />
                    </span>
                  ) : (
                    <span className="block h-1 w-5 rounded-full bg-white/35 shadow-[0_1px_4px_rgba(0,0,0,0.65)] transition-all duration-300 group-hover/dot:w-7 group-hover/dot:bg-white/80 group-focus-visible/dot:w-7 group-focus-visible/dot:bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default HeroCarousel;
