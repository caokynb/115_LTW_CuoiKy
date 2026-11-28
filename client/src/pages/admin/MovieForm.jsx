import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { Button, FormField, Spinner, useToast } from '../../components/ui';
import { DEFAULT_GENRES, AGE_RATINGS, AGE_RATING_META } from '../../components/movie';
import { extractYoutubeId, getYoutubeThumbnailUrl } from '../../utils/youtube';

const INITIAL_VALUES = {
  title: '',
  description: '',
  genresInput: '',
  duration: '',
  releaseDate: '',
  status: 'now_showing',
  ageRating: 'P',
  formats: ['2D'],
  audioOptions: ['subtitled'],
  posterUrl: '',
  posterUrls: [],
  backdropUrl: '',
  tmdbId: null,
  trailerInput: '',
};

// chuyển danh sách thể loại ngăn cách bằng dấu phẩy thành mảng sạch
const parseGenres = (input) =>
  (input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// kiểm tra dữ liệu form tạo/sửa phim trước khi gửi lên server
function validateMovieForm(values) {
  const errors = {};

  if (!values.title.trim()) {
    errors.title = 'Tên phim không được để trống';
  }
  if (!values.formats.length) errors.formats = 'Chọn ít nhất một định dạng chiếu.';
  if (!values.audioOptions.length) errors.audioOptions = 'Chọn ít nhất một tùy chọn âm thanh.';
  if (!values.description.trim()) {
    errors.description = 'Mô tả phim không được để trống';
  }

  const genres = parseGenres(values.genresInput);
  if (genres.length === 0) {
    errors.genresInput = 'Vui lòng nhập hoặc chọn ít nhất một thể loại';
  }

  const durationNum = Number(values.duration);
  if (!values.duration || Number.isNaN(durationNum) || durationNum <= 0) {
    errors.duration = 'Thời lượng phim phải là số lớn hơn 0 phút';
  }

  if (!values.releaseDate || Number.isNaN(Date.parse(values.releaseDate))) {
    errors.releaseDate = 'Vui lòng chọn ngày khởi chiếu hợp lệ';
  }

  const poster = values.posterUrl.trim();
  if (!poster) {
    errors.posterUrl = 'URL ảnh poster không được để trống';
  } else if (!/^https?:\/\/.+/i.test(poster)) {
    errors.posterUrl = 'URL ảnh poster phải bắt đầu bằng http:// hoặc https://';
  }

  const backdrop = values.backdropUrl.trim();
  if (backdrop && !/^https?:\/\/.+/i.test(backdrop)) {
    errors.backdropUrl = 'URL ảnh nền ngang phải bắt đầu bằng http:// hoặc https://';
  }

  const youtubeId = extractYoutubeId(values.trailerInput);
  if (!values.trailerInput.trim()) {
    errors.trailerInput = 'Link hoặc ID trailer YouTube không được để trống';
  } else if (!youtubeId) {
    errors.trailerInput = 'Không tách được YouTube ID hợp lệ từ link hoặc mã bạn nhập';
  }

  return errors;
}

// form tạo mới hoặc chỉnh sửa phim dành cho admin
export function MovieForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [loadingMovie, setLoadingMovie] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);
  const [backdropLoadFailed, setBackdropLoadFailed] = useState(false);
  const [fetchingTmdb, setFetchingTmdb] = useState(false);
  const [tmdbCandidates, setTmdbCandidates] = useState([]);
  const [tmdbBackdropCandidates, setTmdbBackdropCandidates] = useState([]);

  // tách YouTube ID trực tiếp từ ô nhập trailer để xem trước
  const extractedYoutubeId = useMemo(
    () => extractYoutubeId(values.trailerInput),
    [values.trailerInput]
  );

  // danh sách thể loại hiện tại đang có trong ô nhập
  const selectedGenres = useMemo(
    () => parseGenres(values.genresInput),
    [values.genresInput]
  );

  // nếu đang ở chế độ sửa phim thì tải dữ liệu cũ từ server đổ vào form
  useEffect(() => {
    if (!isEdit) return undefined;

    const controller = new AbortController();
    setLoadingMovie(true);
    setLoadError('');

    api
      .get(`/movies/${id}`, { signal: controller.signal })
      .then(({ data }) => {
        const movie = data?.data;
        if (!movie) {
          setLoadError('Không tìm thấy thông tin phim.');
          return;
        }
        const dateStr = movie.releaseDate ? new Date(movie.releaseDate).toISOString().slice(0, 10) : '';
        setValues({
          title: movie.title || '',
          description: movie.description || '',
          genresInput: Array.isArray(movie.genres) ? movie.genres.join(', ') : '',
          duration: movie.duration ? String(movie.duration) : '',
          releaseDate: dateStr,
          status: movie.status === 'coming_soon' ? 'coming_soon' : 'now_showing',
          ageRating: AGE_RATINGS.includes(movie.ageRating) ? movie.ageRating : 'P',
          formats: Array.isArray(movie.formats) && movie.formats.length ? movie.formats : ['2D'],
          audioOptions: Array.isArray(movie.audioOptions) && movie.audioOptions.length ? movie.audioOptions : ['subtitled'],
          posterUrl: movie.posterUrl || '',
          posterUrls: Array.isArray(movie.posterUrls) ? movie.posterUrls : [],
          backdropUrl: movie.backdropUrl || '',
          tmdbId: movie.tmdbId || null,
          trailerInput: movie.trailerYoutubeId || '',
        });
        setTmdbCandidates(
          [movie.posterUrl, ...(Array.isArray(movie.posterUrls) ? movie.posterUrls : [])].filter(Boolean)
        );
        setTmdbBackdropCandidates(movie.backdropUrl ? [movie.backdropUrl] : []);
        setPosterLoadFailed(false);
        setBackdropLoadFailed(false);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được dữ liệu phim để sửa.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingMovie(false);
        }
      });

    return () => controller.abort();
  }, [id, isEdit]);

  // cập nhật từng trường controlled input và xóa lỗi cũ của trường đó
  const handleChange = (field) => (event) => {
    const nextValue = event.target.value;
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    if (field === 'posterUrl') {
      setPosterLoadFailed(false);
    }
    if (field === 'backdropUrl') {
      setBackdropLoadFailed(false);
    }
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // bấm chọn nhanh thể loại từ danh sách gợi ý
  const handleToggleGenre = (genre) => {
    const exists = selectedGenres.includes(genre);
    const nextList = exists
      ? selectedGenres.filter((item) => item !== genre)
      : [...selectedGenres, genre];

    setValues((prev) => ({ ...prev, genresInput: nextList.join(', ') }));
    if (errors.genresInput) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.genresInput;
        return copy;
      });
    }
  };

  // bấm lấy bộ poster tiếng Việt từ TMDB theo tên phim đang nhập
  const handleFetchTmdbPosters = async () => {
    const query = values.title.trim();
    if (!query) {
      toast.error('Vui lòng nhập tên phim trước khi tìm poster TMDB.');
      return;
    }

    setFetchingTmdb(true);
    try {
      const { data } = await api.get('/movies/tmdb/posters', { params: { q: query } });
      const payload = data?.data;
      if (!payload || !payload.posterUrl) {
        toast.error('Không tìm thấy poster phù hợp trên TMDB.');
        return;
      }

      const candidates = Array.isArray(payload.candidates) && payload.candidates.length > 0
        ? payload.candidates
        : [payload.posterUrl, ...(payload.posterUrls || [])].filter(Boolean);

      const backdropCandidates = Array.isArray(payload.backdropCandidates) && payload.backdropCandidates.length > 0
        ? payload.backdropCandidates
        : payload.backdropUrl
        ? [payload.backdropUrl]
        : [];

      setValues((prev) => ({
        ...prev,
        posterUrl: payload.posterUrl,
        posterUrls: payload.posterUrls || [],
        backdropUrl: payload.backdropUrl || prev.backdropUrl,
        tmdbId: payload.tmdbId || null,
      }));
      setTmdbCandidates(candidates);
      setTmdbBackdropCandidates(backdropCandidates);
      setPosterLoadFailed(false);
      setBackdropLoadFailed(false);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.posterUrl;
        delete copy.backdropUrl;
        return copy;
      });
      toast.success(
        backdropCandidates.length > 0
          ? `Đã lấy ${candidates.length} poster và ${backdropCandidates.length} ảnh nền ngang từ TMDB.`
          : `Đã lấy ${candidates.length} poster từ TMDB.`
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không lấy được poster từ TMDB.'));
    } finally {
      setFetchingTmdb(false);
    }
  };

  // bật/tắt poster phụ trong danh sách luân phiên
  const handleToggleExtraPoster = (url) => {
    if (url === values.posterUrl.trim()) return;
    setValues((prev) => {
      const exists = prev.posterUrls.includes(url);
      const next = exists
        ? prev.posterUrls.filter((item) => item !== url)
        : [...prev.posterUrls, url].slice(0, 6);
      return { ...prev, posterUrls: next };
    });
  };

  // gửi dữ liệu tạo/cập nhật phim lên API
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = validateMovieForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      genres: parseGenres(values.genresInput),
      duration: Number(values.duration),
      releaseDate: values.releaseDate,
      status: values.status,
      ageRating: values.ageRating,
      formats: values.formats,
      audioOptions: values.audioOptions,
      posterUrl: values.posterUrl.trim(),
      ...(values.posterUrls.length > 0 ? { posterUrls: values.posterUrls } : {}),
      backdropUrl: values.backdropUrl.trim(),
      ...(values.tmdbId ? { tmdbId: values.tmdbId } : {}),
      trailerYoutubeId: extractedYoutubeId,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/movies/${id}`, payload);
        toast.success('Cập nhật phim thành công.');
      } else {
        await api.post('/movies', payload);
        toast.success('Tạo phim mới thành công.');
      }
      navigate('/admin/movies');
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Không thể lưu thông tin phim.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMovie) {
    return (
      <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-900">
        <Spinner label="Đang tải thông tin phim..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{loadError}</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/admin/movies')}>
            Quay lại danh sách phim
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {/* tiêu đề trang và nút quay lại */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-300">Quản lý phim</p>
          <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
            {isEdit ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
          </h2>
        </div>
        <Button variant="secondary" onClick={() => navigate('/admin/movies')} disabled={submitting}>
          Quay lại danh sách
        </Button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        {/* cột bên trái: các trường nhập liệu */}
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card lg:col-span-2">
          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              {submitError}
            </div>
          )}

          <FormField
            label="Tên phim"
            name="title"
            value={values.title}
            onChange={handleChange('title')}
            placeholder="Ví dụ: Dune: Hành Tinh Cát"
            error={errors.title}
            required
          />

          <FormField
            label="Mô tả nội dung"
            name="description"
            type="textarea"
            rows={4}
            value={values.description}
            onChange={handleChange('description')}
            placeholder="Nhập tóm tắt nội dung bộ phim..."
            error={errors.description}
            required
          />

          <div className="space-y-2">
            <FormField
              label="Thể loại (cách nhau bởi dấu phẩy)"
              name="genresInput"
              value={values.genresInput}
              onChange={handleChange('genresInput')}
              placeholder="Ví dụ: Hành động, Phiêu lưu"
              error={errors.genresInput}
              required
            />
            {/* gợi ý bấm chọn nhanh các thể loại phổ biến */}
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleToggleGenre(genre)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {active ? `✓ ${genre}` : `+ ${genre}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset><legend className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Định dạng chiếu</legend><div className="flex flex-wrap gap-3">{['2D', '3D', 'IMAX'].map((format) => <label key={format} className="inline-flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={values.formats.includes(format)} onChange={(event) => setValues((current) => ({ ...current, formats: event.target.checked ? [...current.formats, format] : current.formats.filter((item) => item !== format) }))} className="accent-rose-600" />{format}</label>)}</div>{errors.formats && <p role="alert" className="mt-1 text-xs text-red-600">{errors.formats}</p>}</fieldset>
            <fieldset><legend className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">Âm thanh</legend><div className="flex flex-wrap gap-3">{[{value:'subtitled', label:'Phụ đề'}, {value:'dubbed', label:'Thuyết minh'}].map((option) => <label key={option.value} className="inline-flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={values.audioOptions.includes(option.value)} onChange={(event) => setValues((current) => ({ ...current, audioOptions: event.target.checked ? [...current.audioOptions, option.value] : current.audioOptions.filter((item) => item !== option.value) }))} className="accent-rose-600" />{option.label}</label>)}</div>{errors.audioOptions && <p role="alert" className="mt-1 text-xs text-red-600">{errors.audioOptions}</p>}</fieldset>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              label="Thời lượng (phút)"
              name="duration"
              type="number"
              min="1"
              value={values.duration}
              onChange={handleChange('duration')}
              placeholder="120"
              error={errors.duration}
              required
            />

            <FormField
              label="Ngày khởi chiếu"
              name="releaseDate"
              type="date"
              value={values.releaseDate}
              onChange={handleChange('releaseDate')}
              error={errors.releaseDate}
              required
            />

            <div className="space-y-1.5">
              <label
                htmlFor="movie-status-select"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-200"
              >
                Trạng thái <span className="text-red-500">*</span>
              </label>
              <select
                id="movie-status-select"
                name="status"
                value={values.status}
                onChange={handleChange('status')}
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100"
              >
                <option value="now_showing">Đang chiếu</option>
                <option value="coming_soon">Sắp chiếu</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="movie-age-rating-select"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-200"
              >
                Phân loại tuổi <span className="text-red-500">*</span>
              </label>
              <select
                id="movie-age-rating-select"
                name="ageRating"
                value={values.ageRating}
                onChange={handleChange('ageRating')}
                className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100"
              >
                {AGE_RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} - {AGE_RATING_META[rating].title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FormField
                  label="URL ảnh Poster"
                  name="posterUrl"
                  value={values.posterUrl}
                  onChange={handleChange('posterUrl')}
                  placeholder="https://example.com/poster.jpg"
                  error={errors.posterUrl}
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={fetchingTmdb}
                onClick={handleFetchTmdbPosters}
                className="shrink-0 sm:mb-0.5"
              >
                Lấy poster từ TMDB (VI)
              </Button>
            </div>

            {tmdbCandidates.length > 1 && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Poster luân phiên từ TMDB ({values.posterUrls.length} ảnh phụ đang bật):
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {tmdbCandidates.map((url, idx) => {
                    const isPrimary = url === values.posterUrl.trim();
                    const isExtraSelected = values.posterUrls.includes(url);
                    return (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => handleToggleExtraPoster(url)}
                        title={
                          isPrimary
                            ? 'Poster chính'
                            : isExtraSelected
                            ? 'Bấm để bỏ khỏi danh sách luân phiên'
                            : 'Bấm để thêm vào danh sách luân phiên'
                        }
                        className={`relative aspect-[2/3] overflow-hidden rounded-lg border-2 transition ${
                          isPrimary
                            ? 'border-brand-600 ring-2 ring-brand-500/40'
                            : isExtraSelected
                            ? 'border-emerald-500'
                            : 'border-transparent opacity-50 hover:opacity-80'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Poster TMDB ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {isPrimary && (
                          <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1 py-0.5 text-[10px] font-bold text-white">
                            Chính
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <FormField
              label="URL ảnh nền ngang (Backdrop)"
              name="backdropUrl"
              value={values.backdropUrl}
              onChange={handleChange('backdropUrl')}
              placeholder="https://image.tmdb.org/t/p/w1280/..."
              helperText="Ảnh khổ ngang 16:9 dùng làm nền cho Banner trang chủ và trang chi tiết phim"
              error={errors.backdropUrl}
            />

            {tmdbBackdropCandidates.length > 1 && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Chọn ảnh nền ngang từ TMDB:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tmdbBackdropCandidates.map((url, idx) => {
                    const isSelected = url === values.backdropUrl.trim();
                    return (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setValues((prev) => ({ ...prev, backdropUrl: url }));
                          setBackdropLoadFailed(false);
                        }}
                        className={`relative aspect-video overflow-hidden rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-brand-600 ring-2 ring-brand-500/40'
                            : 'border-transparent opacity-65 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Backdrop TMDB ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {isSelected && (
                          <span className="absolute bottom-1 left-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Đang chọn
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <FormField
            label="Link YouTube Trailer (hoặc YouTube ID)"
            name="trailerInput"
            value={values.trailerInput}
            onChange={handleChange('trailerInput')}
            placeholder="https://www.youtube.com/watch?v=... hoặc youtu.be/..."
            helperText={
              extractedYoutubeId
                ? `Đã nhận diện YouTube ID: ${extractedYoutubeId}`
                : 'Dán link YouTube đầy đủ hoặc nhập trực tiếp 11 ký tự ID'
            }
            error={errors.trailerInput}
            required
          />

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/movies')}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Lưu thay đổi' : 'Tạo phim'}
            </Button>
          </div>
        </div>

        {/* cột bên phải: xem trước poster và trailer */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Xem trước Poster</h3>
            <div className="mt-3 flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              {values.posterUrl.trim() && !posterLoadFailed ? (
                <img
                  src={values.posterUrl.trim()}
                  alt={values.title || 'Poster xem trước'}
                  onError={() => setPosterLoadFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <p className="px-4 text-center text-xs text-slate-400">
                  {posterLoadFailed
                    ? 'Không tải được ảnh từ URL này. Vui lòng kiểm tra lại đường dẫn.'
                    : 'Dán URL ảnh poster để xem trước tại đây'}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Xem trước ảnh nền ngang
            </h3>
            <div className="mt-3 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              {values.backdropUrl.trim() && !backdropLoadFailed ? (
                <img
                  src={values.backdropUrl.trim()}
                  alt={values.title || 'Backdrop xem trước'}
                  onError={() => setBackdropLoadFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <p className="px-4 text-center text-xs text-slate-400">
                  {backdropLoadFailed
                    ? 'Không tải được ảnh nền từ URL này.'
                    : 'Bấm lấy TMDB hoặc dán URL ảnh ngang 16:9 tại đây'}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Xem trước Trailer
            </h3>
            {extractedYoutubeId ? (
              <div className="mt-3 space-y-2">
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <img
                    src={getYoutubeThumbnailUrl(extractedYoutubeId)}
                    alt="Thumbnail trailer YouTube"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Mã YouTube sẽ lưu: <code className="font-mono">{extractedYoutubeId}</code>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                Chưa có YouTube ID hợp lệ. Hệ thống tự tách ID từ link youtube.com hoặc youtu.be.
              </p>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

export default MovieForm;
