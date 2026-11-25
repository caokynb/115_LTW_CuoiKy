import { extractYoutubeId, getYoutubeThumbnailUrl } from './youtube';

describe('youtube utils', () => {
  test('nhận trực tiếp YouTube ID 11 ký tự hợp lệ', () => {
    expect(extractYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('tách được ID từ link youtube.com/watch?v=...', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=Way9Dexny3w&t=15s')).toBe(
      'Way9Dexny3w'
    );
  });

  test('tách được ID từ link rút gọn youtu.be', () => {
    expect(extractYoutubeId('https://youtu.be/U2Qp5pL3ovA?si=abc123')).toBe('U2Qp5pL3ovA');
  });

  test('tách được ID từ link embed và shorts', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/tgbNymZ7vqY')).toBe('tgbNymZ7vqY');
    expect(extractYoutubeId('https://youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk');
  });

  test('trả về chuỗi rỗng nếu link không hợp lệ hoặc rỗng', () => {
    expect(extractYoutubeId('')).toBe('');
    expect(extractYoutubeId('https://vimeo.com/123456')).toBe('');
    expect(extractYoutubeId('khong-phai-youtube')).toBe('');
  });

  test('tạo đúng URL ảnh thumbnail YouTube', () => {
    expect(getYoutubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(getYoutubeThumbnailUrl('invalid')).toBe('');
  });
});
