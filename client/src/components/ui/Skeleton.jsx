import React from 'react';

// khối khung xương cơ bản tạo hiệu ứng shimmer khi dữ liệu đang tải
export function Skeleton({ className = '', rounded = 'rounded-lg', ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={`cinema-skeleton ${rounded} ${className}`}
      {...rest}
    />
  );
}

// skeleton mô phỏng thẻ phim trong lưới phim trang chủ và trang danh sách phim
export function MovieCardSkeleton() {
  return (
    <div
      data-testid="movie-card-skeleton"
      className="cinema-surface flex flex-col overflow-hidden rounded-2xl"
      aria-hidden="true"
    >
      <Skeleton className="aspect-[2/3] w-full" rounded="rounded-none" />
      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" rounded="rounded-full" />
          <Skeleton className="h-5 w-14" rounded="rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-auto pt-2">
          <Skeleton className="h-11 w-full" rounded="rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// skeleton mô phỏng màn hình chiếu và lưới ghế trong lúc tải dữ liệu phòng
export function SeatMapSkeleton({ rows = 6, cols = 10 }) {
  return (
    <div
      role="status"
      aria-label="Đang tải sơ đồ ghế"
      data-testid="seat-map-skeleton"
      className="cinema-surface w-full max-w-full min-w-0 rounded-2xl p-4 sm:p-6"
    >
      <div className="mx-auto mb-6 flex max-w-xl flex-col items-center">
        <Skeleton className="h-2.5 w-4/5" rounded="rounded-full" />
        <Skeleton className="mt-2 h-3 w-20" />
      </div>

      <div className="w-full overflow-x-auto pb-2">
        <div className="mx-auto flex min-w-fit flex-col items-center gap-2">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={`seat-row-skeleton-${rowIdx}`} className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" rounded="rounded" />
              <div className="flex gap-1.5">
                {Array.from({ length: cols }).map((__, colIdx) => (
                  <Skeleton
                    key={`seat-cell-${rowIdx}-${colIdx}`}
                    className="h-9 w-9 sm:h-10 sm:w-10"
                    rounded="rounded-md"
                  />
                ))}
              </div>
              <Skeleton className="h-5 w-5" rounded="rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// skeleton mô phỏng bảng dữ liệu dùng chung cho các trang quản trị
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div
      role="status"
      aria-label="Đang tải bảng dữ liệu"
      data-testid="table-skeleton"
      className="cinema-surface w-full max-w-full min-w-0 overflow-hidden rounded-2xl"
    >
      <div className="w-full overflow-x-auto">
        <div className="min-w-[540px] divide-y divide-neutral-200 dark:divide-cinema-borderSubtle">
          <div className="grid grid-cols-5 gap-4 bg-neutral-100 px-4 py-3 dark:bg-cinema-elevated/80">
            {Array.from({ length: columns }).map((_, idx) => (
              <Skeleton key={`th-sk-${idx}`} className="h-4 w-24" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={`tr-sk-${rowIdx}`} className="grid grid-cols-5 items-center gap-4 px-4 py-3.5">
              {Array.from({ length: columns }).map((__, colIdx) => (
                <Skeleton
                  key={`td-sk-${rowIdx}-${colIdx}`}
                  className={`h-4 ${colIdx === 0 ? 'w-32' : 'w-20'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
