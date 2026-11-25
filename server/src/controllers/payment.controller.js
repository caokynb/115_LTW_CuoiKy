const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Showtime = require('../models/Showtime');
const Coupon = require('../models/Coupon');
const Snack = require('../models/Snack');
const { evaluateCoupon } = require('./coupon.controller');

// lấy thời gian giữ chỗ mặc định (10 phút) từ model Payment
const { PAYMENT_TTL_MS } = Payment;

// thông tin ngân hàng nhận tiền mặc định lấy từ biến môi trường (hoặc fallback demo)
const DEFAULT_BANK_ID = process.env.VIETQR_BANK_ID || 'MB';
const DEFAULT_ACCOUNT_NO = process.env.VIETQR_ACCOUNT_NO || '0901234567';
const DEFAULT_ACCOUNT_NAME = process.env.VIETQR_ACCOUNT_NAME || 'CINEHUB CINEMA';

// tạo URL ảnh VietQR động chứa sẵn số tiền, nội dung chuyển khoản và tên chủ tài khoản
const buildVietQrUrl = ({ bankId, accountNo, accountName, amount, transferContent }) => {
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: transferContent,
    accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(
    accountNo
  )}-compact2.png?${params.toString()}`;
};

// sinh mã đơn hàng ngẫu nhiên ngắn gọn để khách dễ nhập nội dung chuyển khoản
const generateOrderCode = () => {
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  return `CH${ts}${suffix}`;
};

// quét các phiên thanh toán pending đã quá 10 phút để hủy đơn, nhả ghế và hoàn lượt coupon
const expireStalePayments = async () => {
  const now = new Date();
  const stalePayments = await Payment.find({
    status: 'pending',
    expiresAt: { $lte: now },
  });

  for (const payment of stalePayments) {
    // dùng findOneAndUpdate theo điều kiện status='pending' để tránh xử lý trùng khi có nhiều request cùng lúc
    const marked = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'expired' } },
      { returnDocument: 'after' }
    );
    if (!marked) continue;

    // chuyển đơn booking từ pending sang cancelled và giải phóng toàn bộ vé active
    const booking = await Booking.findById(marked.bookingId);
    if (booking && booking.status === 'pending') {
      booking.status = 'cancelled';
      await booking.save();

      await Ticket.updateMany(
        { bookingId: booking._id, status: 'active' },
        { $set: { status: 'cancelled' } }
      );

      // hoàn lại 1 lượt sử dụng coupon nếu đơn trước đó có áp dụng mã giảm giá
      if (booking.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: booking.couponCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
    }
  }
};

// khởi tạo phiên thanh toán VietQR kèm đơn pending 10 phút: POST /api/payments/create
const createPaymentSession = async (req, res, next) => {
  try {
    // dọn các phiên thanh toán quá hạn trước khi kiểm tra ghế trống
    await expireStalePayments();

    // kiểm tra trạng thái đăng nhập của người dùng
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!',
      });
    }

    // chặn tài khoản admin không cho tự đặt vé
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên chỉ dùng để quản lý hệ thống, không được phép đặt vé xem phim',
      });
    }

    const { showtimeId, seats, couponCode, snacks, provider = 'vietqr' } = req.body || {};

    // kiểm tra id suất chiếu có hợp lệ không
    if (!showtimeId || !mongoose.Types.ObjectId.isValid(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID suất chiếu không hợp lệ',
      });
    }

    // giới hạn số lượng ghế từ 1 đến 8 ghế trong một đơn
    if (!Array.isArray(seats) || seats.length < 1 || seats.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng ghế phải từ 1 đến 8 ghế',
      });
    }

    // chuẩn hóa từng ghế gửi lên và chặn trường hợp trùng ghế ngay trong request
    const resolvedSeats = [];
    const seenSeatKeys = new Set();

    for (const seat of seats) {
      if (!seat || typeof seat !== 'object') {
        return res.status(400).json({ success: false, message: 'Dữ liệu ghế không hợp lệ' });
      }
      const { row, number } = seat;
      if (row === undefined || row === null || number === undefined || number === null) {
        return res.status(400).json({
          success: false,
          message: 'Mỗi ghế phải bao gồm hàng ghế (row) và số ghế (number)',
        });
      }
      const rowStr = String(row).trim().toUpperCase();
      const seatNumber = Number(number);
      if (!rowStr || !Number.isInteger(seatNumber) || seatNumber < 1) {
        return res.status(400).json({
          success: false,
          message: 'Hàng ghế hoặc số ghế không hợp lệ',
        });
      }

      // quy đổi tên hàng (A, B... hoặc 1, 2...) sang chỉ số hàng 1-based để so khớp phòng chiếu
      let rowIndex;
      if (/^[A-Z]$/.test(rowStr)) {
        rowIndex = rowStr.charCodeAt(0) - 64;
      } else if (/^\d+$/.test(rowStr)) {
        rowIndex = parseInt(rowStr, 10);
      } else {
        return res.status(400).json({
          success: false,
          message: `Hàng ghế ${rowStr} không hợp lệ`,
        });
      }

      const seatKey = `${rowStr}-${seatNumber}`;
      if (seenSeatKeys.has(seatKey)) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách ghế không được chứa ghế trùng nhau',
        });
      }
      seenSeatKeys.add(seatKey);
      resolvedSeats.push({ row: rowStr, number: seatNumber, rowIndex });
    }

    // truy vấn suất chiếu kèm thông tin phòng để kiểm tra giới hạn ghế và giá vé
    const showtime = await Showtime.findById(showtimeId).populate('roomId');
    if (!showtime) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });
    }
    const room = showtime.roomId;
    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin phòng chiếu' });
    }

    // không cho tạo phiên thanh toán cho suất chiếu đã bắt đầu hoặc trong quá khứ
    if (new Date(showtime.startTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Suất chiếu đã bắt đầu hoặc dữ liệu không hợp lệ',
      });
    }

    // kiểm tra tọa độ ghế có nằm trong phòng không và gán giá vé authoritative từ DB
    for (const seat of resolvedSeats) {
      if (
        seat.rowIndex < 1 ||
        seat.rowIndex > room.rows ||
        seat.number < 1 ||
        seat.number > room.seatsPerRow
      ) {
        return res.status(400).json({
          success: false,
          message: `Ghế ${seat.row}${seat.number} nằm ngoài phạm vi phòng chiếu`,
        });
      }

      const isVip =
        Array.isArray(room.vipRows) &&
        room.vipRows.some((vr) => Number(vr) === seat.rowIndex);
      seat.seatType = isVip ? 'vip' : 'standard';
      seat.price = isVip ? showtime.vipPrice : showtime.standardPrice;
    }

    // tổng tiền ghế được cộng hoàn toàn ở server
    const seatTotal = resolvedSeats.reduce((sum, s) => sum + s.price, 0);

    // kiểm tra danh sách combo bắp nước và lấy giá gốc trực tiếp từ DB
    let snackTotal = 0;
    const resolvedSnacks = [];
    if (snacks !== undefined && snacks !== null) {
      if (!Array.isArray(snacks)) {
        return res.status(400).json({
          success: false,
          message: 'Danh sách combo bắp nước không hợp lệ.',
        });
      }

      if (snacks.length > 0) {
        // gộp số lượng nếu cùng một snackId xuất hiện nhiều lần trong payload
        const quantityBySnackId = new Map();
        for (const item of snacks) {
          if (!item || typeof item !== 'object') {
            return res.status(400).json({
              success: false,
              message: 'Thông tin combo bắp nước không hợp lệ.',
            });
          }
          const { snackId, quantity } = item;
          const qty = Number(quantity);
          if (!snackId || !mongoose.Types.ObjectId.isValid(snackId)) {
            return res.status(400).json({
              success: false,
              message: 'ID combo bắp nước không hợp lệ.',
            });
          }
          if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
            return res.status(400).json({
              success: false,
              message: 'Số lượng mỗi combo phải là số nguyên từ 1 đến 20.',
            });
          }
          const key = String(snackId);
          const nextQty = (quantityBySnackId.get(key) || 0) + qty;
          if (nextQty > 20) {
            return res.status(400).json({
              success: false,
              message: 'Số lượng mỗi combo phải là số nguyên từ 1 đến 20.',
            });
          }
          quantityBySnackId.set(key, nextQty);
        }

        // chỉ chấp nhận các combo đang ở trạng thái mở bán
        const snackIds = Array.from(quantityBySnackId.keys());
        const dbSnacks = await Snack.find({ _id: { $in: snackIds }, isAvailable: true });
        if (dbSnacks.length !== snackIds.length) {
          return res.status(400).json({
            success: false,
            message: 'Một số combo bắp nước không tồn tại hoặc đã ngừng bán.',
          });
        }

        // chụp lại snapshot tên và giá combo tại thời điểm đặt
        for (const dbSnack of dbSnacks) {
          const quantity = quantityBySnackId.get(String(dbSnack._id));
          snackTotal += dbSnack.price * quantity;
          resolvedSnacks.push({
            snackId: dbSnack._id,
            name: dbSnack.name,
            price: dbSnack.price,
            quantity,
          });
        }
      }
    }

    // tính giá gốc và áp dụng mã giảm giá (nếu có) ngay trên server
    const originalPrice = seatTotal + snackTotal;
    let totalPrice = originalPrice;
    let discountAmount = 0;
    let appliedCouponCode = null;
    let couponToReserve = null;

    if (couponCode !== undefined && couponCode !== null && String(couponCode).trim() !== '') {
      const couponResult = await evaluateCoupon(couponCode, originalPrice);
      couponToReserve = couponResult.coupon;
      discountAmount = couponResult.discountAmount;
      totalPrice = couponResult.finalAmount;
      appliedCouponCode = couponResult.coupon.code;
    }

    // kiểm tra lớp 1 xem có ghế nào đang bị giữ hoặc đã bán chưa
    const seatConditions = resolvedSeats.map((s) => ({ row: s.row, number: s.number }));
    const existingTickets = await Ticket.find({
      showtimeId: showtime._id,
      status: 'active',
      $or: seatConditions,
    }).select('row number -_id');

    if (existingTickets && existingTickets.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ghế đã được đặt',
        conflictingSeats: existingTickets.map((t) => ({ row: t.row, number: t.number })),
      });
    }

    // giữ atomic 1 lượt dùng coupon trước khi ghi booking và ticket
    let reservedCoupon = null;
    if (couponToReserve) {
      reservedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: couponToReserve._id,
          isActive: true,
          expiresAt: { $gt: new Date() },
          $expr: { $lt: ['$usedCount', '$maxUses'] },
        },
        { $inc: { usedCount: 1 } },
        { returnDocument: 'after' }
      );
      if (!reservedCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã hết lượt sử dụng hoặc đã hết hạn.',
        });
      }
    }

    // tạo đơn booking pending, chèn ticket active (bắt E11000 lớp 2) và tạo bản ghi Payment
    let booking;
    let payment;
    try {
      booking = await Booking.create({
        userId: req.user._id,
        showtimeId: showtime._id,
        snacks: resolvedSnacks,
        snackTotal,
        originalPrice,
        discountAmount,
        couponCode: appliedCouponCode,
        totalPrice,
        status: 'pending',
      });

      const ticketDocs = resolvedSeats.map((s) => ({
        bookingId: booking._id,
        showtimeId: showtime._id,
        row: s.row,
        number: s.number,
        seatType: s.seatType,
        price: s.price,
        status: 'active',
      }));

      // chèn vé theo thứ tự; nếu trùng ghế do tranh chấp đồng thời MongoDB sẽ ném lỗi E11000
      const tickets = await Ticket.insertMany(ticketDocs, { ordered: true });

      // tạo mã đơn thanh toán và URL VietQR tương ứng
      const orderCode = generateOrderCode();
      const bankInfo = {
        bankId: DEFAULT_BANK_ID,
        accountNo: DEFAULT_ACCOUNT_NO,
        accountName: DEFAULT_ACCOUNT_NAME,
        transferContent: `CINEHUB ${orderCode}`,
      };
      const qrUrl = buildVietQrUrl({
        ...bankInfo,
        amount: totalPrice,
      });

      payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        orderCode,
        amount: totalPrice,
        provider: ['vietqr', 'momo', 'vnpay'].includes(provider) ? provider : 'vietqr',
        qrUrl,
        bankInfo,
        status: 'pending',
        expiresAt: new Date(Date.now() + PAYMENT_TTL_MS),
      });

      return res.status(201).json({
        success: true,
        message: 'Khởi tạo thanh toán VietQR thành công. Vui lòng hoàn tất trong 10 phút.',
        data: {
          payment,
          booking,
          tickets,
        },
      });
    } catch (err) {
      // rollback lượt coupon nếu bước tạo đơn/vé/payment gặp lỗi
      if (reservedCoupon && reservedCoupon._id) {
        try {
          await Coupon.findByIdAndUpdate(reservedCoupon._id, { $inc: { usedCount: -1 } });
        } catch (couponErr) {
          console.error('[Payment Controller] Lỗi hoàn lượt coupon:', couponErr);
        }
      }
      // dọn payment nếu đã tạo dở
      if (payment && payment._id) {
        try {
          await Payment.findByIdAndDelete(payment._id);
        } catch (payCleanupErr) {
          console.error('[Payment Controller] Lỗi xóa payment dọn dẹp:', payCleanupErr);
        }
      }
      // dọn booking và toàn bộ ticket mồ côi nếu phát sinh lỗi khi chèn vé
      if (booking && booking._id) {
        try {
          await Ticket.deleteMany({ bookingId: booking._id });
          await Booking.findByIdAndDelete(booking._id);
        } catch (cleanupErr) {
          console.error('[Payment Controller] Lỗi xóa booking/vé dọn dẹp:', cleanupErr);
        }
      }

      // kiểm tra xem lỗi có phải do trùng khóa E11000 khi 2 request cùng đặt một ghế hay không
      const isDuplicateKey =
        err.code === 11000 ||
        (err.writeErrors && err.writeErrors.some((e) => e.code === 11000));

      if (isDuplicateKey) {
        const conflictingTickets = await Ticket.find({
          showtimeId: showtime._id,
          status: 'active',
          $or: seatConditions,
        }).select('row number -_id');

        const conflictingSeats =
          conflictingTickets.length > 0
            ? conflictingTickets.map((t) => ({ row: t.row, number: t.number }))
            : seatConditions;

        return res.status(409).json({
          success: false,
          message: 'Ghế đã được đặt',
          conflictingSeats,
        });
      }

      return next(err);
    }
  } catch (error) {
    return next(error);
  }
};

// lấy trạng thái phiên thanh toán và số giây giữ chỗ còn lại: GET /api/payments/:id
const getPaymentStatus = async (req, res, next) => {
  try {
    // cập nhật các đơn quá hạn trước khi trả trạng thái cho client
    await expireStalePayments();

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID thanh toán không hợp lệ' });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thanh toán' });
    }

    // chỉ chủ giao dịch hoặc admin mới được xem thông tin phiên thanh toán
    if (
      payment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập phiên thanh toán này',
      });
    }

    // nạp thông tin suất chiếu, phim, phòng và danh sách vé gắn với đơn
    const booking = await Booking.findById(payment.bookingId)
      .populate({
        path: 'showtimeId',
        populate: [
          { path: 'movieId', select: 'title duration posterUrl' },
          { path: 'roomId', select: 'name rows seatsPerRow' },
        ],
      })
      .populate('tickets');

    // tính số giây còn lại nếu giao dịch vẫn đang ở trạng thái pending
    const remainingSeconds =
      payment.status === 'pending'
        ? Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000))
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        payment,
        booking,
        tickets: booking?.tickets || [],
        remainingSeconds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// webhook nhận tín hiệu xác nhận thanh toán từ cổng VietQR: POST /api/payments/webhook
const handlePaymentWebhook = async (req, res, next) => {
  try {
    // kiểm tra và giải phóng các giao dịch đã quá 10 phút trước khi xử lý webhook
    await expireStalePayments();

    // đối chiếu header bí mật nếu server có cấu hình PAYMENT_WEBHOOK_SECRET
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const providedSecret = req.headers['x-webhook-secret'];
      if (providedSecret !== configuredSecret) {
        return res.status(401).json({
          success: false,
          message: 'Chữ ký webhook thanh toán không hợp lệ',
        });
      }
    }

    const { orderCode, paymentId, status = 'paid', transactionRef } = req.body || {};
    // tìm giao dịch theo paymentId hoặc theo mã chuyển khoản orderCode
    let payment = null;
    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
    } else if (orderCode) {
      payment = await Payment.findOne({ orderCode: String(orderCode).trim().toUpperCase() });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán',
      });
    }

    // xử lý idempotent: nếu giao dịch đã paid từ trước thì trả 200 luôn, không ghi lặp
    if (payment.status === 'paid') {
      const booking = await Booking.findById(payment.bookingId);
      return res.status(200).json({
        success: true,
        message: 'Giao dịch đã được xác nhận trước đó',
        data: { payment, booking },
      });
    }

    // từ chối xác nhận nếu phiên thanh toán đã quá 10 phút giữ chỗ
    if (payment.status === 'expired' || new Date(payment.expiresAt) <= new Date()) {
      await expireStalePayments();
      return res.status(409).json({
        success: false,
        message: 'Phiên thanh toán đã hết hạn (quá 10 phút), ghế đã được giải phóng.',
      });
    }

    // từ chối nếu phiên đã bị hủy hoặc thất bại trước đó
    if (payment.status === 'cancelled' || payment.status === 'failed') {
      return res.status(409).json({
        success: false,
        message: 'Phiên thanh toán đã bị hủy hoặc thất bại.',
      });
    }

    // trường hợp webhook báo giao dịch thất bại/hủy thì đóng đơn và nhả ghế
    if (status === 'failed' || status === 'cancelled') {
      payment.status = status;
      await payment.save();
      const booking = await Booking.findById(payment.bookingId);
      if (booking && booking.status === 'pending') {
        booking.status = 'cancelled';
        await booking.save();
        await Ticket.updateMany(
          { bookingId: booking._id, status: 'active' },
          { $set: { status: 'cancelled' } }
        );
      }
      return res.status(200).json({
        success: true,
        message: 'Đã cập nhật trạng thái hủy thanh toán và giải phóng ghế.',
        data: { payment, booking },
      });
    }

    // cập nhật thanh toán thành paid và chuyển đơn đặt vé sang confirmed
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.transactionRef = transactionRef || `TX-${payment.orderCode}`;
    await payment.save();

    const booking = await Booking.findByIdAndUpdate(
      payment.bookingId,
      { $set: { status: 'confirmed' } },
      { returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: 'Xác nhận thanh toán thành công, đơn vé đã được kích hoạt.',
      data: {
        payment,
        booking,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// hủy phiên thanh toán đang chờ và giải phóng ghế ngay lập tức: POST /api/payments/:id/cancel
const cancelPayment = async (req, res, next) => {
  try {
    await expireStalePayments();

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID thanh toán không hợp lệ' });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiên thanh toán' });
    }

    // kiểm tra quyền sở hữu giao dịch
    if (
      payment.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy phiên thanh toán này',
      });
    }

    // không cho hủy qua endpoint checkout nếu đơn đã thanh toán thành công
    if (payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã thanh toán, không thể hủy tại bước chờ thanh toán.',
      });
    }

    if (payment.status === 'pending') {
      payment.status = 'cancelled';
      await payment.save();
    }

    // hủy đơn booking pending, chuyển vé sang cancelled để mở lại ghế và hoàn lượt coupon
    const booking = await Booking.findById(payment.bookingId);
    if (booking && booking.status === 'pending') {
      booking.status = 'cancelled';
      await booking.save();
      await Ticket.updateMany(
        { bookingId: booking._id, status: 'active' },
        { $set: { status: 'cancelled' } }
      );
      if (booking.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: booking.couponCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Đã hủy phiên thanh toán và giải phóng ghế.',
      data: { payment },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPaymentSession,
  getPaymentStatus,
  handlePaymentWebhook,
  cancelPayment,
  expireStalePayments,
};
