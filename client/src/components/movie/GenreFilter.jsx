import React from 'react';

// danh sách các thể loại phim phổ biến
export const DEFAULT_GENRES = [
  'Hành động',
  'Phiêu lưu',
  'Khoa học viễn tưởng',
  'Hoạt hình',
  'Gia đình',
  'Kinh dị',
  'Kịch tính',
  'Tội phạm',
  'Hài hước',
  'Lãng mạn',
  'Tâm lý',
];

// component dropdown chọn thể loại phim
export function GenreFilter({
  selectedGenre = '', // thể loại đang chọn (lấy từ query URL), rỗng tương ứng với "Tất cả thể loại"
  onSelectGenre, // gọi lại khi bấm chọn một thể loại khác
  genres = DEFAULT_GENRES, // danh sách thể loại hiển thị, nếu cha không truyền thì lấy danh sách mặc định ở trên
  className = '', // class css thêm từ component cha
}) {
  return (
    <div className={`relative min-w-[160px] ${className}`}>
      <label htmlFor="genre-select" className="sr-only">
        Lọc theo thể loại
      </label>
      <select
        id="genre-select"
        value={selectedGenre}
        onChange={(e) => onSelectGenre && onSelectGenre(e.target.value)}
        aria-label="Lọc theo thể loại"
        className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30 cursor-pointer"
      >
        <option value="">Tất cả thể loại</option>
        {genres.map((item) => {
          // hỗ trợ cả dạng chuỗi đơn giản lẫn object { genre, count } từ API
          const genreName = typeof item === 'string' ? item : item?.genre;
          const count = typeof item === 'object' && item !== null ? item.count : undefined;
          if (!genreName) return null;
          return (
            <option key={genreName} value={genreName}>
              {count !== undefined ? `${genreName} (${count})` : genreName}
            </option>
          );
        })}
      </select>

      {/* mũi tên trỏ xuống */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500">
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

export default GenreFilter;
