import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import HeroCarousel from '../components/home/HeroCarousel';
import { MovieGrid } from '../components/movie';
import { getButtonClasses } from '../components/ui';

const QUICK_MODULES = [
  {
    to: '/movies?status=now_showing',
    title: 'Phim đang chiếu',
    description: 'Xem suất chiếu hôm nay và chọn ghế trực quan theo thời gian thực.',
    badgeClass: 'bg-brand-600/15 text-brand-700 dark:bg-brand-600/25 dark:text-brand-300',
    icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4 0v16M16 4v16',
  },
  {
    to: '/movies?status=coming_soon',
    title: 'Phim sắp chiếu',
    description: 'Theo dõi các bom tấn sắp khởi chiếu và lịch phát hành mới nhất.',
    badgeClass: 'bg-amber-500/20 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z',
  },
  {
    to: '/my-bookings',
    title: 'Vé của tôi & Mã QR',
    description: 'Tra cứu nhanh vé đã đặt và xuất trình mã QR ngay tại cửa soát vé.',
    badgeClass: 'bg-neutral-200 text-neutral-800 dark:bg-cinema-elevated dark:text-neutral-200',
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5Z',
  },
];

// trang chủ hiển thị banner phim nổi bật, các phân khu chức năng nhanh và danh sách phim
export function Home() {
  const { data: nowRes, loading: nowLoading } = useFetch('/movies', {
    params: { status: 'now_showing', page: 1, limit: 8 },
  });

  const { data: soonRes, loading: soonLoading } = useFetch('/movies', {
    params: { status: 'coming_soon', page: 1, limit: 4 },
  });

  const nowShowingMovies = nowRes?.data || [];
  const comingSoonMovies = soonRes?.data || [];
  const featuredMovies = nowShowingMovies.slice(0, 5);

  return (
    <div className="space-y-12">
      {/* Vùng 1: Banner phim nổi bật */}
      <HeroCarousel movies={featuredMovies} loading={nowLoading} />

      {/* Vùng 2: Phân khu truy cập chức năng nhanh */}
      <section aria-label="Truy cập nhanh chức năng" className="grid gap-4 sm:grid-cols-3">
        {QUICK_MODULES.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group flex items-start justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-lg dark:bg-cinema-card dark:hover:bg-cinema-elevated"
          >
            <div className="flex min-w-0 items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.badgeClass}`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-neutral-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {item.description}
                </p>
              </div>
            </div>
            <svg
              className="mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-neutral-400 dark:group-hover:text-brand-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </section>

      {/* Vùng 3: Khu vực phim đang chiếu */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-7 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white sm:text-2xl">
                Phim đang chiếu
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Những bộ phim hot nhất đang công chiếu tại rạp
              </p>
            </div>
          </div>
          <Link
            to="/movies?status=now_showing"
            className={getButtonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'whitespace-nowrap text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200',
            })}
          >
            Xem tất cả →
          </Link>
        </div>

        <MovieGrid
          movies={nowShowingMovies}
          loading={nowLoading}
          emptyTitle="Chưa có phim đang chiếu"
          emptyDescription="Lịch chiếu phim mới sẽ sớm được cập nhật."
        />
      </section>

      {/* Vùng 4: Khu vực phim sắp chiếu */}
      <section className="space-y-5 border-t border-neutral-200 pt-10 dark:border-cinema-borderSubtle">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-7 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-bold text-neutral-950 dark:text-white sm:text-2xl">
                Phim sắp chiếu
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Đón chờ những bom tấn sắp ra mắt trong thời gian tới
              </p>
            </div>
          </div>
          <Link
            to="/movies?status=coming_soon"
            className={getButtonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'whitespace-nowrap text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200',
            })}
          >
            Xem tất cả →
          </Link>
        </div>

        <MovieGrid
          movies={comingSoonMovies}
          loading={soonLoading}
          emptyTitle="Chưa có phim sắp chiếu"
          emptyDescription="Các phim sắp khởi chiếu sẽ được bổ sung sớm."
        />
      </section>
    </div>
  );
}

export default Home;
