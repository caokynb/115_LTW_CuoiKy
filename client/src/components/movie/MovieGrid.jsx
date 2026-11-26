import React from 'react';
import MovieCard from './MovieCard';
import { EmptyState, MovieCardSkeleton } from '../ui';

// Component lưới hiển thị danh sách các thẻ phim phủ đều mọi độ phân giải
export function MovieGrid({
  movies = [],
  loading = false,
  skeletonCount = 8,
  emptyTitle = 'Chưa có phim nào',
  emptyDescription = 'Hiện tại chưa có phim trong danh mục này. Vui lòng quay lại sau!',
  emptyAction = null,
}) {
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Đang tải danh sách phim"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <MovieCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const desktopCols =
    movies.length === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <div className={`grid grid-cols-1 gap-5 ${desktopCols}`}>
      {movies.map((movie) => (
        <MovieCard key={movie._id} movie={movie} />
      ))}
    </div>
  );
}

export default MovieGrid;
