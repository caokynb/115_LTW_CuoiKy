# CineHub

Ứng dụng đặt vé xem phim mini, gồm giao diện React, API Express và MongoDB. Người xem có thể tìm phim, chọn suất và ghế, đặt vé không qua thanh toán thật, xem/hủy vé theo điều kiện. Quản trị viên quản lý phim, rạp, phòng, suất chiếu, combo và thống kê.

## Công nghệ

- Client: React, React Router, Redux Toolkit, Tailwind CSS.
- Server: Node.js, Express, Mongoose.
- Database: MongoDB.

## Yêu cầu

- Node.js và npm.
- MongoDB Atlas hoặc MongoDB server có URI kết nối.

## Cài đặt

Tạo file `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<random-secret-at-least-32-characters>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

Không commit file `.env` hoặc ghi thông tin đăng nhập MongoDB/JWT vào repository.

Cài package:

```bash
npm --prefix server install
npm --prefix client install
```

## Seed dữ liệu demo

Seed tạo tài khoản demo, phim, phòng, suất chiếu trong 7 ngày tới, dữ liệu combo/mã giảm giá và một booking mẫu có vé active. Chạy từ thư mục `server`:

```bash
npm run seed
```

Seed có thể chạy lại mà không tạo trùng các dữ liệu demo đã có.

Tài khoản sau khi seed:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@cinema.local` | `Admin@123` |
| Member | `member@cinema.local` | `Member@123` |

## Chạy ứng dụng

Chạy API ở một terminal:

```bash
npm --prefix server run dev
```

Chạy client ở terminal khác:

```bash
npm --prefix client start
```

Client mặc định chạy tại `http://localhost:3000`; API tại `http://localhost:5000`. Kiểm tra server bằng `GET http://localhost:5000/api/health`.

## Kiểm thử

```bash
npm --prefix client test -- --watchAll=false
npm --prefix client run build
npm --prefix server test
```

Server integration tests dùng `MONGODB_URI` trong `server/.env` và tạo/xóa dữ liệu kiểm thử riêng.

## Tài liệu

- API và ma trận phân quyền: [docs/api.md](docs/api.md).
- Thiết kế cơ sở dữ liệu: [docs/report/csdl.md](docs/report/csdl.md).
- Hướng dẫn thuyết trình: [docs/HUONG_DAN_THUYET_TRINH.md](docs/HUONG_DAN_THUYET_TRINH.md).
