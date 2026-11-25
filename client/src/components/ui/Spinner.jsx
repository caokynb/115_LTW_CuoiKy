import React from 'react';

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

const TONE_CLASSES = {
  brand: 'border-brand-600 dark:border-brand-400 border-t-transparent',
  current: 'border-current border-t-transparent',
};

export function Spinner({
  size = 'md',
  label = 'Đang tải...',
  fullScreen = false,
  tone = 'brand',
  className = '',
}) {
  const spinner = (
    <div
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      role="status"
      aria-label={label || 'Đang tải'}
    >
      <span
        className={`inline-block animate-spin rounded-full ${
          TONE_CLASSES[tone] || TONE_CLASSES.brand
        } ${SIZE_CLASSES[size] || SIZE_CLASSES.md}`}
      />
      {label && size !== 'sm' && (
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default Spinner;
