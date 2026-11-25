import React, { useEffect } from 'react';

// Component Modal xem trailer nhúng từ YouTube
export function TrailerModal({ isOpen, onClose, youtubeId, movieTitle }) {
  // Lắng nghe phím Escape và khóa cuộn trang khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    // bấm nút Esc trên bàn phím thì tắt modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
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
    };
  }, [isOpen, onClose]);

  // nếu chưa mở hoặc không có ID video thì không render gì cả
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        // bấm vào khoảng tối bên ngoài thì đóng modal
        if (onClose) onClose();
      }}
    >
      {/* Khung chứa video, chặn nổi bọt sự kiện click để bấm vào video không bị tắt */}
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh tiêu đề phía trên cùng nút đóng */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 text-white">
          <h3 className="truncate text-base font-semibold text-slate-100">
            Trailer: {movieTitle || 'Xem Trailer'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Đóng trailer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
