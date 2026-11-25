# AWESOME DESIGN SKILLS - CINEHUB DESIGN SPECIFICATION & GUIDELINES

Tài liệu tham chiếu thiết kế UI/UX theo chuẩn [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) và tiêu chuẩn chất lượng Web Cuối Kỳ (React + Tailwind CSS + Node.js + MongoDB).

---

## 1. Mục đích & Giới thiệu
Tài liệu này cung cấp bộ quy chuẩn thiết kế giao diện (Design System), tokens màu sắc, kích thước touch target, tiêu chuẩn tương phản (WCAG 2.2 AA), và các quy tắc Do / Don't cho toàn bộ giao diện của dự án **CineHub**.

Mọi thành viên trong nhóm (Kỳ, Tuấn Anh, Phúc, Tú) và các AI Coding Assistant cần tuân thủ bảng hướng dẫn này khi code và review các thành phần frontend.

---

## 2. Phong cách Thiết kế (Design Direction): Cinema Dark Mode & Bento Grid

- **Theme chủ đạo:** Cinema Dark (`#020617`, `#0f172a`) tạo không gian sang trọng, tập trung thị giác vào poster phim và màn hình rạp chiếu.
- **Màu điểm nhấn (Accent):**
  - **Rose 600 (`#e11d48`)**: Màu thương hiệu chính, nút Đặt vé (Primary CTA), ghế đang chọn.
  - **Amber 500 (`#f59e0b`)**: Hàng ghế VIP, vé VIP, các suất chiếu đặc biệt.
  - **Emerald 500 (`#10b981`)**: Trạng thái còn vé, đặt vé thành công, thanh toán hợp lệ.
  - **Slate 700 / Slate 800**: Ghế đã bán (vô hiệu hóa), card nền, divider.
- **Hỗ trợ Light Mode:** Đổi mượt qua `ThemeContext` bằng class `dark:` của Tailwind CSS, đảm bảo độ tương phản chữ không bị chìm ở cả 2 chế độ.

---

## 3. Hệ thống Token & Quy chuẩn UI (Design Tokens)

### 3.1. Bảng màu chuẩn trong Tailwind CSS

```javascript
// tailwind.config.js (khuyến nghị ánh xạ ngữ nghĩa)
colors: {
  cinema: {
    bg: '#020617',         // Slate 950
    card: '#0f172a',       // Slate 900
    elevated: '#1e293b',   // Slate 800
    border: '#334155',     // Slate 700
    primary: '#e11d48',    // Rose 600
    vip: '#f59e0b',        // Amber 500
    success: '#10b981',    // Emerald 500
    sold: '#475569',       // Slate 600
  }
}
```

### 3.2. Tiêu chuẩn Typography
- **Font:** Inter / sans-serif.
- **Heading 1 (Hero Title):** `text-4xl md:text-5xl font-extrabold tracking-tight text-white`
- **Heading 2 (Section Title):** `text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3`
- **Card Title:** `text-base md:text-lg font-semibold text-slate-100 line-clamp-1`
- **Body & Meta:** `text-sm text-slate-400 font-normal`
- **Price Tag:** `text-lg font-bold font-mono text-rose-500`

---

## 4. Quy chuẩn Thiết kế Component Trọng yếu

### 4.1. Sơ đồ Ghế ngồi (`SeatMap` & `Seat`)
1. **Màn hình rạp chiếu (Screen Arc):**
   - Đặt phía trên sơ đồ ghế, vẽ bằng đường cong cong mềm mại hoặc dải gradient phát sáng (`shadow-[0_4px_25px_rgba(225,29,72,0.5)]`).
   - Có nhãn chữ rõ ràng: "MÀN HÌNH / SCREEN".
2. **Quy ước màu trạng thái ghế:**
   - **Ghế thường trống:** Nền xám đen nhạt (`bg-slate-700 hover:bg-slate-600 border border-slate-600`).
   - **Ghế VIP trống:** Nền vàng đen sang trọng (`bg-amber-950/60 hover:bg-amber-900 border border-amber-600/70 text-amber-300`).
   - **Ghế đang chọn:** Nền đỏ nổi bật (`bg-rose-600 text-white font-bold ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900`).
   - **Ghế đã bán:** Xám tối, mờ, cấm click (`bg-slate-800 text-slate-600 cursor-not-allowed opacity-50`).
3. **Chú thích sơ đồ (SeatLegend):**
   - Đặt cố định hoặc ngay dưới sơ đồ, có đầy đủ 4 trạng thái ghế kèm giá tiền mẫu (Thường vs VIP).
4. **Touch Target trên Mobile:**
   - Trên màn hình di động (< 640px), kích thước mỗi ô ghế tối thiểu phải đạt `36px` và có vùng đệm để đạt chuẩn `44x44px` theo WCAG. Cho phép sơ đồ ghế cuộn ngang mượt mà (`overflow-x-auto py-4`).

### 4.2. Thẻ Phim (`MovieCard`)
- Tỷ lệ khung hình poster cố định chuẩn điện ảnh quốc tế: `aspect-[2/3]`.
- Bo tròn góc: `rounded-xl overflow-hidden`.
- Hiệu ứng hover: phóng to nhẹ poster (`group-hover:scale-105 duration-300`).
- Tag thể loại: chip nhỏ gọn (`bg-slate-800 text-xs px-2.5 py-1 rounded-full text-slate-300`).
- Nút xem trailer: Icon Play tròn phát sáng trên poster khi rê chuột.

### 4.3. Đồng hồ đếm ngược (`CountdownTimer`)
- Giữ cố định (sticky/fixed) trên trang chọn ghế và trang thanh toán.
- Trạng thái an toàn (> 1 phút): Nền tối viền xanh/xám (`bg-slate-800/90 text-slate-200`).
- Trạng thái khẩn cấp (< 1 phút): Viền đỏ nhấp nháy nhẹ (`bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse`).

---

## 5. Tiêu chuẩn Khả năng Tiếp cận (Accessibility - WCAG 2.2 AA)

1. **Độ tương phản màu (Contrast Ratio):**
   - Văn bản thường: Đạt tối thiểu **4.5:1** so với màu nền.
   - Tiêu đề lớn (>= 18pt): Đạt tối thiểu **3:1**.
   - Tuyệt đối không dùng chữ xám mờ trên nền đen gây mỏi mắt (`text-slate-600` trên `bg-slate-900`).
2. **Điều hướng bằng bàn phím (Keyboard Accessibility):**
   - Bấm `Tab` phải di chuyển tuần tự qua các ghế và nút bấm.
   - Các nút đang focus phải có vòng sáng rõ rệt: `focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none`.
3. **Thẻ nhãn cho Trình đọc màn hình (Screen Readers):**
   - Mọi ghế ngồi phải có thuộc tính: `aria-label="Ghế hàng [Hàng] số [Số], loại [Thường/VIP], trạng thái [Trống/Đang chọn/Đã bán]"`.
   - Các nút chỉ có icon (nút đóng modal, icon search) bắt buộc phải có `aria-label` hoặc `<span className="sr-only">`.

---

## 6. Bảng Do's & Don'ts (Những điều nên làm & Cần tránh)

| Nên làm (Do) ✅ | Không nên làm (Don't) ❌ |
| :--- | :--- |
| Dùng skeleton loading đồng dạng với card phim khi đang fetch API. | Tránh dùng 1 con spinner xoay tít giữa màn hình gây giật layout (CLS). |
| Thông báo rõ ràng ghế nào bị tranh chấp khi có lỗi 409 Conflict. | Tránh tự động hủy toàn bộ giỏ vé mà không thông báo lý do. |
| Hiển thị định dạng tiền tệ Việt Nam chuẩn: `120.000 đ` hoặc `120.000 ₫`. | Tránh hiển thị số thô `120000` hoặc dùng đơn vị USD `$` cho phim Việt. |
| Phân bổ khoảng trắng (padding/margin) hài hòa theo hệ số 4 của Tailwind (`p-4`, `p-6`, `gap-4`). | Tránh nhồi nhét quá nhiều thông tin sát biên mép màn hình điện thoại. |
| Bọc React Error Boundary để bắt lỗi render mà không làm trắng toàn bộ web. | Không để ứng dụng crash hiển thị màn hình trắng chết chóc khi 1 component con lỗi. |

---

*Tham khảo chính thức: [https://github.com/bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills)*
