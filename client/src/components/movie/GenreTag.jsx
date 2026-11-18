import React from 'react';

// Component hiển thị nhãn thể loại phim dạng viên thuốc (badge/pill)
export function GenreTag({ genre, className = '' }) {
  // nếu không truyền thể loại thì không render gì cả
  if (!genre) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${className}`}
    >
      {genre}
    </span>
  );
}

export default GenreTag;
