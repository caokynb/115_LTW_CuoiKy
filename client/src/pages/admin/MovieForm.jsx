import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { Button, FormField, Spinner, useToast } from '../../components/ui';
import { DEFAULT_GENRES } from '../../components/movie';
import { extractYoutubeId, getYoutubeThumbnailUrl } from '../../utils/youtube';

const INITIAL_VALUES = {
  title: '',
  description: '',
  genresInput: '',
  duration: '',
  releaseDate: '',
  status: 'now_showing',
  posterUrl: '',
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
          posterUrl: movie.posterUrl || '',
          trailerInput: movie.trailerYoutubeId || '',
        });
        setPosterLoadFailed(false);
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
      posterUrl: values.posterUrl.trim(),
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
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản lý phim</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
          </h2>
        </div>
        <Button variant="secondary" onClick={() => navigate('/admin/movies')} disabled={submitting}>
          Quay lại danh sách
        </Button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        {/* cột bên trái: các trường nhập liệu */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
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

          <div className="grid gap-4 sm:grid-cols-3">
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
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Trạng thái <span className="text-red-500">*</span>
              </label>
              <select
                id="movie-status-select"
                name="status"
                value={values.status}
                onChange={handleChange('status')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="now_showing">Đang chiếu</option>
                <option value="coming_soon">Sắp chiếu</option>
              </select>
            </div>
          </div>

          <FormField
            label="URL ảnh Poster"
            name="posterUrl"
            value={values.posterUrl}
            onChange={handleChange('posterUrl')}
            placeholder="https://example.com/poster.jpg"
            error={errors.posterUrl}
            required
          />

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
