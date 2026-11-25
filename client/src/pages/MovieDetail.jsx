import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { GenreTag, TrailerModal, AgeRatingBadge, AGE_RATING_META } from '../components/movie';
import ShowtimeList from '../components/showtime/ShowtimeList';
import MovieReviews from '../components/movie/MovieReviews';
import { Button, EmptyState, Modal } from '../components/ui';
import { useAuth } from '../context/AuthContext';

// Ảnh mặc định khi poster bị lỗi hoặc chưa có ảnh
const DEFAULT_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

// Format ngày tháng hiển thị dạng ngày/tháng/năm
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

// Format giờ hiển thị từ ISO string sang giờ:phút (ví dụ 19:30)
const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
};

// khung skeleton hiển thị khi trang chi tiết phim đang tải dữ liệu
function MovieDetailSkeleton() {
  return (
    <div
      data-testid="movie-detail-skeleton"
      role="status"
      aria-label="Đang tải thông tin phim"
      className="animate-pulse pb-16"
    >
      <div className="border-b border-slate-200 bg-slate-900 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
            <div className="mx-auto aspect-[2/3] w-full max-w-[240px] shrink-0 rounded-2xl bg-slate-800 sm:max-w-[288px] md:mx-0" />
            <div className="flex flex-1 flex-col justify-center space-y-4">
              <div className="h-6 w-24 rounded-md bg-slate-800" />
              <div className="h-10 w-3/4 rounded-lg bg-slate-800" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-800" />
                <div className="h-6 w-24 rounded-full bg-slate-800" />
              </div>
              <div className="flex gap-4">
                <div className="h-5 w-24 rounded bg-slate-800" />
                <div className="h-5 w-36 rounded bg-slate-800" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-36 rounded-lg bg-slate-800" />
                <div className="h-11 w-32 rounded-lg bg-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <div className="h-7 w-44 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-28 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="space-y-3">
          <div className="h-7 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MovieDetail() {
  // lấy id của phim từ đường dẫn URL (/movies/:id)
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // state lưu thông tin phim và trạng thái tải
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [cinemaId, setCinemaId] = useState(() => window.localStorage.getItem('cinemaId') || '');

  // state đóng/mở popup xem trailer YouTube và modal cảnh báo độ tuổi
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [pendingShowtimeId, setPendingShowtimeId] = useState(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Gọi API lấy chi tiết phim khi id thay đổi
  useEffect(() => {
    // nếu không có id thì báo không tìm thấy luôn
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setErrorMessage('');

    // gọi endpoint GET /api/movies/:id
    api
      .get(`/movies/${id}`, { signal: controller.signal })
      .then((res) => {
        // gán dữ liệu phim nhận được từ backend
        setMovie(res.data?.data || null);
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        // nếu backend trả về 404 (không tìm thấy hoặc sai định dạng ID)
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setErrorMessage(getErrorMessage(err, 'Không thể tải thông tin bộ phim này.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const handleCinemaChange = (event) => setCinemaId(event.detail?.cinemaId || '');
    window.addEventListener('cinema:change', handleCinemaChange);
    return () => window.removeEventListener('cinema:change', handleCinemaChange);
  }, []);

  // cuộn trang mượt mà xuống khu vực suất chiếu khi bấm nút Đặt vé
  const scrollToBooking = () => {
    const el = document.getElementById('booking-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. Trường hợp đang tải trang -> hiển thị skeleton
  if (loading) {
    return <MovieDetailSkeleton />;
  }

  // 2. Trường hợp ID sai hoặc phim không tồn tại -> hiển thị trang không tìm thấy
  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <EmptyState
          title="Không tìm thấy phim!"
          description="Đường dẫn phim không hợp lệ hoặc bộ phim này đã bị xóa khỏi hệ thống."
          action={{
            label: 'Quay lại danh sách phim',
            onClick: () => navigate('/movies'),
          }}
        />
      </div>
    );
  }

  // 3. Trường hợp lỗi kết nối server
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <p className="font-medium">{errorMessage}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/movies')}>
              Về danh sách phim
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // nếu không có dữ liệu phim thì dừng
  if (!movie) return null;

  // bóc tách dữ liệu phim ra các biến cho gọn
  const {
    title,
    description,
    genres = [],
    duration,
    releaseDate,
    status,
    ageRating = 'P',
    trailerYoutubeId,
  } = movie;
  const poster = movie.posterUrl || DEFAULT_POSTER;
  const isNowShowing = status === 'now_showing';
  const ageMeta = AGE_RATING_META[ageRating] || AGE_RATING_META.P;

  // kiểm tra nhãn độ tuổi trước khi cho chuyển sang trang chọn ghế
  const handleSelectShowtime = (showtime) => {
    const nextPath = `/showtimes/${showtime._id}/seats`;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: nextPath } } });
      return;
    }
    if (ageMeta.requiresWarning) {
      setAgeConfirmed(false);
      setPendingShowtimeId(showtime._id);
      return;
    }
    navigate(nextPath);
  };

  // xác nhận đủ tuổi và chuyển sang sơ đồ ghế
  const handleConfirmAgeAndNavigate = () => {
    if (!pendingShowtimeId || !ageConfirmed) return;
    const targetId = pendingShowtimeId;
    setPendingShowtimeId(null);
    navigate(`/showtimes/${targetId}/seats`);
  };

  return (
    <div className="overflow-x-hidden pb-16">
      {/* Khối Hero Banner trên cùng với ảnh poster mờ phía sau */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-slate-900 text-white dark:border-slate-800">
        {/* Ảnh nền phủ mờ tạo chiều sâu */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl filter"
          style={{ backgroundImage: `url(${poster})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
            {/* Ảnh poster phim */}
            <div className="mx-auto w-full max-w-[240px] shrink-0 sm:max-w-[288px] md:mx-0">
              <div className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800 shadow-2xl">
                <img
                  src={poster}
                  alt={title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_POSTER;
                  }}
                  className="h-full w-full object-cover"
                />

                {/* Nút xem trailer tròn nổi trên ảnh poster */}
                {trailerYoutubeId && (
                  <button
                    type="button"
                    onClick={() => setIsTrailerOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-90 transition-opacity hover:opacity-100"
                    aria-label="Xem trailer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/90 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
                      <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                )}

                {/* Nhãn phân loại độ tuổi trên góc poster */}
                <div className="absolute right-3 top-3 z-10">
                  <AgeRatingBadge rating={ageRating} />
                </div>
              </div>
            </div>

            {/* Thông tin chính của phim */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              {/* Nhãn trạng thái đang chiếu / sắp chiếu và độ tuổi */}
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                {isNowShowing ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Đang chiếu
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Sắp chiếu
                  </span>
                )}
                <AgeRatingBadge rating={ageRating} showDescription />
              </div>

              {/* Tên phim */}
              <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>

              {/* Danh sách thể loại */}
              {Array.isArray(genres) && genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {genres.map((g, idx) => (
                    <GenreTag key={`genre-${idx}`} genre={g} />
                  ))}
                </div>
              )}

              {/* Thông số thời lượng & ngày chiếu */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-300">
                {duration > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{duration} phút</span>
                  </div>
                )}

                {releaseDate && (
                  <div className="flex items-center gap-1.5">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Khởi chiếu: {formatDate(releaseDate)}</span>
                  </div>
                )}
              </div>

              {/* Các nút bấm thao tác: Đặt vé & Xem trailer */}
              <div className="mt-8 flex flex-wrap gap-3">
                {isNowShowing && (
                  <Button variant="primary" size="md" onClick={scrollToBooking}>
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Đặt vé ngay
                  </Button>
                )}

                {trailerYoutubeId && (
                  <Button variant="secondary" size="md" onClick={() => setIsTrailerOpen(true)}>
                    <svg className="mr-2 h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Xem Trailer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chi tiết phim và lịch chiếu */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Phần tóm tắt nội dung */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            Nội dung phim
          </h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="whitespace-pre-line text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {description || 'Chưa có thông tin mô tả cho bộ phim này.'}
            </p>
          </div>
        </section>

        {/* Vùng chờ hiển thị suất chiếu */}
        <section id="booking-section" className="scroll-mt-24">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Lịch chiếu phim
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Chọn suất chiếu để tiến hành đặt vé
            </span>
          </div>

          <ShowtimeList
            movieId={id}
            cinemaId={cinemaId}
            onSelectShowtime={handleSelectShowtime}
          />
        </section>

        <div className="mt-10">
          <MovieReviews movieId={id} />
        </div>
      </div>

      {/* Modal phát video trailer YouTube */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        youtubeId={trailerYoutubeId}
        movieTitle={title}
      />

      {/* Modal cảnh báo độ tuổi trước khi chọn ghế cho phim T16/T18/C */}
      <Modal
        isOpen={Boolean(pendingShowtimeId)}
        onClose={() => setPendingShowtimeId(null)}
        title={`Cảnh báo giới hạn độ tuổi (${ageMeta.label})`}
        size="md"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AgeRatingBadge rating={ageRating} className="shrink-0 pt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{ageMeta.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {ageMeta.description}
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              Tôi xác nhận mình đã đủ độ tuổi quy định ({ageMeta.label}) để xem bộ phim này.
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPendingShowtimeId(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!ageConfirmed}
              onClick={handleConfirmAgeAndNavigate}
            >
              Xác nhận &amp; Chọn ghế
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MovieDetail;
