const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Showtime = require('../models/Showtime');
const Snack = require('../models/Snack');
const AppError = require('../utils/AppError');

/**
 * Tạo đơn đặt vé mới
 * POST /api/bookings
 */
const createBooking = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục!',
      });
    }

    // Tài khoản Admin chỉ dùng để quản trị hệ thống, không được phép đặt vé
    if (req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên chỉ dùng để quản lý hệ thống, không được phép đặt vé xem phim',
      });
    }

    const { showtimeId, seats, snacks } = req.body || {};

    // 1. Kiểm tra tính hợp lệ của showtimeId
    if (!showtimeId || !mongoose.Types.ObjectId.isValid(showtimeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID suất chiếu không hợp lệ',
      });
    }

    // 2. Kiểm tra danh sách ghế (tối thiểu 1, tối đa 8 ghế)
    if (!Array.isArray(seats) || seats.length < 1 || seats.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng ghế phải từ 1 đến 8 ghế',
      });
    }

    // 3. Phân tích và kiểm tra định dạng từng ghế, chống trùng ghế trong request payload
    const resolvedSeats = [];
    const seenSeatKeys = new Set();

    for (const seat of seats) {
      if (!seat || typeof seat !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu ghế không hợp lệ',
        });
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

      resolvedSeats.push({
        row: rowStr,
        number: seatNumber,
        rowIndex,
      });
    }

    // 4. Lấy thông tin suất chiếu và phòng chiếu
    const showtime = await Showtime.findById(showtimeId).populate('roomId');
    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy suất chiếu',
      });
    }

    const room = showtime.roomId;
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin phòng chiếu',
      });
    }

    // 5. Kiểm tra thời gian bắt đầu suất chiếu (không được đặt suất chiếu trong quá khứ)
    if (new Date(showtime.startTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Suất chiếu đã bắt đầu hoặc dữ liệu không hợp lệ',
      });
    }

    // 6. Kiểm tra giới hạn ghế trong phòng chiếu và tính giá vé authoritative từ Server
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

    // Tính tổng tiền dựa trên giá vé do Server xác định (bỏ qua mọi giá vé từ Client)
    const seatTotal = resolvedSeats.reduce((sum, s) => sum + s.price, 0);

    // kiểm tra và cộng tiền combo bắp nước từ giá gốc trong database
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
          quantityBySnackId.set(key, (quantityBySnackId.get(key) || 0) + qty);
        }

        const snackIds = Array.from(quantityBySnackId.keys());
        const dbSnacks = await Snack.find({ _id: { $in: snackIds }, isAvailable: true });
        if (dbSnacks.length !== snackIds.length) {
          return res.status(400).json({
            success: false,
            message: 'Một số combo bắp nước không tồn tại hoặc đã ngừng bán.',
          });
        }

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

    const totalPrice = seatTotal + snackTotal;

    // 7. Kiểm tra trùng ghế (Tier 1 - Pre-check query)
    const seatConditions = resolvedSeats.map((s) => ({
      row: s.row,
      number: s.number,
    }));

    const existingTickets = await Ticket.find({
      showtimeId: showtime._id,
      status: 'active',
      $or: seatConditions,
    }).select('row number -_id');

    if (existingTickets && existingTickets.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ghế đã được đặt',
        conflictingSeats: existingTickets.map((t) => ({
          row: t.row,
          number: t.number,
        })),
      });
    }

    // 8. Tạo đơn đặt vé và vé (Tier 2 - Bắt lỗi trùng khóa E11000 khi có tranh chấp đồng thời)
    let booking;
    try {
      booking = await Booking.create({
        userId: req.user._id,
        showtimeId: showtime._id,
        snacks: resolvedSnacks,
        snackTotal,
        totalPrice,
        status: 'confirmed',
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

      const tickets = await Ticket.insertMany(ticketDocs, { ordered: true });

      return res.status(201).json({
        success: true,
        message: 'Đặt vé thành công',
        data: {
          booking,
          tickets,
        },
      });
    } catch (err) {
      // Dọn dẹp booking và các vé đã chèn dở dang nếu xảy ra lỗi trong quá trình tạo vé
      if (booking && booking._id) {
        try {
          await Ticket.deleteMany({ bookingId: booking._id });
          await Booking.findByIdAndDelete(booking._id);
        } catch (cleanupErr) {
          console.error('[Booking Controller] Lỗi xóa booking/vé dọn dẹp:', cleanupErr);
        }
      }

      // Xử lý lỗi trùng khóa E11000 do vi phạm compound unique index của Ticket
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

/**
 * Lấy danh sách vé đã đặt của người dùng hiện tại
 * GET /api/bookings/my-bookings
 */
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: 'showtimeId',
        populate: [
          { path: 'movieId', select: 'title duration posterUrl' },
          { path: 'roomId', select: 'name rows seatsPerRow' },
        ],
      })
      .populate('tickets')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Lấy chi tiết đơn đặt vé theo ID
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn đặt vé không hợp lệ',
      });
    }

    const booking = await Booking.findById(id)
      .populate({
        path: 'showtimeId',
        populate: [
          { path: 'movieId', select: 'title duration posterUrl' },
          { path: 'roomId', select: 'name rows seatsPerRow' },
        ],
      })
      .populate('tickets');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt vé',
      });
    }

    if (
      booking.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập đơn đặt vé này',
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Hủy đơn đặt vé và giải phóng ghế (nhả ghế)
 * PATCH /api/bookings/:id/cancel
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn đặt vé không hợp lệ',
      });
    }

    // 2. Tìm đơn đặt vé và populate showtimeId
    const booking = await Booking.findById(id).populate('showtimeId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn đặt vé',
      });
    }

    // 3. Kiểm tra quyền sở hữu (chỉ chủ vé hoặc admin)
    if (
      booking.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn đặt vé này',
      });
    }

    // 4. Kiểm tra xem đơn đã bị hủy trước đó chưa
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn đặt vé này đã được hủy trước đó',
      });
    }

    // 5. Kiểm tra thời gian trước giờ chiếu ít nhất 2 tiếng
    if (!booking.showtimeId || !booking.showtimeId.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin suất chiếu của đơn đặt vé',
      });
    }

    const startTime = new Date(booking.showtimeId.startTime).getTime();
    const now = Date.now();
    const diffHours = (startTime - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ được phép hủy vé trước giờ chiếu ít nhất 2 tiếng',
      });
    }

    // 6. Cập nhật trạng thái booking sang cancelled
    booking.status = 'cancelled';
    await booking.save();

    // 7. Cập nhật trạng thái tất cả vé thuộc đơn sang cancelled để giải phóng ghế
    await Ticket.updateMany(
      { bookingId: booking._id },
      { $set: { status: 'cancelled' } }
    );

    // 8. Lấy dữ liệu cập nhật đầy đủ để trả về client
    const updatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'showtimeId',
        populate: [
          { path: 'movieId', select: 'title duration posterUrl' },
          { path: 'roomId', select: 'name rows seatsPerRow' },
        ],
      })
      .populate('tickets');

    return res.status(200).json({
      success: true,
      message: 'Hủy vé thành công, ghế đã được giải phóng',
      data: updatedBooking,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};
