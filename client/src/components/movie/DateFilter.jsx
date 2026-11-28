import React from 'react';

// component chọn ngày chiếu phim
export function DateFilter({
  selectedDate = '',
  onSelectDate,
  className = '',
}) {
  const handleClear = () => {
    if (onSelectDate) {
      onSelectDate('');
    }
  };

  return (
    <div className={`relative min-w-[160px] ${className}`}>
      <label htmlFor="date-filter-input" className="sr-only">
        Lọc theo ngày chiếu
      </label>
      <input
        id="date-filter-input"
        type="date"
        value={selectedDate}
        onChange={(e) => onSelectDate && onSelectDate(e.target.value)}
        aria-label="Lọc theo ngày chiếu"
        className="min-h-[44px] w-full cursor-pointer rounded-xl border border-neutral-300 bg-white py-2.5 pl-3.5 pr-9 text-sm text-neutral-900 transition-colors hover:border-neutral-400 focus:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:border-neutral-500 dark:focus:border-brand-400 dark:focus-visible:ring-offset-cinema-bg"
      />

      {selectedDate && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa bộ lọc ngày"
          className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default DateFilter;
