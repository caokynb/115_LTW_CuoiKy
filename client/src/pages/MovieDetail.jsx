import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { GenreTag, TrailerModal } from '../components/movie';
import ShowtimeList from '../components/showtime/ShowtimeList';
import { Button, Spinner, EmptyState } from '../components/ui';

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

export function MovieDetail() {
  // lấy id của phim từ đường dẫn URL (/movies/:id)
  const { id } = useParams();
  const navigate = useNavigate();

  // state lưu thông tin phim và trạng thái tải
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // state đóng/mở popup xem trailer YouTube
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

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

  // cuộn trang mượt mà xuống khu vực suất chiếu khi bấm nút Đặt vé
  const scrollToBooking = () => {
    const el = document.getElementById('booking-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. Trường hợp đang tải trang
  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải thông tin phim...</p>
      </div>
    );
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <p className="font-medium">{errorMessage}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
    trailerYoutubeId,
  } = movie;
  const poster = movie.posterUrl || DEFAULT_POSTER;
  const isNowShowing = status === 'now_showing';

  return (
    <div className="pb-16">
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
            <div className="mx-auto w-64 shrink-0 sm:w-72 md:mx-0">
              <div className="group relative aspect-[2/3] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800 shadow-2xl">
                <img
                  src={poster}
                  alt={title}
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
              </div>
            </div>

            {/* Thông tin chính của phim */}
            <div className="flex flex-1 flex-col justify-center">
              {/* Nhãn trạng thái đang chiếu / sắp chiếu */}
              <div className="mb-3 flex items-center gap-2">
                {isNowShowing ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Đang chiếu
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Sắp chiếu
                  </span>
                )}
              </div>

              {/* Tên phim */}
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
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

          <ShowtimeList movieId={id} />
        </section>
      </div>

      {/* Modal phát video trailer YouTube */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        youtubeId={trailerYoutubeId}
        movieTitle={title}
      />
    </div>
  );
}

export default MovieDetail;
