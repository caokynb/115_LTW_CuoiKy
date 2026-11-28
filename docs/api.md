# API CineHub

Base URL khi chạy local: `http://localhost:5000/api`. Body và response dùng JSON. Các route yêu cầu đăng nhập nhận header `Authorization: Bearer <JWT>`. Token trả về khi đăng nhập/đăng ký; role `member` hoặc `admin` được kiểm tra ở middleware backend.

## Quy ước response

| Mã | Ý nghĩa |
| --- | --- |
| 200 | Đọc, cập nhật, xóa thành công hoặc nghiệp vụ hợp lệ. |
| 201 | Tạo tài nguyên thành công. |
| 400 | Dữ liệu đầu vào/nghiệp vụ không hợp lệ. |
| 401 | Thiếu token hoặc token không hợp lệ/hết hạn. |
| 403 | Đã đăng nhập nhưng không đủ quyền hoặc không sở hữu tài nguyên. |
| 404 | Không tìm thấy tài nguyên. |
| 409 | Trùng ghế, trùng lịch chiếu hoặc ràng buộc dữ liệu. |
| 500 | Lỗi ngoài dự kiến; response được chuẩn hóa bởi error middleware. |

Các response nghiệp vụ thường có `success` và `data`; lỗi có `success: false`, `message` và có thể có `errors`/`conflictingSeats`. Chi tiết trường body có thể xem trong model và controller tương ứng.

## Health và hỗ trợ

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| GET | `/health` | Công khai | 200 |
| GET | `/test-error` | Công khai, route kiểm thử middleware | 400 |
| GET | `/admin/ping` | Admin | 200; 401, 403 |

## Tài khoản và hồ sơ

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| POST | `/auth/register` | Công khai | 201; 400 nếu thông tin đăng ký không hợp lệ/trùng email |
| POST | `/auth/login` | Công khai | 200; 401 nếu thông tin đăng nhập không đúng |
| POST | `/auth/forgot-password` | Công khai | 200; gửi liên kết đặt lại mật khẩu có hiệu lực 15 phút |
| POST | `/auth/reset-password` | Công khai | 200; 400 nếu token sai/hết hạn; vô hiệu hóa JWT cũ |
| GET | `/auth/me` | Đã đăng nhập | 200; 401 |
| GET | `/users/me` | Đã đăng nhập | 200; 401 |
| PUT | `/users/me` | Đã đăng nhập | 200; 400, 401 |

## Phim và đánh giá

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| GET | `/movies` | Công khai | 200; hỗ trợ `q`, `genre`, `date`, `format` (`2D`, `3D`, `IMAX`), `audio` (`subtitled`, `dubbed`), `ageRating` và phân trang |
| GET | `/movies/genres` | Công khai | 200 |
| GET | `/movies/:id` | Công khai | 200; 404 nếu không có phim |
| POST | `/movies` | Admin | 201; 400, 401, 403 |
| PUT | `/movies/:id` | Admin | 200; 400, 401, 403, 404 |
| DELETE | `/movies/:id` | Admin | 200; 401, 403, 404, 409 nếu còn suất chiếu |
| GET | `/movies/:id/reviews` | Công khai | 200; 404 nếu phim không tồn tại |
| POST | `/movies/:id/reviews` | Đã đăng nhập và đã mua vé | 201; 400, 401, 403 nếu chưa mua, 404, 409 nếu đã đánh giá phim này |
| PATCH | `/movies/:id/reviews` | Chủ đánh giá | 200; 400, 401, 404 |
| DELETE | `/movies/:id/reviews` | Chủ đánh giá | 200; 401, 404 |

Danh sách đánh giá có cờ `verifiedPurchase`. Điểm trung bình và số lượng đánh giá của phim được cập nhật khi tạo, sửa hoặc xóa đánh giá.

## Rạp và phòng chiếu

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| GET | `/cinemas` | Công khai | 200 |
| GET | `/cinemas/:id` | Công khai | 200; 404 |
| POST | `/cinemas` | Admin | 201; 400, 401, 403 |
| PUT | `/cinemas/:id` | Admin | 200; 400, 401, 403, 404 |
| DELETE | `/cinemas/:id` | Admin | 200; 401, 403, 404 |
| GET | `/rooms` | Admin | 200; 401, 403 |
| GET | `/rooms/:id` | Admin | 200; 404, 401, 403 |
| POST | `/rooms` | Admin | 201; 400, 401, 403 |
| PUT | `/rooms/:id` | Admin | 200; 400, 401, 403, 404 |
| DELETE | `/rooms/:id` | Admin | 200; 401, 403, 404, 409 nếu phòng có suất chiếu |

Phòng nhận `disabledSeats` dạng `[{ "row": "A", "number": 1 }]`; các ghế này bị khóa trên sơ đồ và API đặt vé từ chối đặt chúng.

## Suất chiếu

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| GET | `/showtimes` | Công khai | 200; query hỗ trợ `movieId`, `date`, phân trang |
| GET | `/showtimes/:id` | Công khai | 200; trả thông tin phòng và ghế đang bán; 404 |
| POST | `/showtimes` | Admin | 201; 400, 401, 403, 409 nếu cùng phòng bị chồng giờ hoặc cách nhau dưới 15 phút |
| PUT | `/showtimes/:id` | Admin | 200; 400, 401, 403, 404, 409 nếu lịch bị chồng hoặc cách nhau dưới 15 phút |
| DELETE | `/showtimes/:id` | Admin | 200; 401, 403, 404 |

## Đặt vé

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| POST | `/bookings` | Member | 201; 400 nếu dữ liệu/suất/giới hạn ghế không hợp lệ; 401, 403, 409 nếu ghế vừa được người khác đặt |
| GET | `/bookings` | Admin | 200; hỗ trợ lọc và phân trang; 401, 403 |
| GET | `/bookings/my` | Đã đăng nhập | 200; vé của tài khoản hiện tại |
| GET | `/bookings/my-bookings` | Đã đăng nhập | 200; alias tương thích cho `/my` |
| GET | `/bookings/:id` | Chủ booking hoặc Admin | 200; 401, 403, 404 |
| PATCH | `/bookings/:id/cancel` | Chủ booking hoặc Admin | 200; 400 nếu quá thời hạn/đã hủy; 401, 403, 404 |

Server tự tính giá từ dữ liệu suất chiếu/phòng và trạng thái ghế; không dùng giá client gửi. Booking thành công được xác nhận ngay, không tích hợp thanh toán thật.

## Thống kê

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| GET | `/stats/revenue-by-movie` | Admin | 200; query `fromDate`, `toDate` dạng `YYYY-MM-DD`; 400 nếu ngày sai |
| GET | `/stats/revenue-by-day` | Admin | 200; query `fromDate`, `toDate`; 400 nếu ngày sai |
| GET | `/stats/occupancy-by-showtime` | Admin | 200; trả vé active, tổng ghế và tỷ lệ lấp đầy theo suất |

## Mã giảm giá và bắp nước

| Method | URL | Quyền | Thành công / lỗi chính |
| --- | --- | --- | --- |
| POST | `/coupons/validate` | Công khai | 200 nếu mã dùng được; 400 nếu mã hết hạn/không hợp lệ; 404 nếu không tồn tại |
| GET | `/coupons/available` | Đã đăng nhập | 200; mã đang hiệu lực và còn lượt cho tài khoản |
| GET | `/snacks` | Công khai | 200 |
| GET | `/snacks/:id` | Công khai | 200; 404 |
| POST | `/snacks` | Admin | 201; 400, 401, 403 |
| PUT | `/snacks/:id` | Admin | 200; 400, 401, 403, 404 |
| DELETE | `/snacks/:id` | Admin | 200; 401, 403, 404 |

Mã giảm giá có giới hạn tổng lượt (`maxUses`) và số lượt trên một tài khoản (`maxUsesPerUser`). Ưu đãi thành viên 5%, 7% hoặc 10% được áp dụng trước voucher; server luôn tự tính lại các mức giảm.

## Ma trận phân quyền

| Nhóm | Quyền chính |
| --- | --- |
| Khách chưa đăng nhập | Xem phim, thể loại, suất chiếu, rạp/phòng công khai, combo và đánh giá; đăng ký/đăng nhập; kiểm tra mã giảm giá. |
| Member | Quyền khách; quản lý hồ sơ; đặt/hủy vé của mình; xem booking của mình; gửi đánh giá khi đăng nhập. |
| Admin | API quản trị phim, phòng, rạp, suất chiếu, booking, snack và thống kê. Các route được bảo vệ bằng `verifyToken` và `requireRole('admin')` ở server. |

Tài khoản demo và lệnh seed được ghi trong `README.md`/`server/src/seed/index.js`; không lưu JWT secret hoặc chuỗi kết nối trong tài liệu này.
