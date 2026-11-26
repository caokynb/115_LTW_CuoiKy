import React from 'react';

// Component hiển thị nhãn thể loại phim dạng viên thuốc (badge/pill)
export function GenreTag({ genre, className = '' }) {
  if (!genre) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800 transition-colors dark:border-neutral-600/80 dark:bg-neutral-800 dark:text-neutral-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.4)] ${className}`}
    >
      {genre}
    </span>
  );
}

export default GenreTag;
