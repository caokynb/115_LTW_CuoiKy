import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import { Button, EmptyState, Modal, Pagination, Spinner, useToast } from '../../components/ui';
import { GenreTag, SearchBar } from '../../components/movie';

const PAGE_SIZE = 8;

// format ngày khởi chiếu sang dạng ngày/tháng/năm của Việt Nam
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// trang quản lý danh sách phim dành cho admin
export function AdminMovies() {
  const navigate = useNavigate();
  const toast = useToast();

  // state lưu danh sách phim và thông tin phân trang từ server
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // state tìm kiếm và lọc trạng thái phim
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [statusFilter, setStatusFilter] = useState('');

  // state loading, lỗi và trigger tải lại bảng sau khi xóa
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // state cho modal xác nhận xóa phim
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // khi từ khóa tìm kiếm hoặc trạng thái thay đổi thì quay về trang 1
  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // gọi API lấy danh sách phim theo trang và từ khóa hiện tại
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');

    const params = {
      page,
      limit: PAGE_SIZE,
    };
    if (debouncedSearch.trim()) {
      params.q = debouncedSearch.trim();
    }
    if (statusFilter) {
      params.status = statusFilter;
    }

    api
      .get('/movies', { params, signal: controller.signal })
      .then(({ data }) => {
        setMovies(data.data || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error, 'Không tải được danh sách phim.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, debouncedSearch, statusFilter, refreshKey]);

  // xác nhận xóa phim qua API
  const handleDeleteMovie = async () => {
    if (!movieToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/movies/${movieToDelete._id}`);
      toast.success(`Đã xóa phim "${movieToDelete.title}".`);
      setMovieToDelete(null);

      // nếu vừa xóa phần tử cuối cùng của trang hiện tại thì lùi 1 trang
      if (movies.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        setRefreshKey((key) => key + 1);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể xóa phim này.'));
    } finally {
      setDeleting(false);
    }
  };

  // xóa nhanh các bộ lọc đang nhập
  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <section className="space-y-5">
      {/* tiêu đề trang và nút thêm phim mới */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Quản trị</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Quản lý phim</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Theo dõi, tìm kiếm, thêm mới và cập nhật danh sách phim trong rạp.
          </p>
        </div>
        <Button onClick={() => navigate('/admin/movies/new')}>Thêm phim</Button>
      </div>

      {/* thanh tìm kiếm theo tên và lọc trạng thái */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
        <SearchBar
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm phim theo tên..."
        />

        <div className="sm:w-48">
          <label htmlFor="admin-movie-status" className="sr-only">
            Lọc theo trạng thái
          </label>
          <select
            id="admin-movie-status"
            value={statusFilter}
            onChange={handleStatusChange}
            aria-label="Lọc theo trạng thái phim"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="now_showing">Đang chiếu</option>
            <option value="coming_soon">Sắp chiếu</option>
          </select>
        </div>

        {(searchInput || statusFilter) && (
          <Button variant="secondary" size="sm" onClick={handleClearFilters}>
            Xóa lọc
          </Button>
        )}
      </div>

      {/* thông báo lỗi nếu gọi API thất bại */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <span>{loadError}</span>
          <Button size="sm" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      {/* bảng danh sách phim */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner label="Đang tải danh sách phim..." />
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            title={searchInput || statusFilter ? 'Không tìm thấy phim phù hợp' : 'Chưa có bộ phim nào'}
            description={
              searchInput || statusFilter
                ? 'Thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc để xem toàn bộ phim.'
                : 'Hãy thêm bộ phim đầu tiên để bắt đầu lên lịch chiếu.'
            }
            action={
              searchInput || statusFilter ? (
                <Button variant="secondary" onClick={handleClearFilters}>
                  Xóa bộ lọc
                </Button>
              ) : (
                <Button onClick={() => navigate('/admin/movies/new')}>Thêm phim</Button>
              )
            }
          />
        ) : (
          <>
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Hiển thị {movies.length} / tổng số {total} phim (trang {page}/{pages})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Phim</th>
                    <th className="px-4 py-3 font-semibold">Thể loại</th>
                    <th className="px-4 py-3 font-semibold">Thời lượng</th>
                    <th className="px-4 py-3 font-semibold">Khởi chiếu</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movies.map((movie) => {
                    const isNowShowing = movie.status === 'now_showing';
                    return (
                      <tr
                        key={movie._id}
                        className="text-slate-700 hover:bg-slate-50/70 dark:text-slate-200 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="h-14 w-10 shrink-0 rounded-md border border-slate-200 object-cover bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                            />
                            <span className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                              {movie.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(movie.genres || []).slice(0, 2).map((genre) => (
                              <GenreTag key={genre} genre={genre} />
                            ))}
                            {(movie.genres || []).length > 2 && (
                              <span className="text-xs text-slate-400">
                                +{movie.genres.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{movie.duration} phút</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(movie.releaseDate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isNowShowing
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {isNowShowing ? 'Đang chiếu' : 'Sắp chiếu'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/admin/movies/${movie._id}/edit`)}
                            >
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setMovieToDelete(movie)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* thanh phân trang gọi server khi chuyển trang */}
      {!loading && pages > 1 && (
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      )}

      {/* modal xác nhận trước khi xóa phim */}
      <Modal
        isOpen={Boolean(movieToDelete)}
        onClose={() => !deleting && setMovieToDelete(null)}
        title="Xác nhận xóa phim"
        size="sm"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bạn có chắc muốn xóa phim <strong>{movieToDelete?.title}</strong>? Phim còn suất chiếu trong
          tương lai sẽ bị từ chối xóa.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setMovieToDelete(null)}
            disabled={deleting}
          >
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteMovie} loading={deleting}>
            Xóa phim
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default AdminMovies;
