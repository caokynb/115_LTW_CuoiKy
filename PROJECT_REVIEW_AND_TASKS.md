# BÁO CÁO REVIEW CHI TIẾT THEO GOOGLE SHEET & REPO DỰ ÁN CINEHUB (115_LTW_CuoiKy)

*Thời gian kiểm tra: 20/11/2026*  
*Nguồn dữ liệu: Google Sheet BTL CK WEB - N115 (`1lHbxLtxP3jEs96glTuInCU1sxlWGwoCeVQny_dirvSM`) & Git Repository*

---

## 1. TỔNG QUAN TÌNH TRẠNG SHEET & REPO

### 1.1. Thống kê tiến độ trên Google Sheet (Tổng 60 nhiệm vụ - Đã cập nhật 4 việc hậu kì):
- **Đã xong:** 26 nhiệm vụ (43.3%)
- **Chờ review:** 4 nhiệm vụ (6.7%)
- **Đang làm:** 10 nhiệm vụ (16.7%)
- **Chưa làm:** 20 nhiệm vụ (33.3%)
- **Phân bổ theo thành viên:**
  - **Kỳ:** 17 việc (28.3%), 77 giờ (Đã xong 14 việc)
  - **Tuấn Anh:** 15 việc (25.0%), 63 giờ (Đã xong 3 việc)
  - **Phúc:** 15 việc (25.0%), 65 giờ (Đã xong 8 việc)
  - **Tú:** 13 việc (21.7%), 54 giờ (Đã xong 1 việc)
  - **Tổng toàn nhóm:** 60 việc, 259 giờ ước tính.

### 1.2. Danh sách 5 nhiệm vụ đang ở trạng thái "Chờ review" trên Sheet:
1. **[A04]** `feat/movie-detail` (Tuấn Anh): Chi tiết phim `/movies/:id`, trailer YouTube `TrailerModal`.
2. **[T06]** `feat/seat-countdown` (Tú - tên nhánh git: `origin/seat-countdown`): Hook `useCountdown` và `CountdownTimer` 5 phút.
3. **[T07]** `feat/booking-confirm` (Tú - tên nhánh git: `origin/booking-confirm`): Luồng xác nhận `ConfirmDialog`, `POST /api/bookings`, xử lý 409, trang `/bookings/:id`.
4. **[T08]** `feat/booking-detail` (Tú - tên nhánh git: `origin/booking-detail`): API `GET /api/bookings/:id`.
5. **[T09]** `feat/admin-bookings` (Tú - tên nhánh git: `origin/admin-bookings`): API `GET /api/bookings` (admin) & trang Admin Vé đã bán.

---

## 2. KẾT QUẢ REVIEW CHI TIẾT 5 NHIỆM VỤ "CHỜ REVIEW"

### ✅ NHIỆM VỤ A04: ĐẠT YÊU CẦU (ĐÃ MERGE TRÊN GIT - CẦN CẬP NHẬT SHEET THÀNH "XONG")
- **Người thực hiện:** Tuấn Anh (5 giờ)
- **Tiêu chí trên sheet:** Vào `/movies/:id` sai thì hiển thị không tìm thấy; trailer phát được từ YouTube ID; tích hợp `TrailerModal`.
- **Thực tế trên Repo:**
  - Nhánh `feat/movie-detail` đã được merge vào `main` qua Pull Request #7 (`e9c1903`).
  - Lỗi cú pháp nhỏ trong validator phim đã được hotfix tại commit `a8e5e60`.
  - Component `MovieDetail.jsx` và `TrailerModal.jsx` hoạt động chuẩn xác, xử lý loading skeleton, empty state, lỗi 404 khi sai ID và lấy danh sách suất chiếu của phim mượt mà.
- **Hành động đề xuất:** Nhóm trưởng có thể **đổi trạng thái A04 trên Google Sheet từ "Chờ review" $\rightarrow$ "Xong"**.

---

### ❌ NHIỆM VỤ T06 (Nhánh `origin/seat-countdown`): CHƯA ĐẠT - KHÔNG ĐƯỢC MERGE
- **Người thực hiện:** Tú (5 giờ)
- **Tiêu chí trên sheet:** Hết 5 phút ghế được bỏ chọn và tự chuyển trang; rời trang sớm không còn timer chạy ngầm. Sửa trong `client/src/hooks/useCountdown.js` và `client/src/components/seat/CountdownTimer.jsx`.
- **Thực tế trên Repo (Commit `8e410c2`):**
  - Đặt sai thư mục component: Tạo tại `client/src/components/CountdownTimer.jsx` (sheet yêu cầu `client/src/components/seat/CountdownTimer.jsx`).
  - 🔴 **Lỗi Crash App:** File `CountdownTimer.jsx` import `import { toast } from 'react-toastify'`. Tuy nhiên thư viện `react-toastify` **chưa cài đặt trong `package.json`**. Khi mount component này sẽ gây lỗi trắng trang.
  - 🔴 **Chưa tích hợp (File mồ côi):** `CountdownTimer` chưa hề được import hay hiển thị trong `client/src/pages/Seats.jsx`.
  - 🔴 **Chưa kết nối Redux:** Tiêu chí yêu cầu "ghế được bỏ chọn", nhưng component chỉ nhận callback `clearSeats` rời rạc mà chưa dispatch action `clearSelectedSeats()` từ `bookingSlice`.
- **Yêu cầu sửa lại trước khi merge:**
  1. Đổi sang dùng hook `useToast` chuẩn của dự án:
     ```javascript
     import { useToast } from './ui'; // hoặc từ components/ui
     const toast = useToast();
     toast.warning('Đã hết thời gian giữ ghế. Vui lòng chọn lại.');
     ```
  2. Di chuyển component về đúng thư mục: `client/src/components/seat/CountdownTimer.jsx`.
  3. Nhúng component vào [client/src/pages/Seats.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/pages/Seats.jsx), truyền `movieId` và khi hết giờ dispatch `clearSelectedSeats()`.

---

### ❌ NHIỆM VỤ T07 (Nhánh `origin/booking-confirm`): CHƯA ĐẠT - KHÔNG ĐƯỢC MERGE
- **Người thực hiện:** Tú (5 giờ)
- **Tiêu chí trên sheet:** Đặt thành công thấy mã vé; hai trình duyệt đặt cùng ghế thì bên sau thấy thông báo ghế nào đã mất và ghế đó chuyển sang đã bán. Sửa trong `client/src/pages/BookingSuccess.jsx` và `client/src/components/seat/ConfirmDialog.jsx`.
- **Thực tế trên Repo (Commit `d90971f`):**
  - 🔴 **Lỗi Import module:** Gọi `import api from '../../api'` và `import api from '../api'` $\rightarrow$ Báo lỗi `Cannot find module` do file thực tế là `client/src/api/axios.js`.
  - 🔴 **Lỗi 404 do trùng path:** `api` đã có `baseURL = 'http://localhost:5000/api'`. Gọi `api.post('/api/bookings')` và `api.get('/api/bookings/${id}')` bị nối thành `/api/api/bookings` $\rightarrow$ Nhận lỗi 404 Not Found từ server.
  - 🔴 **Lệch cấu trúc Payload:** `ConfirmDialog` gửi `{ showtimeId, seatIds: [...] }`. Nhưng Backend trên `main` kiểm tra nghiêm ngặt mảng `seats` chứa các object `{ row, number }`. Server sẽ từ chối với lỗi **400: "Dữ liệu ghế không hợp lệ"**.
  - 🔴 **Sai key conflictSeats:** Code check `err.response.data?.conflictSeats`, nhưng backend trả về `conflictingSeats`.
  - 🔴 **Chưa gắn vào Flow:**
    - `ConfirmDialog` chưa được mở khi ấn nút Đặt vé ở `Seats.jsx`.
    - `BookingSuccess` chưa được khai báo route trong `App.jsx` (đường dẫn `/bookings/:id` vẫn là `PlaceholderPage`).
- **Yêu cầu sửa lại trước khi merge:**
  1. Sửa import thành `import api from '../api/axios'` (hoặc qua `api/index.js`).
  2. Sửa endpoint thành `api.post('/bookings', ...)` và `api.get('/bookings/${id}')`.
  3. Truyền payload đúng format:
     ```javascript
     seats: selectedSeats.map((s) => ({ row: s.row, number: s.number }))
     ```
  4. Bắt lỗi trùng ghế: đọc `err.response?.data?.conflictingSeats`.
  5. Đăng ký `<BookingSuccess />` vào route `/bookings/:id` trong `App.jsx`.

---

### ⛔ NHIỆM VỤ T08 (Nhánh `origin/booking-detail`): CỰC KỲ NGUY HIỂM - TUYỆT ĐỐI KHÔNG MERGE
- **Người thực hiện:** Tú (5 giờ)
- **Tiêu chí trên sheet:** User B gọi vé của User A trả 403; id không tồn tại trả 404. Sửa trong `server/src/controllers/booking.controller.js`.
- **Thực tế trên Repo (Commit `3cd1a45`):**
  - ⛔ **Xung đột xóa đè phá hủy (Destructive Overwrite):** Tác giả rẽ nhánh từ commit cũ từ ngày 09/11 khi chưa có controller đặt vé. File commit mới chỉ có 87 dòng, nếu merge vào `main` sẽ **xóa sạch toàn bộ 321 dòng code nghiệp vụ đặt vé lõi** (transaction rollback, tính giá an toàn, unit tests 6/6 pass).
  - ⛔ **Sai chuẩn Module (ESM trong CommonJS):** Backend cấu hình `"type": "commonjs"`. File này dùng `import/export`, khiến server crash ngay lập tức: `SyntaxError: Cannot use import statement outside a module`.
  - ⛔ **Sai file Model & Schema:** Gọi `../models/booking.model.js` (file không tồn tại), dùng `booking.user` (schema là `userId`), `showtime` (schema là `showtimeId`).
  - 💡 **LƯU Ý QUAN TRỌNG:** API `getBookingById` theo đúng tiêu chí T08 **đã được viết hoàn chỉnh, chuẩn CommonJS và bảo mật phân quyền trên nhánh `main`** tại [server/src/controllers/booking.controller.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/controllers/booking.controller.js#L271-L315).
- **Hành động đề xuất:** **Hủy bỏ (Discard) nhánh này hoặc đóng PR**, vì nhánh `main` đã hoàn thành trọn vẹn nghiệp vụ của T08. Có thể cập nhật T08 trên Sheet thành "Xong" sau khi kiểm tra lại test case.

---

### ❌ NHIỆM VỤ T09 (Nhánh `origin/admin-bookings`): CHƯA ĐẠT - KHÔNG ĐƯỢC MERGE
- **Người thực hiện:** Tú (5 giờ)
- **Tiêu chí trên sheet:** Lọc theo trạng thái và khoảng ngày đúng; chỉ admin gọi được; phân trang ở server. Sửa `server/src/controllers/booking.controller.js` và `client/src/pages/admin/Bookings.jsx`.
- **Thực tế trên Repo (Commit `311c0ca`):**
  - Chứa toàn bộ commit lỗi từ T08.
  - Phía Server: Chưa khai báo route trong `booking.routes.js` hoặc `admin.routes.js`.
  - Phía Client:
    - Bị lỗi import `api` và trùng đường dẫn `/api/api/bookings`.
    - Lỗi crash render: `b.seats.map((s) => s.label)` sẽ gây `TypeError: Cannot read properties of undefined` vì Backend trả về danh sách `tickets`.
    - Chưa kết nối trang này vào `AdminLayout` trong `App.jsx` (`/admin/bookings` vẫn là `PlaceholderPage`).
- **Yêu cầu sửa lại trước khi merge:**
  1. Tách riêng logic API `getAllBookings` cho admin vào `booking.controller.js` trên nền code hiện tại của `main` (dùng CommonJS `module.exports`, populate `userId`, `showtimeId`, `tickets`).
  2. Đăng ký route `GET /` trong `booking.routes.js` có middleware `requireRole('admin')` hoặc đặt trong `admin.routes.js`.
  3. Sửa component `Bookings.jsx`: render danh sách vé dựa trên `b.tickets`, sửa gọi API và gắn vào route `/admin/bookings` trong `App.jsx`.

---

## 3. CHECK HIỆN TRẠNG DỰ ÁN SO VỚI TIÊU CHÍ CHẤM ĐIỂM (TAB ĐỐI CHIẾU YÊU CẦU)

Đối chiếu với 9 nhóm yêu cầu bắt buộc (N1 - N9) trong sheet:

### 3.1. Các phần đã làm rất tốt:
- **N7, N8, N9 (Backend, DB, Security):**
  - Database MongoDB có 6 collection rõ ràng (`User`, `Movie`, `Room`, `Showtime`, `Booking`, `Ticket`).
  - Unit test cho booking (`booking.test.js`) chạy pass 100% (6/6 tests), chống đặt trùng ghế cực tốt.
  - Phân quyền JWT 2 vai trò (`admin`, `member`) hoạt động đúng theo middleware `verifyToken`, `requireRole`.
- **N1, N2, N6 (Giao diện & State):**
  - Tailwind responsive, dark mode qua `ThemeContext`.
  - Quản lý giỏ vé bằng Redux Toolkit (`bookingSlice`) đạt chuẩn yêu cầu N6.
  - 48/48 unit tests client chạy pass, build production thành công.

### 3.2. Những điểm nghẽn (Gaps) lớn cần bổ sung ngay:
1. **Liên kết Route Admin bị đứt:**
   - [Rooms.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/pages/admin/Rooms.jsx) (P06) và [Showtimes.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/pages/admin/Showtimes.jsx) (P05) đã viết xong hoàn chỉnh nhưng trong `App.jsx` vẫn để `PlaceholderPage`!
2. **Luồng người dùng đặt vé bị ngắt quãng:**
   - Từ trang chi tiết phim `MovieDetail` $\rightarrow$ chọn suất chiếu $\rightarrow$ sang trang chọn ghế `Seats.jsx` $\rightarrow$ bấm "Tiếp tục" bị chuyển tới `/bookings/new` không tồn tại (404)!
3. **Các trang người dùng còn là Placeholder:**
   - `/bookings/:id`: Chi tiết vé sau đặt.
   - `/my-bookings`: Vé của tôi (K11).
   - `/`: Trang chủ CineHub.
4. **Chuẩn hóa API client:**
   - Tạo file `client/src/api/index.js` re-export `axios.js` để tránh mọi lỗi import tương lai của các thành viên.

---

## 4. KẾ HOẠCH HÀNH ĐỘNG ĐỀ XUẤT (ACTION PLAN)

| Việc cần làm | Phụ trách | Mức độ ưu tiên |
| :--- | :---: | :---: |
| 1. Cập nhật task **A04** trên Sheet sang **"Xong"** | Nhóm trưởng | 🟢 Ngay lập tức |
| 2. Gắn `<Rooms />` và `<Showtimes />` vào `App.jsx` | Nhóm trưởng / Kỳ | 🔴 Cực cao |
| 3. Tạo file `client/src/api/index.js` tránh lỗi import | Kỳ | 🔴 Cao |
| 4. Yêu cầu Tú rebase/pull `main` mới nhất và viết lại T06, T07, T09 theo hướng dẫn ở Mục 2 | Tú | 🔴 Cực cao |
| 5. Đóng nhánh `booking-detail` (T08) vì đã có sẵn trên `main` | Tú / Nhóm trưởng | 🟡 Trung bình |
| 6. Hoàn thiện trang `BookingSuccess` (`/bookings/:id`) và `MyBookings` (`/my-bookings`) | Tú, Kỳ | 🔴 Cao |
| 7. Thực hiện 4 nhiệm vụ hậu kì sau cùng (T15, A15, P15, K15) | Toàn nhóm | 🟢 Giai đoạn Final |

---

## 5. CÁC CÔNG VIỆC HẬU KÌ SAU CÙNG (ĐÃ BỔ SUNG TRỰC TIẾP LÊN GOOGLE SHEET)

Để đảm bảo sản phẩm đạt chất lượng cao nhất khi nghiệm thu, bảo vệ trước hội đồng và không bị gián đoạn khi demo thực tế, 4 nhiệm vụ hậu kì sau cùng đã được tính toán và bổ sung trực tiếp vào Google Sheet (các dòng 71 - 74) thuộc Giai đoạn **6. Final (nộp bài)**:

| ID | Người | Giờ | Nhiệm vụ | Tiêu chí hoàn thành | File / Thư mục sửa | Nhánh Git |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **T15** | **Tú** | 4h | **Script reset DB & nạp dữ liệu demo chuẩn (`npm run db:demo`)** | Chạy 1 lệnh khôi phục ngay trạng thái sạch: rạp, phim có poster HD/trailer thật, suất chiếu hôm nay/tuần này, vé mẫu, tài khoản test; không bị lỗi ảnh hỏng hay suất quá khứ. | `server/src/scripts/seedDemo.js; server/package.json` | `chore/demo-seed` |
| **A15** | **Tuấn Anh** | 4h | **Kiểm thử khói đa trình duyệt & Audit UI/UX thiết bị thật** | Chạy kiểm thử trên Chrome, Safari, Firefox, Edge và màn hình di động (iOS/Android) theo chuẩn `awesome-design-skills`; không tràn ngang màn hình 375px; touch target >= 44px; dark/light mode rực rỡ, chuẩn rạp phim. | `client/src/*; docs/audit-ui-ux.md` | `fix/cross-browser-polish` |
| **P15** | **Phúc** | 4h | **Hợp nhất Báo cáo Đồ án hoàn chỉnh & Biên soạn Slide thuyết trình** | Đóng gói thành 1 file báo cáo chính thức (Word/PDF) theo mẫu chuẩn trường (bìa, mục lục tự động, bảng đóng góp %); thiết kế bộ Slide bảo vệ (12-15 slide) gồm kiến trúc, database, demo tính năng nổi bật. | `docs/report/BaoCao_TongHop_N115.docx; docs/slides/Presentation.pptx` | `docs/final-report-slides` |
| **K15** | **Kỳ** | 3h | **Dọn dẹp mã nguồn, React Error Boundary, audit bảo mật & Soạn bộ Mock Q&A** | Xóa sạch console.log/code rác; crash ở component con không làm sập cả web (có Error Boundary); bộ 10-15 câu hỏi - trả lời phản biện cốt lõi (concurrency, JWT, Redux, Aggregation) cho nhóm ôn tập. | `client/src/components/common/ErrorBoundary.jsx; docs/mock-defense-qa.md` | `chore/production-hardening-qa` |

---

## 6. TÍCH HỢP SKILL THIẾT KẾ: AWESOME DESIGN SKILLS

Dự án đã tích hợp chuẩn thiết kế giao diện từ [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) qua 2 tài liệu chính thức trong workspace:

1. **Workspace Skill:** [.agents/skills/design-system/SKILL.md](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/.agents/skills/design-system/SKILL.md)  
   - Được Antigravity tự động kích hoạt khi làm việc với UI/UX.
   - Định nghĩa phong cách Cinema Dark Mode & Bento Grid: Bộ tokens màu sắc (`cinema.bg`, `cinema.card`, `cinema.primary`, `cinema.vip`), tỷ lệ khung hình poster 2:3, screen arc cong phát sáng, và chuẩn touch target 44x44px.
2. **Tài liệu tham chiếu nhóm:** [AWESOME_DESIGN_SKILLS.md](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/AWESOME_DESIGN_SKILLS.md)  
   - Hướng dẫn các quy chuẩn tương phản WCAG 2.2 AA (tối thiểu 4.5:1), điều hướng bàn phím focus visible, nhãn screen reader `aria-label` cho sơ đồ ghế, bảng Do's & Don'ts ngăn chặn AI slop giao diện.
