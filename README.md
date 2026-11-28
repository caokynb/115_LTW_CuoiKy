# CineHub — Hệ Thống Đặt Vé Xem Phim Trực Tuyến

Ứng dụng web đặt vé xem phim trực tuyến (Nhóm 115 — Lập trình Web, PTIT) xây dựng theo kiến trúc Client–Server trên nền tảng **MERN Stack**.

- **Khách hàng (Member):** Tìm kiếm và lọc phim, xem trailer YouTube, chọn suất chiếu theo cụm rạp, chọn ghế thời gian thực (giữ ghế qua Socket.IO + đếm ngược 5 phút), chọn combo bắp nước, áp dụng mã giảm giá & điểm tích lũy, thanh toán VietQR/xác nhận trực tiếp, nhận vé điện tử kèm mã QR qua email, xem lịch sử đặt vé và hủy vé trước giờ chiếu 2 giờ.
- **Quản trị viên (Admin):** Thống kê doanh thu & tỷ lệ lấp đầy, quản lý phim (tích hợp poster TMDB), cụm rạp, phòng chiếu, suất chiếu (chống trùng giờ), combo bắp nước, mã giảm giá (voucher), quản lý đơn đặt vé và soát vé QR tại quầy (`/admin/scanner`).

---

## 1. Công nghệ sử dụng

- **Frontend (`client/`):** React `19`, React Router DOM `6`, Redux Toolkit, Tailwind CSS (Cinema Dark/Light Mode), Axios, Socket.IO Client, `qrcode.react`.
- **Backend (`server/`):** Node.js (CommonJS), Express `5`, Mongoose `9`, Socket.IO `4`, JWT, Bcryptjs, Helmet, CORS, Express Rate Limit, Express Validator, Nodemailer.
- **Cơ sở dữ liệu:** MongoDB (MongoDB Atlas hoặc MongoDB Server local).

---

## 2. Yêu cầu môi trường

- **Node.js** `>= 18.x` (khuyến nghị `20.x` trở lên) và **npm** `>= 9.x`.
- Một tài khoản **MongoDB Atlas** (miễn phí) hoặc **MongoDB Community Server** đang chạy kèm chuỗi kết nối `MONGODB_URI`.

Kiểm tra nhanh phiên bản trên máy:

```bash
node -v
npm -v
```

---

## 3. Hướng dẫn cài đặt và chạy trong 10 phút

### Bước 1: Clone mã nguồn

```bash
git clone https://github.com/caokynb/115_LTW_CuoiKy.git
cd 115_LTW_CuoiKy
```

### Bước 2: Cài đặt thư viện cho Server và Client

```bash
npm --prefix server install
npm --prefix client install
```

### Bước 3: Cấu hình biến môi trường (`server/.env`)

Sao chép file mẫu `server/.env.example` thành `server/.env`:

```bash
# macOS / Linux
cp server/.env.example server/.env

# Windows (PowerShell)
Copy-Item server/.env.example server/.env
```

Mở `server/.env` và điền thông tin kết nối của bạn (chỉ cần thay `MONGODB_URI` và `JWT_SECRET` là có thể chạy ngay):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cinema_db?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Tùy chọn: Cấu hình thanh toán VietQR demo (đã có giá trị mặc định)
VIETQR_BANK_ID=MB
VIETQR_ACCOUNT_NO=0901234567
VIETQR_ACCOUNT_NAME=CINEHUB CINEMA
PAYMENT_WEBHOOK_SECRET=replace_with_webhook_secret_in_production

# Tùy chọn: Cấu hình gửi email thật qua SMTP (nếu bỏ trống, hệ thống dùng JSON transport an toàn)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
# EMAIL_FROM="CineHub Cinema" <no-reply@cinehub.vn>

# Tùy chọn: Poster phim TMDB
# TMDB_READ_TOKEN=your_tmdb_read_access_token
# TMDB_API_KEY=your_tmdb_api_key
```

> **Lưu ý bảo mật:** Không bao giờ commit file `server/.env` hoặc thông tin mật khẩu MongoDB/JWT lên Git.

*(Tùy chọn)* Phía Client mặc định gọi API tại `http://localhost:5000/api` và Socket.IO tại `http://localhost:5000`. Nếu đổi cổng Server, tạo `client/.env` với `REACT_APP_API_URL=http://localhost:<PORT>/api`.

### Bước 4: Nạp dữ liệu demo (Seed)

Chạy lệnh seed để khởi tạo sẵn tài khoản demo, danh sách phim kèm poster/trailer, phòng chiếu, suất chiếu trong 7 ngày tới, combo bắp nước, mã giảm giá và đơn đặt vé mẫu:

```bash
npm --prefix server run seed
```

Hoặc chạy trực tiếp từ thư mục `server/`:

```bash
cd server
npm run seed
```

> **Lưu ý:** Script seed thiết kế theo cơ chế **idempotent** — bạn có thể chạy lại nhiều lần mà không gây trùng lặp dữ liệu demo.

### Bước 5: Khởi chạy Server và Client

Mở **Terminal 1** để chạy Backend API + Socket.IO:

```bash
npm --prefix server run dev
```

Mở **Terminal 2** để chạy Frontend React:

```bash
npm --prefix client start
```

Sau khi khởi chạy thành công:
- **Client UI:** [http://localhost:3000](http://localhost:3000)
- **Server API:** [http://localhost:5000](http://localhost:5000)
- **Kiểm tra trạng thái Server:** Mở [http://localhost:5000/api/health](http://localhost:5000/api/health) (trả về JSON `{"success": true, ...}`).

---

## 4. Tài khoản demo theo từng vai trò

Sau khi chạy bước Seed ở trên, đăng nhập tại `http://localhost:3000/login` bằng các tài khoản sau:

| Vai trò | Email | Mật khẩu | Phạm vi truy cập & trải nghiệm chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@cinema.local` | `Admin@123` | Truy cập `/admin`: Dashboard doanh thu, quản lý Phim, Cụm rạp, Phòng chiếu, Suất chiếu, Combo, Voucher, Vé đã bán và **Soát vé QR tại quầy (`/admin/scanner`)**. *(Tài khoản Admin không tự đặt vé).* |
| **Thành viên (Member)** | `member@cinema.local` | `Member@123` | Xem phim, chọn ghế & combo bắp nước, áp dụng voucher & điểm tích lũy, đặt vé, xem/tải/in mã QR vé tại `/my-bookings`, hủy vé trước giờ chiếu ≥ 2 giờ, xem điểm thưởng & lịch sử điểm tại `/profile`. |

---

## 5. Kiểm thử tự động (Verification Gate)

Chạy đầy đủ bộ kiểm thử Unit/Integration Test và Build sản phẩm:

```bash
# 1. Kiểm thử Frontend (Jest + React Testing Library)
npm --prefix client test -- --watchAll=false

# 2. Kiểm tra Production Build Frontend
npm --prefix client run build

# 3. Kiểm thử Backend (Node test runner — cần MONGODB_URI hợp lệ trong server/.env)
npm --prefix server test
```

*(Các bài test server tự tạo và dọn sạch dữ liệu kiểm thử riêng sau khi chạy xong.)*

---

## 6. Xử lý nhanh sự cố thường gặp

- **Lỗi `querySrv ETIMEOUT` hoặc không kết nối được MongoDB Atlas:** Kiểm tra lại `MONGODB_URI` trong `server/.env` và đảm bảo đã thêm IP hiện tại (hoặc `0.0.0.0/0` khi dev) vào mục **Network Access** trên MongoDB Atlas.
- **Lỗi `HTTP 429 Too Many Requests` khi thử đăng nhập sai nhiều lần:** Route `/api/auth` giới hạn 10 lần đăng nhập sai / 15 phút để chống brute-force; chờ hết cửa sổ hoặc khởi động lại server ở môi trường dev.
- **Trùng cổng `3000` hoặc `5000`:** Đổi `PORT` trong `server/.env` và cập nhật `REACT_APP_API_URL` tương ứng.

---

## 7. Tài liệu dự án

- Đặc tả API & Ma trận phân quyền: [docs/api.md](docs/api.md)
- Hướng dẫn triển khai (Vercel / Netlify / Render): [docs/deploy.md](docs/deploy.md)
- Báo cáo Kiến trúc hệ thống & Phân quyền: [docs/report/kien-truc.md](docs/report/kien-truc.md)
- Báo cáo Thiết kế Cơ sở dữ liệu: [docs/report/csdl.md](docs/report/csdl.md)
- Báo cáo Luồng đặt vé, Chống trùng ghế, Custom Hooks & Phân công: [docs/report/dat-ve.md](docs/report/dat-ve.md)
- Hướng dẫn thuyết trình & Demo: [docs/HUONG_DAN_THUYET_TRINH.md](docs/HUONG_DAN_THUYET_TRINH.md)
- Bộ kiểm thử Postman: [docs/postman_collection.json](docs/postman_collection.json)
