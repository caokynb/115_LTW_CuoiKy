import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDebounce } from '../hooks/useDebounce';
import {
  MovieGrid,
  SearchBar,
  GenreFilter,
  DateFilter,
} from '../components/movie';
import { Pagination, Button } from '../components/ui';

export function Movies() {
  // lấy và cập nhật query params trên URL để khi f5 lại trang vẫn giữ đúng bộ lọc
  const [searchParams, setSearchParams] = useSearchParams();

  // lấy các bộ lọc từ URL
  const currentTab = searchParams.get('status') === 'coming_soon' ? 'coming_soon' : 'now_showing';
  const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const currentQ = searchParams.get('q') || '';
  const currentGenre = searchParams.get('genre') || '';
  const currentDate = searchParams.get('date') || '';

  // lưu từ khóa gõ vào ô tìm kiếm và debounce 400ms để không spam API liên tục khi đang gõ
  const [searchInput, setSearchInput] = useState(currentQ);
  const debouncedSearch = useDebounce(searchInput, 400);

  // đồng bộ lại ô nhập nếu query trên URL thay đổi (như bấm back/forward)
  useEffect(() => {
    setSearchInput(currentQ);
  }, [currentQ]);

  // sau 400ms ngừng gõ thì mới đẩy từ khóa lên URL
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== currentQ) {
      const nextParams = new URLSearchParams(searchParams);
      if (trimmed) {
        nextParams.set('q', trimmed);
      } else {
        nextParams.delete('q');
      }
      nextParams.set('page', '1');
      setSearchParams(nextParams);
    }
  }, [debouncedSearch, currentQ, searchParams, setSearchParams]);

  // gom tham số gọi API danh sách phim
  const fetchParams = useMemo(() => {
    const params = {
      status: currentTab,
      page: currentPage,
      limit: 8,
    };
    if (currentQ) params.q = currentQ;
    if (currentGenre) params.genre = currentGenre;
    if (currentDate) params.date = currentDate;
    return params;
  }, [currentTab, currentPage, currentQ, currentGenre, currentDate]);

  // gọi API /movies bằng hook useFetch dùng chung của dự án
  const { data, loading, error, refetch } = useFetch('/movies', {
    params: fetchParams,
  });

  // gọi API lấy danh sách thể loại kèm số lượng phim để đổ vào bộ lọc
  const { data: genresResponse } = useFetch('/movies/genres');
  const dynamicGenres = useMemo(() => {
    const raw = genresResponse?.data;
    if (!Array.isArray(raw)) return undefined;
    const valid = raw.filter((item) => item && typeof item.genre === 'string');
    return valid.length > 0 ? valid : undefined;
  }, [genresResponse]);

  // danh sách phim trả về từ backend
  const movies = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  // cờ kiểm tra xem người dùng có đang áp dụng bộ lọc nào không
  const hasActiveFilters = Boolean(currentQ || currentGenre || currentDate);

  // đổi tab Đang chiếu / Sắp chiếu thì reset về trang 1
  const handleTabChange = (tabName) => {
    if (tabName === currentTab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('status', tabName);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // chọn thể loại thì lưu lên URL và về trang 1
  const handleGenreChange = (newGenre) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newGenre) {
      nextParams.set('genre', newGenre);
    } else {
      nextParams.delete('genre');
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // chọn ngày chiếu thì lưu lên URL và về trang 1
  const handleDateChange = (newDate) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newDate) {
      nextParams.set('date', newDate);
    } else {
      nextParams.delete('date');
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // xóa hết bộ lọc tìm kiếm
  const handleClearAllFilters = () => {
    setSearchInput('');
    const nextParams = new URLSearchParams();
    nextParams.set('status', currentTab);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // chuyển trang thì cuộn nhẹ lên đầu lưới phim
  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', newPage.toString());
    setSearchParams(nextParams);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  return (
    <div className="w-full py-2">
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
        <div className="inline-flex w-full rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800 sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange('now_showing')}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial ${currentTab === 'now_showing'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            Đang chiếu
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('coming_soon')}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial ${currentTab === 'coming_soon'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            Sắp chiếu
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc: Tìm kiếm theo tên + Lọc thể loại + Lọc ngày chiếu */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* ô tìm kiếm có debounce */}
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Tìm kiếm phim theo tên..."
          />

          {/* chọn thể loại */}
          <GenreFilter
            selectedGenre={currentGenre}
            onSelectGenre={handleGenreChange}
            genres={dynamicGenres}
          />

          {/* chọn ngày chiếu */}
          <DateFilter
            selectedDate={currentDate}
            onSelectDate={handleDateChange}
          />

          {/* nút xóa lọc nhanh khi đang lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-all whitespace-nowrap"
            >
              <svg
                className="mr-1.5 h-3.5 w-3.5 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* danh sách các bộ lọc đang áp dụng */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
            <span>Đang lọc:</span>
            {currentQ && (
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                Từ khóa: "{currentQ}"
              </span>
            )}
            {currentGenre && (
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                Thể loại: {currentGenre}
              </span>
            )}
            {currentDate && (
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                Ngày: {currentDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hiển thị số lượng phim tìm thấy */}
      {!loading && !error && (
        <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          Hiển thị {movies.length} / tổng số {total} bộ phim
        </div>
      )}

      {/* Xử lý trường hợp lỗi mạng hoặc server die */}
      {error && (
        <div
          role="alert"
          className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
        >
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Có lỗi xảy ra khi tải danh sách phim: {error.message || 'Không thể kết nối tới máy chủ.'}
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Thử tải lại
            </Button>
          </div>
        </div>
      )}

      {/* Lưới phim: tự hiển thị skeleton khi đang loading hoặc thông báo rỗng */}
      {!error && (
        <MovieGrid
          movies={movies}
          loading={loading}
          emptyTitle={
            hasActiveFilters
              ? 'Không tìm thấy bộ phim phù hợp'
              : currentTab === 'now_showing'
                ? 'Hiện chưa có phim nào đang chiếu'
                : 'Hiện chưa có phim nào sắp chiếu'
          }
          emptyDescription={
            hasActiveFilters
              ? 'Vui lòng thử thay đổi từ khóa tìm kiếm, thể loại hoặc xóa bộ lọc để xem các phim khác.'
              : 'Danh sách phim sẽ sớm được cập nhật. Bạn vui lòng quay lại sau nhé!'
          }
          emptyAction={
            hasActiveFilters
              ? { label: 'Xóa bộ lọc', onClick: handleClearAllFilters }
              : null
          }
        />
      )}

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
