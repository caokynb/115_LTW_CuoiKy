import React from 'react';

export const AGE_RATINGS = ['P', 'K', 'T13', 'T16', 'T18', 'C'];

// thông tin mô tả và màu sắc từng nhãn phân loại độ tuổi theo chuẩn rạp Việt Nam
export const AGE_RATING_META = {
  P: {
    label: 'P',
    title: 'Phổ biến cho mọi lứa tuổi',
    description: 'Phim được phép phổ biến đến người xem ở mọi độ tuổi.',
    badgeClass: 'bg-emerald-600 text-white',
    requiresWarning: false,
  },
  K: {
    label: 'K',
    title: 'Dưới 13 tuổi cần người bảo hộ',
    description: 'Phim phổ biến đến người xem dưới 13 tuổi với điều kiện xem cùng cha, mẹ hoặc người giám hộ.',
    badgeClass: 'bg-sky-600 text-white',
    requiresWarning: false,
  },
  T13: {
    label: 'T13',
    title: 'Khán giả từ đủ 13 tuổi trở lên',
    description: 'Phim phổ biến đến người xem từ đủ 13 tuổi trở lên (13+).',
    badgeClass: 'bg-amber-500 text-slate-950',
    requiresWarning: false,
  },
  T16: {
    label: 'T16',
    title: 'Khán giả từ đủ 16 tuổi trở lên',
    description: 'Phim có nội dung dành cho khán giả từ đủ 16 tuổi trở lên (16+). Vui lòng mang theo giấy tờ tùy thân khi vào rạp.',
    badgeClass: 'bg-orange-600 text-white',
    requiresWarning: true,
  },
  T18: {
    label: 'T18',
    title: 'Khán giả từ đủ 18 tuổi trở lên',
    description: 'Phim có nội dung dành cho người trưởng thành từ đủ 18 tuổi trở lên (18+). Rạp có quyền kiểm tra giấy tờ tùy thân tại cửa soát vé.',
    badgeClass: 'bg-red-600 text-white',
    requiresWarning: true,
  },
  C: {
    label: 'C',
    title: 'Không được phép phổ biến',
    description: 'Phim thuộc diện hạn chế/cấm phổ biến rộng rãi theo quy định hiện hành.',
    badgeClass: 'bg-slate-900 text-white border border-red-500',
    requiresWarning: true,
  },
};

// badge hiển thị nhãn phân loại độ tuổi trên poster hoặc chi tiết phim
export function AgeRatingBadge({
  rating = 'P', // mã nhãn tuổi: P, K, T13, T16, T18, C
  showDescription = false, // hiện thêm tên mô tả đầy đủ cạnh badge
  className = '',
}) {
  const normalized = AGE_RATING_META[rating] ? rating : 'P';
  const meta = AGE_RATING_META[normalized];

  return (
    <span
      data-testid={`age-rating-badge-${normalized}`}
      title={meta.title}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span
        className={`inline-flex min-w-[32px] items-center justify-center rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide shadow-sm ${meta.badgeClass}`}
      >
        {meta.label}
      </span>
      {showDescription && (
        <span className="text-xs font-medium text-slate-300">{meta.title}</span>
      )}
    </span>
  );
}

export default AgeRatingBadge;
