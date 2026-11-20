import React from 'react';

// component chọn ngày chiếu phim
export function DateFilter({
  selectedDate = '', // ngày đang chọn kiểu YYYY-MM-DD, mặc định sẽ là để rỗng
  onSelectDate, // gọi lại
  className = '',
}) {
  // bấm nút x thì xóa ngày đang chọn
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
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-9 text-sm text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-500/30 cursor-pointer"
      />

      {/* chỉ hiện nút xóa khi đã chọn ngày */}
      {selectedDate && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa bộ lọc ngày"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
