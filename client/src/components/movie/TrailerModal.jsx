import React, { useEffect, useId, useRef } from 'react';

// Component Modal xem trailer nhúng từ YouTube
export function TrailerModal({ isOpen, onClose, youtubeId, movieTitle }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  // Lắng nghe phím Escape và khóa cuộn trang khi mở modal
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

    // bấm nút Esc trên bàn phím thì tắt modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }

      if (e.key !== 'Tab' || !dialog) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && (document.activeElement === firstElement || document.activeElement === dialog)) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && (document.activeElement === lastElement || !dialog.contains(document.activeElement))) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // chặn cuộn trang phía sau khi đang xem video
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; //ẩn thanh cuộn và không cho phép cuộn
    window.addEventListener('keydown', handleKeyDown);//bắt hành động ấn phím của người dùng

    // dọn dẹp khi đóng modal hoặc component bị unmount
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);//dừng bắt hành động ấn phímm
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, onClose]);

  // nếu chưa mở hoặc không có ID video thì không render gì cả
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      ref={dialogRef}
      onClick={() => {
        // bấm vào khoảng tối bên ngoài thì đóng modal
        if (onClose) onClose();
      }}
    >
      {/* Khung chứa video, chặn nổi bọt sự kiện click để bấm vào video không bị tắt */}
      <div
        className="cinema-modal-enter relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cinema-border bg-cinema-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh tiêu đề phía trên cùng nút đóng */}
        <div className="flex items-center justify-between border-b border-cinema-borderSubtle px-5 py-3 text-white">
          <h3 id={titleId} className="truncate text-base font-semibold text-neutral-100">
            Trailer: {movieTitle || 'Xem Trailer'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-cinema-elevated hover:text-white"
            aria-label="Đóng trailer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Khung iframe video giữ tỉ lệ chuẩn 16:9 */}
        <div className="relative aspect-video w-full bg-black">
          {youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={`Trailer phim ${movieTitle || ''}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Không có mã YouTube cho trailer phim này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrailerModal;
