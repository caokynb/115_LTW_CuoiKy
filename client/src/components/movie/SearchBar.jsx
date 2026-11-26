import React from 'react';

// thanh tìm kiếm phim theo tên
export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Tìm kiếm tên phim...',
  className = '',
}) {
  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={`relative flex-1 ${className}`} role="search">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-500 dark:text-neutral-400">
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm kiếm phim theo tên"
        className="min-h-[44px] w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-500 transition-colors hover:border-neutral-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:hover:border-neutral-500 dark:focus:border-brand-400 dark:focus:ring-brand-500/30"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa từ khóa tìm kiếm"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
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

export default SearchBar;
