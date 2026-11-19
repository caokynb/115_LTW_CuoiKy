import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { MovieGrid } from '../components/movie';
import { Pagination, Button } from '../components/ui';

export function Movies() {
  // Lấy và cập nhật query params trên URL để khi f5 lại trang vẫn giữ đúng tab
  const [searchParams, setSearchParams] = useSearchParams();

  // lấy status từ URL, nếu không có thì mặc định hiển thị phim đang chiếu
  const currentTab = searchParams.get('status') === 'coming_soon' ? 'coming_soon' : 'now_showing';
  // lấy số trang từ URL, mặc định là trang 1
  const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  // gộp tham số để gọi API lấy phim theo đúng tab và phân trang
  const fetchParams = useMemo(
    () => ({
      status: currentTab,
      page: currentPage,
      limit: 8,
    }),
    [currentTab, currentPage]
  );

  // gọi API /movies bằng hook useFetch dùng chung của dự án
  const { data, loading, error, refetch } = useFetch('/movies', {
    params: fetchParams,
  });

  // danh sách phim trả về từ backend (data.data chứa mảng phim)
  const movies = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  // hàm chuyển đổi giữa 2 tab Đang chiếu và Sắp chiếu
  const handleTabChange = (tabName) => {
    if (tabName === currentTab) return;
    // đổi tab thì reset về trang 1 luôn
    setSearchParams({
      status: tabName,
      page: '1',
    });
  };

  // hàm chuyển trang khi bấm vào thanh phân trang
  const handlePageChange = (newPage) => {
    setSearchParams({
      status: currentTab,
      page: newPage.toString(),
    });
    // cuộn nhẹ lên đầu lưới phim cho người dùng dễ nhìn
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tiêu đề trang và phần chuyển tab */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Khám phá Phim
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Xem danh sách các bộ phim bom tấn đang chiếu và sắp ra mắt tại rạp
          </p>
        </div>

        {/* Thanh chọn 2 tab: Đang chiếu / Sắp chiếu */}
        <div className="inline-flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => handleTabChange('now_showing')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              currentTab === 'now_showing'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Đang chiếu
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('coming_soon')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              currentTab === 'coming_soon'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sắp chiếu
          </button>
        </div>
      </div>

      {/* Hiển thị số lượng phim tìm thấy */}
      {!loading && !error && (
        <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          Hiển thị {movies.length} / tổng số {total} bộ phim
        </div>
      )}

      {/* Xử lý trường hợp lỗi mạng hoặc server die */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Có lỗi xảy ra khi tải danh sách phim: {error.message || 'Không thể kết nối tới máy chủ.'}
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử tải lại
            </Button>
          </div>
        </div>
      )}

      {/* Lưới phim: tự hiển thị skeleton khi đang loading hoặc thông báo rỗng */}
      <MovieGrid
        movies={movies}
        loading={loading}
        emptyTitle={
          currentTab === 'now_showing'
            ? 'Hiện chưa có phim nào đang chiếu'
            : 'Hiện chưa có phim nào sắp chiếu'
        }
        emptyDescription="Danh sách phim sẽ sớm được cập nhật. Bạn vui lòng quay lại sau nhé!"
      />

      {/* Thanh phân trang ở phía dưới khi có nhiều hơn 1 trang */}
      {!loading && pages > 1 && (
        <div className="mt-10 flex justify-center">
          <Pagination
            page={currentPage}
            pages={pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default Movies;
