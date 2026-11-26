import React, { useMemo } from 'react';
import { Select } from '../ui';

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

// component dropdown chọn thể loại phim đồng bộ theme và bo góc
export function GenreFilter({
  selectedGenre = '',
  onSelectGenre,
  genres = DEFAULT_GENRES,
  className = '',
}) {
  const options = useMemo(() => {
    const mapped = genres
      .map((item) => {
        const genreName = typeof item === 'string' ? item : item?.genre;
        const count = typeof item === 'object' && item !== null ? item.count : undefined;
        if (!genreName) return null;
        return {
          value: genreName,
          label: count !== undefined ? `${genreName} (${count})` : genreName,
        };
      })
      .filter(Boolean);

    return [{ value: '', label: 'Tất cả thể loại' }, ...mapped];
  }, [genres]);

  return (
    <div className={`min-w-[180px] ${className}`}>
      <label htmlFor="genre-select" className="sr-only">
        Lọc theo thể loại
      </label>
      <Select
        id="genre-select"
        value={selectedGenre}
        onChange={(nextGenre) => onSelectGenre && onSelectGenre(nextGenre)}
        options={options}
        placeholder="Tất cả thể loại"
        ariaLabel="Lọc theo thể loại"
      />
    </div>
  );
}

export default GenreFilter;
