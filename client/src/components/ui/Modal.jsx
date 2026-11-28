import React, { useEffect, useId, useRef } from 'react';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'md',
  closeOnOverlayClick = true,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => !element.closest('[hidden], [aria-hidden="true"], [inert]'));

    (getFocusableElements()[0] || dialog)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && (document.activeElement === firstElement || document.activeElement === dialog)) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (document.activeElement === lastElement || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      tabIndex={-1}
      ref={dialogRef}
      onClick={() => {
        if (closeOnOverlayClick && onClose) onClose();
      }}
    >
      <div
        className={`cinema-surface cinema-modal-enter w-full rounded-2xl shadow-2xl ${
          SIZE_CLASSES[size] || SIZE_CLASSES.md
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-cinema-borderSubtle">
            {title && (
              <h2 id={titleId} className="text-lg font-bold text-neutral-900 dark:text-white">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-cinema-elevated dark:hover:text-white"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-cinema-borderSubtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
