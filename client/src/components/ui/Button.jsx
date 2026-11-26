import React from 'react';
import Spinner from './Spinner';

// style nền, Focus ring và hiệu ứng nhấn dùng chung cho mọi biến thể nút
const BASE_BUTTON_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-cinema-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:hover:translate-y-0';

// bảng màu các biến thể nút theo hệ màu Cinema Dark (đỏ đô CTA, vàng VIP, trung tính tối)
const VARIANT_CLASSES = {
  primary:
    'bg-brand-600 text-white border-brand-500/50 shadow-cinema-cta hover:bg-brand-700 hover:-translate-y-[1px] active:bg-brand-800',
  secondary:
    'bg-white text-neutral-900 border-neutral-300 shadow-sm hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.45)] dark:hover:bg-neutral-700 dark:hover:border-neutral-500',
  outline:
    'bg-transparent text-neutral-900 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800/85 dark:text-neutral-100 dark:border-neutral-600/85 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.45)] dark:hover:bg-neutral-700 dark:hover:border-neutral-400',
  ghost:
    'bg-transparent text-neutral-800 border-transparent hover:bg-neutral-200/80 hover:text-neutral-950 dark:text-neutral-100 dark:hover:bg-cinema-elevated dark:hover:text-white',
  danger:
    'bg-red-600 text-white border-red-500/40 shadow-sm hover:bg-red-700 hover:-translate-y-[1px] active:bg-red-800',
  vip:
    'bg-amber-500 text-neutral-950 border-amber-400/70 shadow-cinema-vip hover:bg-amber-400 hover:-translate-y-[1px] active:bg-amber-600',
};

// kích thước chuẩn đảm bảo vùng chạm tối thiểu trên mobile
const SIZE_CLASSES = {
  sm: 'min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

// ghép chuỗi class nút dùng chung cho cả Button lẫn Link đóng vai nút
export function getButtonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
} = {}) {
  return `${BASE_BUTTON_CLASSES} ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${
    SIZE_CLASSES[size] || SIZE_CLASSES.md
  } ${fullWidth ? 'w-full' : ''} ${className}`.trim();
}

// component Button chuẩn hóa trạng thái loading kèm Spinner và disable tự động
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={getButtonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Spinner size="sm" tone="current" label="" />}
      {children}
    </button>
  );
}

export default Button;
