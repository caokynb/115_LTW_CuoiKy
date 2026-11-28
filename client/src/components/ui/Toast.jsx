import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const TYPE_META = {
  success: {
    container:
      'border-emerald-200 border-l-4 border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-800/80 dark:border-l-emerald-500 dark:bg-cinema-card dark:text-emerald-200',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    container:
      'border-red-200 border-l-4 border-l-red-600 bg-red-50 text-red-950 dark:border-red-800/80 dark:border-l-red-500 dark:bg-cinema-card dark:text-red-200',
    iconColor: 'text-red-700 dark:text-red-400',
    path: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    container:
      'border-amber-300 border-l-4 border-l-amber-600 bg-amber-50 text-amber-950 dark:border-amber-800/80 dark:border-l-amber-500 dark:bg-cinema-card dark:text-amber-200',
    iconColor: 'text-amber-700 dark:text-amber-400',
    path: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  info: {
    container:
      'border-neutral-300 border-l-4 border-l-brand-600 bg-neutral-100 text-neutral-950 dark:border-cinema-border dark:border-l-brand-400 dark:bg-cinema-card dark:text-neutral-100',
    iconColor: 'text-brand-600 dark:text-brand-300',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export function Toast({ message, type = 'info', onClose, className = '' }) {
  if (!message) return null;

  const meta = TYPE_META[type] || TYPE_META.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`cinema-toast-enter flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${meta.container} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <svg
          className={`mt-0.5 h-4 w-4 shrink-0 ${meta.iconColor}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={meta.path} />
        </svg>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-80 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const toast = {
    show: showToast,
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((item) => (
          <Toast
            key={item.id}
            message={item.message}
            type={item.type}
            onClose={() => removeToast(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return context;
}

export default Toast;
