import React from 'react';

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', label = 'Đang tải...', fullScreen = false, className = '' }) {
  const spinner = (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`} role="status" aria-label={label}>
      <span
        className={`inline-block animate-spin rounded-full border-brand-600 border-t-transparent ${
          SIZE_CLASSES[size] || SIZE_CLASSES.md
        }`}
      />
      {label && size !== 'sm' && (
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
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
