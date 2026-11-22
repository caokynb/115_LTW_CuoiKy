import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import HeroCarousel from '../components/home/HeroCarousel';
import { MovieGrid } from '../components/movie';

// trang chủ hiển thị banner phim nổi bật và danh sách phim đang/sắp chiếu
export function Home() {
  // lấy danh sách phim đang chiếu (5 phim đầu dùng làm banner + lưới phim trang chủ)
  const { data: nowRes, loading: nowLoading } = useFetch('/movies', {
    params: { status: 'now_showing', page: 1, limit: 8 },
  });

  // lấy danh sách phim sắp chiếu
  const { data: soonRes, loading: soonLoading } = useFetch('/movies', {
    params: { status: 'coming_soon', page: 1, limit: 4 },
  });

  const nowShowingMovies = nowRes?.data || [];
  const comingSoonMovies = soonRes?.data || [];
  const featuredMovies = nowShowingMovies.slice(0, 5);

  return (
    <div className="space-y-12">
      {/* banner phim nổi bật tự động chuyển slide */}
      <HeroCarousel movies={featuredMovies} loading={nowLoading} />

      {/* khu vực phim đang chiếu */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Phim đang chiếu
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Những bộ phim hot nhất đang công chiếu tại rạp
            </p>
          </div>
          <Link
            to="/movies?status=now_showing"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 whitespace-nowrap"
          >
            Xem tất cả →
          </Link>
        </div>

        <MovieGrid
          movies={nowShowingMovies.slice(0, 4)}
          loading={nowLoading}
          emptyTitle="Chưa có phim đang chiếu"
          emptyDescription="Lịch chiếu phim mới sẽ sớm được cập nhật."
        />
      </section>

      {/* khu vực phim sắp chiếu */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Phim sắp chiếu
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Đón chờ những bom tấn sắp ra mắt trong thời gian tới
            </p>
          </div>
          <Link
            to="/movies?status=coming_soon"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 whitespace-nowrap"
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
