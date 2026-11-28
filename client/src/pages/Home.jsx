import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [quickCinemaId, setQuickCinemaId] = useState('');
  const [quickMovieId, setQuickMovieId] = useState('');
  const { data: cinemaRes } = useFetch('/cinemas');
  const { data: showtimeRes, loading: showtimeLoading } = useFetch('/showtimes', {
    params: { cinemaId: quickCinemaId, movieId: quickMovieId, page: 1, limit: 20 },
    immediate: Boolean(quickCinemaId && quickMovieId),
  });
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

      <section aria-labelledby="quick-book-title" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card sm:p-6">
        <div className="mb-4"><h2 id="quick-book-title" className="text-xl font-bold text-neutral-950 dark:text-white">Đặt vé nhanh</h2><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Chọn rạp, chọn phim, rồi chọn suất chiếu.</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200"><span>1. Chọn rạp</span><select value={quickCinemaId} onChange={(event) => { setQuickCinemaId(event.target.value); setQuickMovieId(''); }} className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm dark:border-cinema-border dark:bg-cinema-elevated dark:text-white"><option value="">Chọn cụm rạp</option>{(cinemaRes?.data || []).map((cinema) => <option key={cinema._id} value={cinema._id}>{cinema.name}</option>)}</select></label>
          <label className="space-y-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200"><span>2. Chọn phim</span><select value={quickMovieId} onChange={(event) => setQuickMovieId(event.target.value)} disabled={!quickCinemaId} className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm disabled:opacity-60 dark:border-cinema-border dark:bg-cinema-elevated dark:text-white"><option value="">Chọn phim đang chiếu</option>{nowShowingMovies.map((movie) => <option key={movie._id} value={movie._id}>{movie.title}</option>)}</select></label>
          <div className="space-y-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200"><span>3. Chọn suất chiếu</span><div className="flex min-h-[44px] flex-wrap gap-2">{!quickMovieId ? <span className="py-3 text-xs font-normal text-neutral-500">Chọn rạp và phim trước.</span> : showtimeLoading ? <span className="py-3 text-xs font-normal text-neutral-500">Đang tải suất chiếu…</span> : (showtimeRes?.data || []).length ? (showtimeRes.data || []).map((showtime) => <button key={showtime._id} type="button" onClick={() => navigate(`/showtimes/${showtime._id}/seats`)} className="min-h-[44px] rounded-xl bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">{new Date(showtime.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {showtime.roomId?.name || 'Phòng chiếu'}</button>) : <span className="py-3 text-xs font-normal text-neutral-500">Chưa có suất phù hợp tại rạp này.</span>}</div></div>
        </div>
      </section>

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
