# CẨM NANG THUYẾT TRÌNH & VẤN ĐÁP BẢO VỆ ĐỒ ÁN CINEHUB

> **Nội dung:** Tổng hợp kiến thức kiến trúc hệ thống, công nghệ cốt lõi và kịch bản vấn đáp bảo vệ đồ án CineHub.  
> **Mục tiêu:** Cung cấp tài liệu tra cứu trực quan, dễ hiểu về các luồng nghiệp vụ chính của hệ thống (Xác thực, Phân quyền, Quản lý trạng thái và Quy trình Đặt vé xem phim trực tuyến).  

---

## MỤC LỤC
1. [Tâm thế & Chiến thuật trả lời vấn đáp](#1-tâm-thế--chiến-thuật-trả-lời-vấn-đáp)
2. [Bản đồ kiến trúc & phân hệ chức năng](#2-bản-đồ-kiến-trúc--phân-hệ-chức-năng)
3. [Giải thích chi tiết từng Công nghệ (Tech) & Tính năng (Features)](#3-giải-thích-chi-tiết-từng-công-nghệ-tech--tính-năng-features)
   - [Tech 1: Express.js & Kiến trúc Middleware bắt lỗi](#tech-1-expressjs--kiến-trúc-middleware-bắt-lỗi-k02)
   - [Tech 2: Bcrypt & JSON Web Token (JWT)](#tech-2-băm-mật-khẩu-bcrypt--token-jwt-xác-thực-k03-k04)
   - [Tech 3: Context API vs Redux Toolkit (Câu hỏi kinh điển)](#tech-3-context-api-vs-redux-toolkit-câu-hỏi-kinh-điển-k05-vs-t02)
   - [Tech 4: Axios Interceptor & Tự động gắn Token](#tech-4-axios-interceptor--tự-động-gắn-token-k06)
   - [Tech 5: React Router DOM & Protected Route (Phân quyền trang)](#tech-5-react-router-dom--protected-route-k07)
   - [Tech 6: Sơ đồ ghế động (Dynamic SeatMap) & Responsive](#tech-6-sơ-đồ-ghế-động-dynamic-seatmap--responsive-t03)
   - [Tech 7: Trang Đặt vé, useMemo & Kiểm soát 8 ghế](#tech-7-trang-đặt-vé-usememo--kiểm-soát-8-ghế-t04)
   - [Tech 8: API Đặt vé, Chống hack giá & Chống tranh chấp ghế (Concurrency)](#tech-8-api-đặt-vé-chống-hack-giá--chống-tranh-chấp-ghế-t05)
4. [Bộ 12 câu hỏi vấn đáp "tủ" của Thầy Cô & Lời giải mẫu điểm 10](#4-bộ-12-câu-hỏi-vấn-đáp-tủ-của-thầy-cô--lời-giải-mẫu-điểm-10)
5. [Kịch bản 3 phút Demo trực tiếp khi bảo vệ](#5-kịch-bản-3-phút-demo-trực-tiếp-khi-bảo-vệ)

---

## 1. TÂM THẾ & CHIẾN THUẬT TRẢ LỜI VẤN ĐÁP

> [!TIP]
> **Quy tắc vàng khi trả lời:** Thầy cô chấm thi vấn đáp KHÔNG bắt bạn phải đọc thuộc lòng từng dòng code cú pháp. Thầy cô muốn kiểm tra xem: **"Em có hiểu luồng chạy thực tế hay đi chép code trên mạng?"**  
> Do đó, hãy trả lời theo công thức 3 bước:
> 1. **Nói ví dụ đời sống trước (Bản chất đời thực là gì?)**
> 2. **Chỉ ra file trong dự án (Nằm ở file nào?)**
> 3. **Lợi ích kỹ thuật (Tại sao em làm thế này mà không làm cách khác?)**

---

## 2. BẢN ĐỒ KIẾN TRÚC & PHÂN HỆ CHỨC NĂNG

| Mã Task | Tên Nhiệm vụ | File phụ trách chính | Bản chất việc này là gì? |
|---|---|---|---|
| **K01, K02** | Khung Server & Xử lý lỗi | `server/src/app.js`, `errorHandler.js` | Dựng móng nhà server, làm hệ thống gom lỗi không để web bị sập. |
| **K03, K04** | API Auth & Phân quyền | `auth.controller.js`, `middleware/auth.js` | Đăng ký, đăng nhập, cấp thẻ vào cửa (JWT) và bảo vệ cửa Admin. |
| **K05** | Context API (Auth & Theme) | `AuthContext.jsx`, `ThemeContext.jsx` | Lưu thông tin đăng nhập và chế độ Sáng/Tối xuyên suốt toàn web. |
| **K06** | Axios Interceptor | `client/src/api/axios.js` | Tự động kẹp Token vào mỗi lần gọi API, token chết thì tự đẩy ra Login. |
| **K07** | Router & Protected Route | `client/src/App.jsx`, `ProtectedRoute.jsx` | Người gác cổng: Chưa login cấm vào đặt vé, không phải Admin cấm vào quản trị. |
| **K08** | UI Kit dùng chung | `client/src/components/ui/*` | Tạo sẵn các nút bấm, ô nhập, modal, toast để cả nhóm tái sử dụng. |
| **K09, K10** | Trang Login, Register, Profile | `pages/Login.jsx`, `pages/Profile.jsx` | Giao diện cho khách nhập tài khoản, đổi mật khẩu cá nhân. |
| **T02** | Redux Quản lý Đặt vé | `client/src/store/slices/bookingSlice.js` | Bộ nhớ tạm quản lý danh sách ghế đang chọn, chặn chọn quá 8 ghế. |
| **T03** | Sơ đồ ghế động (SeatMap) | `client/src/components/booking/SeatMap.jsx` | Vẽ sơ đồ ghế tự động theo dữ liệu phòng, ghế đã bán thì khóa không cho bấm. |
| **T04** | Trang Chọn ghế & Tính tiền | `client/src/pages/Seats.jsx`, `BookingSummary.jsx` | Ghép sơ đồ với bảng tính tiền, dùng `useMemo` tính tiền chuẩn xác theo thời gian thực. |
| **T05** | API Đặt vé & Chống trùng vé | `server/src/controllers/booking.controller.js` | Lưu vé vào DB, tự tính lại tiền vé ở server (chống hack giá), chặn 2 người tranh 1 ghế. |

---

## 3. GIẢI THÍCH CHI TIẾT TỪNG CÔNG NGHỆ (TECH) & TÍNH NĂNG (FEATURES)

### Tech 1: Express.js & Kiến trúc Middleware bắt lỗi (K02)
- **Nó làm gì?**
  - Express.js là thư viện giúp Node.js dựng thành một web server để nhận request từ trình duyệt và trả về dữ liệu JSON.
  - Middleware xử lý lỗi tập trung (`errorHandler.js`): Bất cứ khi nào controller gặp lỗi (sai ID, thiếu trường, database lỗi), thay vì làm server bị crash ("đứng hình"), controller chỉ cần ném ra lỗi `next(new AppError('Thông báo', 400))`. File `errorHandler.js` sẽ đứng ở cuối cùng hứng lấy lỗi và trả về JSON gọn gàng cho client: `{ success: false, message: '...' }`.
- **Ví dụ đời sống:** Giống như trong bệnh viện, bác sĩ ở các phòng khám chỉ việc ghi giấy chuyển viện, còn phòng cấp cứu trung tâm ở cuối hành lang sẽ tiếp nhận và xử lý chuẩn hóa toàn bộ bệnh nhân có vấn đề.
- **File trong code:** [server/src/app.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/app.js), [server/src/middleware/errorHandler.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/middleware/errorHandler.js).

---

### Tech 2: Băm mật khẩu (Bcrypt) & Token JWT xác thực (K03, K04)
- **Bcrypt làm gì?**
  - Mật khẩu người dùng nhập (ví dụ: `123456`) **tuyệt đối không được lưu nguyên vẹn vào cơ sở dữ liệu**.
  - Em dùng thư viện `bcryptjs` để băm mật khẩu thành một chuỗi ký tự loằng ngoằng dài hàng chục ký tự (gọi là Hash) kèm một chuỗi ngẫu nhiên (gọi là Salt).
  - *Đặc điểm:* Đây là hàm băm **1 chiều**. Kể cả hacker hay Admin vào xem database cũng không thể nào dịch ngược chuỗi băm đó về chữ `123456`. Khi đăng nhập, bcrypt lấy pass khách vừa nhập băm ra rồi so sánh 2 chuỗi băm với nhau.
- **JSON Web Token (JWT) làm gì?**
  - Khi đăng nhập đúng, server ký tặng cho client một chiếc vé thông hành điện tử gọi là **JWT**.
  - Token này gồm 3 phần: Header (loại token), Payload (thông tin người dùng), Signature (chữ ký bí mật của server).
  - *Điểm mấu chốt:* Trong Payload, em **chỉ lưu `id` và `role`** (member/admin). Tuyệt đối không lưu mật khẩu.
  - Token có thời hạn sử dụng. Client sẽ lưu token này vào `localStorage` của trình duyệt. Mỗi lần đi xin dữ liệu, client chỉ cần giơ token này ra.
- **Ví dụ đời sống:** Giống như khi bạn đi bơi ở công viên nước, lễ tân không bắt bạn phải cầm sổ hộ khẩu đi bơi suốt buổi. Họ chỉ kiểm tra vé 1 lần lúc đầu rồi đeo cho bạn một cái **vòng tay giấy**. Đi đến máng trượt hay quầy gửi đồ, bảo vệ chỉ nhìn cái vòng tay để biết bạn đã mua vé hạng nào.
- **File trong code:** [server/src/controllers/auth.controller.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/controllers/auth.controller.js), [server/src/middleware/auth.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/middleware/auth.js).

---

### Tech 3: Context API vs Redux Toolkit (Câu hỏi kinh điển) (K05 vs T02)
> [!IMPORTANT]
> **Thầy hỏi:** *"Tại sao trong dự án này em vừa dùng React Context API, lại vừa dùng Redux Toolkit? Sao không dùng 1 cái cho tiện?"*
- **Trả lời:**
  - **Context API (`AuthContext`, `ThemeContext`):** Em dùng cho dữ liệu **toàn cục, tĩnh hoặc rất ít khi thay đổi** (ví dụ: thông tin người đang đăng nhập, bật/tắt giao diện Dark Mode). Context có sẵn trong React, cực kỳ nhẹ, không cần cài đặt rườm rà.
  - **Redux Toolkit (`bookingSlice`):** Em dùng cho luồng **Đặt vé (Booking)**. Vì việc chọn ghế là dữ liệu **thay đổi liên tục theo thời gian thực** (khách click chọn ghế A1, bỏ ghế A2, bấm xóa hết ghế, kiểm soát giới hạn tối đa 8 ghế).
    - Nếu dùng Context cho chọn ghế, mỗi lần click 1 ghế thì **toàn bộ các component con trên trang sẽ bị render lại**, làm chậm ứng dụng.
    - Redux Toolkit có các `reducer` xử lý logic chặt chẽ (`toggleSeat`, `clearSeats`) và `selector` chỉ báo cho component nào thực sự cần cập nhật vẽ lại, giúp sơ đồ ghế mượt mà, không bị giật lag.
- **File trong code:** [client/src/context/AuthContext.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/context/AuthContext.jsx), [client/src/store/slices/bookingSlice.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/store/slices/bookingSlice.js).

---

### Tech 4: Axios Interceptor & Tự động gắn Token (K06)
- **Nó làm gì?**
  - Bình thường mỗi khi viết code gọi API, dev phải tự nhớ lấy token trong localStorage kẹp vào Header. Rất dễ quên hoặc lặp code.
  - Em cấu hình **Axios Interceptor** (bộ lọc đánh chặn tự động):
    1. **Request Interceptor:** Trước khi gói tin rời khỏi máy người dùng, Axios tự lục `localStorage`, nếu thấy có Token thì tự động nhét vào header: `Authorization: Bearer <token>`.
    2. **Response Interceptor:** Khi server trả kết quả về, nếu gặp lỗi `401 Unauthorized` (nghĩa là Token đã hết hạn hoặc bị giả mạo), Axios tự động xóa token hỏng và đẩy người dùng về trang `/login`.
- **Ví dụ đời sống:** Giống như một anh thư ký mẫn cán. Bạn viết thư gửi đối tác, anh thư ký sẽ tự động dập con dấu công ty lên trước khi gửi bưu điện. Nếu bưu điện trả thư về báo dấu hết hạn, anh thư ký tự hủy thư và nhắc bạn đi làm dấu mới.
- **File trong code:** [client/src/api/axios.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/api/axios.js).

---

### Tech 5: React Router DOM & Protected Route (K07)
- **Nó làm gì?**
  - Điều hướng trang trên giao diện mà không phải load lại toàn bộ website (SPA - Single Page Application).
  - Em tạo 2 component bọc bảo vệ:
    - `ProtectedRoute`: Kiểm tra xem đã đăng nhập chưa. Nếu chưa đăng nhập mà khách gõ thẳng link `/showtimes/:id/seats` trên thanh địa chỉ $\rightarrow$ lập tức chuyển hướng `<Navigate to="/login" />`.
    - `AdminRoute`: Kiểm tra xem `user.role === 'admin'` hay không. Nếu tài khoản khách thường (member) cố tình mò vào `/admin` $\rightarrow$ chặn đứng và chuyển hướng về trang chủ.
- **File trong code:** [client/src/App.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/App.jsx).

---

### Tech 6: Sơ đồ ghế động (Dynamic SeatMap) & Responsive (T03)
- **Nó làm gì?**
  - Sơ đồ rạp chiếu **không hề được vẽ cứng (hardcode)** bằng HTML/CSS tĩnh.
  - Sơ đồ được sinh hoàn toàn tự động từ dữ liệu phòng chiếu trả về từ MongoDB (danh sách các hàng ghế, số lượng ghế mỗi hàng, hàng nào là ghế VIP, danh sách ghế đã bị người khác mua trước).
  - Có 4 trạng thái ghế phân biệt bằng màu sắc rõ rệt:
    - **Ghế thường trống:** Màu xám đậm (Slate).
    - **Ghế VIP trống:** Viền vàng hổ phách (Amber 500).
    - **Ghế đang chọn:** Màu hồng đỏ thương hiệu (Rose 600).
    - **Ghế đã bán:** Màu xám tối, thuộc tính `disabled`, bấm vào không có tác dụng.
  - **Responsive:** Trên màn hình điện thoại di động hẹp, em thêm class `overflow-x-auto min-w-fit`. Người dùng có thể vuốt ngang sơ đồ ghế cực kỳ trơn tru mà không làm vỡ bố cục website.
- **File trong code:** [client/src/components/booking/SeatMap.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/components/booking/SeatMap.jsx).

---

### Tech 7: Trang Đặt vé, useMemo & Kiểm soát 8 ghế (T04)
- **Nó làm gì?**
  - Trang `/showtimes/:id/seats` kết nối sơ đồ ghế với bảng tóm tắt đơn hàng (`BookingSummary`).
  - **Giới hạn 8 ghế:** Theo đúng quy định nghiệp vụ rạp chiếu, một khách chỉ được đặt tối đa 8 ghế/giao dịch. Trong `bookingSlice.js`, khi người dùng bấm chọn cái ghế thứ 9, action sẽ lập tức từ chối và bắn Toast thông báo: *"Chỉ được chọn tối đa 8 ghế"*.
  - **`useMemo` để tính tiền:** Tổng tiền bằng `(Số ghế thường * 90.000) + (Số ghế VIP * 100.000)`. Em bọc công thức này trong hook `useMemo` với dependency là `[selectedSeats]`. Chỉ khi danh sách ghế thay đổi thì tiền mới tính lại, còn các component khác render lại thì React sẽ dùng kết quả đã nhớ trong bộ đệm (cache), tối ưu hiệu năng.
- **File trong code:** [client/src/pages/Seats.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/pages/Seats.jsx), [client/src/components/booking/BookingSummary.jsx](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/client/src/components/booking/BookingSummary.jsx).

---

### Tech 8: API Đặt vé, Chống hack giá & Chống tranh chấp ghế (T05)
> [!IMPORTANT]
> Đây là phần **kỹ thuật tinh vi và hay được thầy cô hỏi nhất** trong toàn bộ đồ án. Hãy nhớ 3 từ khóa sau:
1. **Chống hack giá (Authoritative Server Pricing - Zero Trust Client):**
   - Client gửi lên server chỉ bao gồm: `{ showtimeId, seats: ["A1", "A2"] }`.
   - Client **không được phép gửi số tiền lên**, hoặc nếu có gửi thì **Server bỏ qua hoàn toàn**.
   - Server tự truy vấn Database lấy giá gốc của suất chiếu và loại ghế để nhân ra tổng tiền. Kể cả người dùng có mở F12 sửa JavaScript đổi giá thành 0 đồng thì server vẫn lưu đúng giá niêm yết trong Database.
2. **Chống tranh chấp ghế đồng thời (Concurrency Collision Handling):**
   - *Tình huống:* Hai khách hàng cùng ngồi trước màn hình và bấm Đặt ghế `A1` cùng một mili-giây.
   - *Giải pháp:* Trong MongoDB, collection `Ticket` được đánh chỉ mục kép **Unique Index** trên 2 trường `{ showtimeId: 1, seatNumber: 1 }`.
   - Người bấm trước 1/1000 giây sẽ chèn vé thành công (`HTTP 201`). Người đến sau sẽ bị MongoDB ném ra lỗi trùng khóa `E11000`. Server của em bắt lỗi này và trả về `HTTP 409 Conflict` kèm thông báo: *"Ghế A1 đã có người khác vừa đặt nhanh hơn, vui lòng chọn ghế khác"*.
3. **Hoàn tác tự động (Atomic Rollback khi lỗi vé):**
   - Nếu khách đặt 3 ghế: A1, A2, A3.
   - Giả sử lưu được A1, A2 nhưng đến A3 thì bị lỗi. Server sẽ lập tức gọi hàm xóa bỏ các vé A1, A2 vừa tạo dở (`Ticket.deleteMany`), không bao giờ để lại vé "mồ côi" trong cơ sở dữ liệu.
- **File trong code:** [server/src/controllers/booking.controller.js](file:///c:/Users/Admin/OneDrive/Documents/GitHub/LTW%20CUOI%20KY/115_LTW_CuoiKy/server/src/controllers/booking.controller.js).

---

## 4. BỘ 12 CÂU HỎI VẤN ĐÁP "TỦ" CỦA THẦY CÔ & LỜI GIẢI MẪU ĐIỂM 10

#### Câu 1: Em hãy giải thích luồng xác thực (Authentication) từ lúc người dùng gõ mật khẩu đến khi xem được thông tin cá nhân?
> **Cách trả lời:**  
> "Thưa thầy, luồng đi như sau:
> 1. Người dùng nhập email, mật khẩu ở form `Login.jsx`.
> 2. Client gửi `POST /api/auth/login` về server.
> 3. Controller tìm user trong DB, dùng `bcrypt.compare()` đối chiếu mật khẩu băm.
> 4. Nếu đúng, server tạo một mã `JWT` (chứa id và role) ký bằng `JWT_SECRET` rồi trả về cho client.
> 5. Phía client nhận token, lưu vào `localStorage` và nạp vào `AuthContext`.
> 6. Khi sang trang Profile, `Axios Interceptor` tự động lấy token này gắn vào header `Authorization: Bearer <token>` để gọi `GET /api/users/me`.
> 7. Middleware `verifyToken` ở server giải mã token, xác định đúng là user đó thì mới cho phép lấy dữ liệu trả về."

#### Câu 2: Tại sao em lại lưu Token ở `localStorage` mà không lưu ở `Cookie`?
> **Cách trả lời:**  
> "Dạ, em chọn lưu `localStorage` vì tính đơn giản, dễ thao tác trong React SPA và dễ dàng quản lý thông qua Axios Interceptor. Trong đồ án này để tránh tấn công XSS, em luôn kiểm soát việc render text thuần, không dùng `dangerouslySetInnerHTML`. Nếu phát triển thành hệ thống thực tế quy mô ngân hàng/thương mại lớn, em sẽ nâng cấp chuyển sang `HttpOnly Cookie` để trình duyệt tự quản lý và chống hoàn toàn việc JavaScript độc hại đọc trộm token."

#### Câu 3: Middleware là gì? Trong phần em làm có những middleware nào?
> **Cách trả lời:**  
> "Middleware là các hàm trung gian đứng giữa lúc client gửi request và lúc controller trả về response. Request sẽ chạy qua các middleware như qua các trạm kiểm soát.
> Trong phần của em có 3 middleware chính:
> 1. `verifyToken`: Kiểm tra token xem hợp lệ hay không.
> 2. `requireRole('admin')`: Kiểm tra role có phải admin không để chặn vào các route quản trị.
> 3. `errorHandler`: Đứng ở cuối cùng của toàn bộ ứng dụng để hứng mọi lỗi và trả về JSON chuẩn cho người dùng."

#### Câu 4: Nếu người dùng cố tình vào link Admin hoặc Đặt vé khi chưa đăng nhập thì hệ thống em xử lý thế nào?
> **Cách trả lời:**  
> "Dạ, em đã dùng `ProtectedRoute` và `AdminRoute` trong file `App.jsx`. Bên trong component này, em đọc biến `user` từ `AuthContext`. Nếu chưa có user (chưa đăng nhập), component sẽ trả về thẻ `<Navigate to="/login" />` để cưỡng chế đẩy người dùng về trang đăng nhập. Kể cả họ có cố tình dùng phần mềm Postman bắn request thẳng vào API server thì middleware `verifyToken` ở backend cũng sẽ chặn lại và trả về `401 Unauthorized` ngay lập tức."

#### Câu 5: Em giải thích `useMemo` trong trang chọn ghế để làm gì?
> **Cách trả lời:**  
> "Dạ, trong trang `Seats.jsx`, việc tính tổng số tiền vé phải duyệt qua danh sách ghế đang chọn để nhân giá ghế thường (90k) và ghế VIP (100k). Em dùng `useMemo` để ghi nhớ (cache) lại con số tổng tiền này. Con số này chỉ bị tính toán lại khi danh sách `selectedSeats` thay đổi. Nếu trang web có re-render do các trạng thái khác (như đóng mở modal, chuyển theme), React sẽ lấy luôn kết quả đã nhớ trước đó mà không phải tính lại, giúp trang chạy rất nhẹ và mượt."

#### Câu 6: Làm sao em đảm bảo người dùng không bao giờ chọn được quá 8 ghế?
> **Cách trả lời:**  
> "Em chặn ở cả 2 đầu:
> 1. **Ở Client (Redux):** Trong `bookingSlice.js`, action `toggleSeat` kiểm tra: nếu ghế chưa được chọn mà độ dài mảng `selectedSeats.length >= 8` thì em không thêm vào mảng nữa và bắn ra cảnh báo toast từ chối.
> 2. **Ở Server (API):** Khi gọi `POST /api/bookings`, server cũng chạy lệnh kiểm tra nếu `seats.length > 8` thì trả về ngay lỗi `HTTP 400 Bad Request`."

#### Câu 7: Giải thích hiện tượng trùng ghế (Concurrency) và cách em giải quyết trong MongoDB?
> **Cách trả lời:**  
> "Dạ, đây là bài toán tranh chấp tài nguyên khi 2 người cùng bấm đặt 1 ghế cùng 1 lúc. Để giải quyết triệt để, em không chỉ kiểm tra bằng lệnh `if` thông thường trong code (vì dễ bị race condition), mà em tạo một **Compound Unique Index** trong MongoDB trên 2 trường `{ showtimeId: 1, seatNumber: 1 }` của collection `Ticket`. Khi 2 request ghi cùng lúc, cơ sở dữ liệu sẽ khóa bản ghi, người nhanh hơn sẽ ghi thành công, còn người chậm hơn sẽ bị cơ sở dữ liệu văng lỗi trùng khóa `E11000`. Server của em bắt lỗi này và trả về `HTTP 409 Conflict` nêu rõ danh sách ghế đã bị người khác đặt."

#### Câu 8: Nếu lưu vé bị lỗi giữa chừng thì sao?
> **Cách trả lời:**  
> "Dạ, em áp dụng cơ chế **Rollback**. Khi khách đặt nhiều ghế (ví dụ 4 ghế), server sẽ tạo vé lần lượt. Nếu xảy ra lỗi ở ghế thứ 3, khối `catch` của em sẽ lập tức kích hoạt lệnh xóa tất cả các vé của đơn hàng đó vừa tạo trước đó (`Ticket.deleteMany`), đảm bảo cơ sở dữ liệu không bao giờ bị tồn tại các vé rác mồ côi."

#### Câu 9: Sơ đồ ghế của em có responsive trên điện thoại không? Làm bằng cách nào?
> **Cách trả lời:**  
> "Dạ có ạ. Vì một hàng ghế rạp chiếu có thể có từ 10 đến 14 ghế, màn hình điện thoại rất hẹp không thể co nhỏ ghế lại mãi được vì sẽ bị dính nút không bấm được. Em giải quyết bằng cách đặt container sơ đồ ghế có class Tailwind `overflow-x-auto min-w-fit`. Khi xem trên điện thoại, người dùng chỉ cần dùng ngón tay vuốt ngang là có thể cuộn sơ đồ mượt mà và bấm ghế thoải mái mà không bị vỡ giao diện."

#### Câu 10: `useEffect` và `useCallback` khác nhau thế nào, trong bài em dùng ở đâu?
> **Cách trả lời:**  
> - "`useEffect`: Dùng để thực hiện các hành động có tác dụng phụ (side-effects) sau khi component render, ví dụ như gọi API lấy danh sách ghế của suất chiếu khi vừa vào trang.
> - `useCallback`: Dùng để bọc một hàm lại, giúp hàm đó không bị tạo lại vùng nhớ mới mỗi khi component re-render, thường dùng khi truyền hàm xuống các component con như `Seat` để tránh component con bị vẽ lại không cần thiết."

#### Câu 11: Mật khẩu băm bằng Bcrypt nếu mất database thì hacker có giải mã ra được không?
> **Cách trả lời:**  
> "Thưa thầy là không thể giải mã trực tiếp được, vì Bcrypt là thuật toán băm một chiều (hashing), không phải thuật toán mã hóa đối xứng (encryption). Hacker chỉ có thể dùng phương pháp thử đúng sai (Brute-force hoặc Dictionary attack). Tuy nhiên Bcrypt có cơ chế sinh muối (Salt) ngẫu nhiên và thuật toán điều chỉnh độ phức tạp (Work factor / Cost factor) khiến việc dò mật khẩu cực kỳ tốn thời gian và gần như bất khả thi đối với các mật khẩu có độ phức tạp tiêu chuẩn."

#### Câu 12: Tại sao server không dùng giá tiền khách gửi lên mà phải tự tính lại?
> **Cách trả lời:**  
> "Dạ thưa thầy, đây là nguyên tắc **Zero Trust Client** trong bảo mật web. Phía Client (trình duyệt) hoàn toàn nằm dưới quyền kiểm soát của người dùng. Họ có thể mở DevTools F12 sửa file JavaScript, hoặc dùng Postman sửa gói tin gửi `price: 1000` đồng. Do đó, Server chỉ nhận danh sách tên ghế (`['A1', 'A2']`), sau đó server tự đọc giá niêm yết trong Database của rạp để tính tiền. Cách này triệt tiêu hoàn toàn nguy cơ gian lận giá vé."

---

## 5. KỊCH BẢN 3 PHÚT DEMO TRỰC TIẾP KHI BẢO VỆ

Khi thầy cô bảo: *"Em hãy mở màn hình demo tính năng của em phụ trách cho các thầy cô xem"*, bạn cứ bình tĩnh làm theo đúng 5 bước sau:

1. **Bước 1: Giới thiệu đăng nhập & Lưu trạng thái (Context & Token)**
   - Mở trang `/login`, gõ tài khoản `member@cinema.local` / mật khẩu `Member@123`.
   - Bấm Đăng nhập $\rightarrow$ chỉ cho thầy thấy trên thanh Header xuất hiện tên người dùng và avatar.
   - Bật F12 $\rightarrow$ tab `Application` $\rightarrow$ `Local Storage` $\rightarrow$ chỉ cho thầy thấy `token` đang được lưu tại đây. Bấm F5 tải lại trang để chứng minh trang web vẫn giữ đăng nhập mà không bị văng ra.
2. **Bước 2: Demo Chặn quyền (Protected Route)**
   - Đăng xuất ra ngoài. Cố tình gõ trên thanh địa chỉ URL: `http://localhost:3000/showtimes/xxx/seats`.
   - Trình duyệt tự động chuyển hướng lùi về trang `/login`. Nói với thầy: *"Đây là Protected Route em xây dựng để chặn khách chưa đăng nhập"*.
3. **Bước 3: Demo Sơ đồ ghế & Tính tiền tự động (SeatMap & useMemo)**
   - Đăng nhập lại, vào chọn một suất chiếu bất kỳ để mở sơ đồ ghế.
   - Thử nghiệm trên màn hình nhỏ (chuyển sang chế độ Mobile trên F12) $\rightarrow$ vuốt ngang sơ đồ cho thầy xem tính năng responsive.
   - Chọn lần lượt 2 ghế thường và 1 ghế VIP $\rightarrow$ chỉ cho thầy bảng Tóm tắt đơn hàng bên phải: tiền tự động cộng dồn lên đúng 280.000đ ngay lập tức mà không cần bấm nút tính tiền.
4. **Bước 4: Demo Giới hạn 8 ghế (Redux Validation)**
   - Bấm chọn tiếp đến ghế thứ 8.
   - Khi bấm sang ghế thứ 9 $\rightarrow$ Toast đỏ bật lên báo *"Chỉ được chọn tối đa 8 ghế"*. Ghế thứ 9 không đổi màu.
5. **Bước 5: Demo Đặt vé & Chống trùng ghế (Booking API & Concurrency)**
   - Bấm nút **"Thanh toán / Đặt vé"**. Mở tab `Network` cho thầy thấy request gửi `POST /api/bookings` thành công trả về `HTTP 201`.
   - F5 lại trang chọn ghế: chỉ cho thầy các ghế mình vừa mua lập tức đổi sang màu xám (Đã bán) và nút bị vô hiệu hóa (`disabled`), không ai có thể bấm mua lại lần nữa.
   - Tự tin kết luận: *"Hệ thống của em hoạt động hoàn toàn trơn tru, đồng bộ từ Client đến Database và xử lý chặt chẽ các rủi ro bảo mật ạ!"*
