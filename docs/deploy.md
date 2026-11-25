# Hướng dẫn triển khai CineHub (Production Deployment Guide)

Tài liệu hướng dẫn đưa hệ thống **CineHub** lên môi trường public với:
- **Database:** MongoDB Atlas
- **Backend API + Socket.io:** Render hoặc Railway (`server/`)
- **Frontend SPA (React):** Vercel hoặc Netlify (`client/`)

---

## 1. Chuẩn bị MongoDB Atlas

1. Tạo Cluster miễn phí (M0) trên MongoDB Atlas và tạo Database User có quyền đọc/ghi.
2. Cấu hình Network Access: cho phép IP của Render/Railway (hoặc `0.0.0.0/0` nếu dịch vụ dùng IP động).
3. Lấy connection string dạng:
   ```text
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cinema_db?retryWrites=true&w=majority
   ```
4. Nạp dữ liệu mẫu ban đầu (từ máy local hoặc Render Shell):
   ```bash
   npm --prefix server run seed
   ```

---

## 2. Triển khai Backend (`server/`) lên Render hoặc Railway

Repository đã cung cấp sẵn file cấu hình `render.yaml` ở thư mục gốc và mẫu biến môi trường tại `server/.env.example`.

- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`

### Biến môi trường bắt buộc trên Server
| Biến | Giá trị mẫu / Mô tả |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (hoặc theo cổng nền tảng cấp) |
| `MONGODB_URI` | URI kết nối MongoDB Atlas |
| `JWT_SECRET` | Chuỗi bí mật ngẫu nhiên >= 32 ký tự |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | URL domain frontend (ví dụ `https://cinehub.vercel.app`) |
| `CORS_ORIGINS` | Danh sách origin được phép, cách nhau bằng dấu phẩy (ví dụ `https://cinehub.vercel.app,http://localhost:3000`) |
| `VIETQR_BANK_ID` | Mã ngân hàng VietQR (ví dụ `MB`) |
| `VIETQR_ACCOUNT_NO` | Số tài khoản nhận thanh toán |
| `VIETQR_ACCOUNT_NAME` | Tên chủ tài khoản |
| `PAYMENT_WEBHOOK_SECRET` | Secret kiểm tra header `x-webhook-secret` cho `/api/payments/webhook` |

---

## 3. Triển khai Frontend (`client/`) lên Vercel hoặc Netlify

Repository đã cấu hình sẵn SPA fallback rewrite để tránh lỗi 404 khi nhấn F5 ở các route con (`/movies`, `/showtimes/:id/seats`, `/admin/bookings`, ...):
- **Vercel:** `client/vercel.json`
- **Netlify:** `client/netlify.toml`

### Cấu hình Build trên Vercel / Netlify
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `build`

### Biến môi trường trên Client
Tham khảo `client/.env.example`:
- `REACT_APP_API_URL=https://<your-backend-domain>/api`
- `REACT_APP_SOCKET_URL=https://<your-backend-domain>`

---

## 4. Checklist kiểm tra sau khi triển khai

1. Mở `https://<your-backend-domain>/api/health` trả về HTTP 200 và `{ "success": true }`.
2. Mở domain frontend, truy cập `/movies`, `/login`, `/admin` và nhấn **F5** kiểm tra không bị lỗi 404 (SPA rewrite hoạt động).
3. Đăng nhập thử bằng các tài khoản demo (`admin@cinema.local` / `Admin@123`, `member@cinema.local` / `Member@123`).
4. Kiểm tra Network & Console không có lỗi CORS và kết nối Socket.io realtime hoạt động bình thường.
5. Kiểm tra `git status` và repository đảm bảo không chứa file `.env` hay bất kỳ secret nào.
