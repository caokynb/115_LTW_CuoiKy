const express = require('express');
const {
  createPaymentSession,
  getPaymentStatus,
  handlePaymentWebhook,
  cancelPayment,
} = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// endpoint webhook nhận callback từ cổng thanh toán (xác thực bằng x-webhook-secret thay cho JWT)
router.post('/webhook', handlePaymentWebhook);

// toàn bộ các route thao tác phiên thanh toán của người dùng đều bắt buộc đăng nhập
router.use(verifyToken);
// khởi tạo phiên thanh toán VietQR giữ chỗ 10 phút
router.post('/create', createPaymentSession);
// kiểm tra trạng thái phiên thanh toán và thời gian giữ chỗ còn lại
router.get('/:id', getPaymentStatus);
// hủy phiên thanh toán đang chờ để nhả ghế ngay
router.post('/:id/cancel', cancelPayment);

module.exports = router;
