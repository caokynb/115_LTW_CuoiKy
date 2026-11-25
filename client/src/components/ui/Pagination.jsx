import React from 'react';

export function Pagination({ page = 1, pages = 1, onPageChange, className = '' }) {
  if (!pages || pages <= 1) return null;

  const getVisiblePages = () => {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }

    const result = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(pages - 1, page + 1);

    if (start > 2) result.push('...');
    for (let i = start; i <= end; i += 1) {
      result.push(i);
    }
    if (end < pages - 1) result.push('...');
    result.push(pages);

    return result;
  };

  const handleChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pages || nextPage === page) return;
    if (onPageChange) onPageChange(nextPage);
  };

  const buttonBase =
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500';
  const inactiveButton =
    'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 hover:border-neutral-400 dark:border-cinema-border dark:bg-cinema-card dark:text-neutral-100 dark:hover:bg-cinema-elevated';

  return (
    <nav
      aria-label="Phân trang"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => handleChange(page - 1)}
        disabled={page <= 1}
        className={`${buttonBase} ${inactiveButton} disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
      >
        Trước
      </button>

      {getVisiblePages().map((item, index) =>
        item === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-neutral-600 dark:text-neutral-400">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => handleChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`${buttonBase} ${
              item === page
                ? 'border-brand-500/50 bg-brand-600 text-white shadow-cinema-cta'
                : inactiveButton
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => handleChange(page + 1)}
        disabled={page >= pages}
        className={`${buttonBase} ${inactiveButton} disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
      >
        Sau
      </button>
    </nav>
  );
}

export default Pagination;
