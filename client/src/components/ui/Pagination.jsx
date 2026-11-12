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

  return (
    <nav
      aria-label="Phân trang"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => handleChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Trước
      </button>

      {getVisiblePages().map((item, index) =>
        item === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => handleChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`min-w-[36px] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              item === page
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
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
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Sau
      </button>
    </nav>
  );
}

export default Pagination;
