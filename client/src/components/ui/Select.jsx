import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

// component dropdown Select tùy chỉnh thay thế select mặc định để đồng bộ theme Cinema Dark
export function Select({
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Chọn...',
  ariaLabel,
  disabled = false,
  align = 'left',
  className = '',
  buttonClassName = '',
}) {
  const generatedId = useId();
  const listboxId = `select-listbox-${generatedId}`;
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // chuẩn hóa danh sách options về dạng { value, label } kể cả khi truyền mảng string
  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      ),
    [options]
  );

  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  // tự đóng menu khi người dùng bấm ra ngoài vùng select
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  // đồng bộ vị trí highlight về mục đang chọn mỗi lần mở dropdown
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // xác nhận lựa chọn mới, đóng danh sách và trả focus về nút mở
  const handleSelectOption = (option) => {
    if (!option) return;
    onChange?.(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // hỗ trợ điều hướng danh sách bằng bàn phím (mũi tên lên/xuống, Home, End, Esc, Enter)
  const handleTriggerKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (normalizedOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % normalizedOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (normalizedOptions.length > 0) {
        setActiveIndex((prev) => (prev - 1 + normalizedOptions.length) % normalizedOptions.length);
      }
    } else if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && isOpen && normalizedOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(normalizedOptions.length - 1);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    } else if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      const targetOption = normalizedOptions[activeIndex];
      if (targetOption) handleSelectOption(targetOption);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* nút kích hoạt dropdown với chuẩn ARIA combobox */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-left text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:border-neutral-500 dark:focus-visible:ring-offset-cinema-bg ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-150 dark:text-neutral-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* danh sách tùy chọn thả xuống khi dropdown đang mở */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`cinema-fade-enter absolute top-full z-50 mt-2 max-h-64 min-w-full overflow-y-auto rounded-xl border border-neutral-300 bg-white p-1.5 shadow-xl dark:border-cinema-border dark:bg-cinema-card dark:shadow-cinema-card ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === activeIndex;
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelectOption(option)}
                className={`flex min-h-[40px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-brand-600/15 font-semibold text-brand-700 dark:bg-brand-600/25 dark:text-brand-200'
                    : isHighlighted
                    ? 'bg-neutral-100 text-neutral-950 dark:bg-cinema-elevated dark:text-white'
                    : 'text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-cinema-elevated dark:hover:text-white'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Select;
