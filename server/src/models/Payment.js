const mongoose = require('mongoose');

// thời gian giữ chỗ tối đa cho một phiên thanh toán pending: 10 phút
const PAYMENT_TTL_MS = 10 * 60 * 1000;

// schema lưu thông tin giao dịch thanh toán gắn với từng đơn đặt vé
const paymentSchema = new mongoose.Schema(
  {
    // mỗi đơn đặt vé chỉ gắn với một phiên thanh toán duy nhất
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Thiếu thông tin đơn đặt vé'],
      unique: true,
    },
    // tham chiếu tài khoản người thực hiện thanh toán để kiểm tra quyền sở hữu
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Thiếu thông tin người thanh toán'],
      index: true,
    },
    // mã giao dịch ngắn gọn viết hoa (ví dụ CH...) dùng làm nội dung chuyển khoản
    orderCode: {
      type: String,
      required: [true, 'Thiếu mã giao dịch'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // số tiền cần thanh toán đã được tính lại từ server (đã gồm combo và giảm giá)
    amount: {
      type: Number,
      required: [true, 'Số tiền thanh toán không được để trống'],
      min: [0, 'Số tiền thanh toán không được âm'],
    },
    // cổng thanh toán sử dụng (mặc định vietqr)
    provider: {
      type: String,
      enum: {
        values: ['vietqr', 'momo', 'vnpay'],
        message: 'Cổng thanh toán không hợp lệ',
      },
      default: 'vietqr',
    },
    // đường dẫn ảnh mã QR động được tạo theo chuẩn VietQR
    qrUrl: {
      type: String,
      required: true,
    },
    // thông tin tài khoản nhận chuyển khoản đi kèm để hiển thị cho khách
    bankInfo: {
      bankId: { type: String, required: true },
      accountNo: { type: String, required: true },
      accountName: { type: String, required: true },
      transferContent: { type: String, required: true },
    },
    // trạng thái xử lý của giao dịch thanh toán
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'expired', 'failed', 'cancelled'],
        message: 'Trạng thái thanh toán không hợp lệ',
      },
      default: 'pending',
      index: true,
    },
    // mốc thời gian hết hạn giữ chỗ (mặc định +10 phút kể từ lúc tạo)
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + PAYMENT_TTL_MS),
      index: true,
    },
    // thời điểm webhook xác nhận thanh toán thành công
    paidAt: {
      type: Date,
      default: null,
    },
    // mã giao dịch phía ngân hàng hoặc cổng thanh toán trả về qua webhook
    transactionRef: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.PAYMENT_TTL_MS = PAYMENT_TTL_MS;
