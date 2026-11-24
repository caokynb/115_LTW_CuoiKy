import React from 'react';
import MovieCard from './MovieCard';
import { EmptyState } from '../ui';

// Component skeleton tạo hiệu ứng chờ tải dạng khung mờ (loading placeholder)
function MovieCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
      {/* Vùng ảnh poster khung mờ */}
      <div className="aspect-[2/3] w-full bg-slate-200 dark:bg-slate-800" />
      {/* Vùng nội dung chữ khung mờ */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="pt-2 mt-auto">
          <div className="h-9 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

// Component lưới hiển thị danh sách các thẻ phim
export function MovieGrid({
  movies = [],
  loading = false,
  skeletonCount = 8,
  emptyTitle = 'Chưa có phim nào',
  emptyDescription = 'Hiện tại chưa có phim trong danh mục này. Vui lòng quay lại sau!',
  emptyAction = null,
}) {
  // Khi đang tải dữ liệu thì render ra các khung skeleton mẫu
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Đang tải danh sách phim"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <MovieCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Khi tải xong mà danh sách phim rỗng thì hiển thị thông báo trống
  if (!movies || movies.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  // Render lưới phim thật, bắt buộc dùng _id của phim làm key để React tối ưu render
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {movies.map((movie) => (
        <MovieCard key={movie._id} movie={movie} />
      ))}
    </div>
  );
}

export default MovieGrid;
