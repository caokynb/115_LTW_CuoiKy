import React from 'react';
import Button from './Button';

export function EmptyState({
  title = 'Không có dữ liệu',
  description = '',
  icon = null,
  action = null,
  className = '',
}) {
  return (
    <div
      className={`cinema-surface flex flex-col items-center justify-center rounded-2xl border-dashed px-6 py-10 text-center ${className}`}
    >
      {icon ? (
        <div className="mb-3 text-neutral-600 dark:text-neutral-300">{icon}</div>
      ) : (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M8 12h8" />
          </svg>
        </div>
      )}

      <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
      )}

      {action && (
        <div className="mt-5">
          {React.isValidElement(action) ? (
            action
          ) : (
            <Button variant="primary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
