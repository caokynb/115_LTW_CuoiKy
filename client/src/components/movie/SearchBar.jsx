import React from 'react';

// thanh tìm kiếm phim theo tên
export function SearchBar({
  value = '', // từ khóa tìm kiếm người dùng đang nhập
  onChange, // gọi lại mỗi khi người dùng gõ hoặc bấm xóa
  placeholder = 'Tìm kiếm tên phim...',
  className = '',
}) {
  // bấm nút x thì xóa ô tìm kiếm
  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className={`relative flex-1 ${className}`} role="search">
      {/* icon kính lúp */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
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
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/30"
      />

      {/* chỉ hiện nút xóa khi trong ô có chữ */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa từ khóa tìm kiếm"
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

export default SearchBar;
