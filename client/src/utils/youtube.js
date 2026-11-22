const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// tách mã video YouTube (11 ký tự) từ link đầy đủ hoặc chuỗi ID nhập thẳng
export function extractYoutubeId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // nếu người dùng dán sẵn đúng 11 ký tự ID hợp lệ thì trả về luôn
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalizedUrl);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    // dạng link rút gọn youtu.be/<id>
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return YOUTUBE_ID_REGEX.test(id) ? id : '';
    }

    // các dạng link youtube.com/watch?v=, /embed/, /shorts/, /live/
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) {
        return vParam;
      }

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'v', 'live'].includes(parts[0])) {
        return YOUTUBE_ID_REGEX.test(parts[1]) ? parts[1] : '';
      }
    }
  } catch {
    return '';
  }

  return '';
}

// tạo link ảnh thumbnail xem trước từ YouTube ID
export function getYoutubeThumbnailUrl(youtubeId) {
  if (!YOUTUBE_ID_REGEX.test(youtubeId || '')) return '';
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}
