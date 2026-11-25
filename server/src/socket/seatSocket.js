const { Server } = require('socket.io');

// thời gian khóa giữ ghế mặc định qua Socket.io: 5 phút
const HOLD_TTL_MS = 5 * 60 * 1000;

// tạo tên phòng Socket.io riêng cho từng suất chiếu để chỉ broadcast đúng khách đang xem suất đó
const getRoomName = (showtimeId) => `showtime:${showtimeId}`;

// khởi tạo Socket.io gắn lên HTTP server để đồng bộ trạng thái giữ ghế thời gian thực
const initSeatSocket = (httpServer, options = {}) => {
  const allowedOrigins = options.allowedOrigins || ['http://localhost:3000'];
  const holdTtlMs = Number(options.holdTtlMs) > 0 ? Number(options.holdTtlMs) : HOLD_TTL_MS;

  // cấu hình CORS cho kết nối WebSocket / polling khớp với danh sách origin cho phép
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS policy: Nguồn kết nối Socket không được phép'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // lưu danh sách ghế đang giữ theo từng suất chiếu: Map<showtimeId, Map<seatKey, entry>>
  const holdsByShowtime = new Map();

  // trích danh sách ghế còn hạn giữ chỗ của một suất để gửi về cho client
  const serializeHolds = (showtimeId) => {
    const showtimeMap = holdsByShowtime.get(String(showtimeId));
    if (!showtimeMap) return [];
    const now = Date.now();
    const list = [];
    for (const entry of showtimeMap.values()) {
      // chỉ lấy các ghế có thời gian hết hạn lớn hơn hiện tại
      if (entry.expiresAt > now) {
        list.push({
          row: entry.row,
          number: entry.number,
          socketId: entry.socketId,
          expiresAt: entry.expiresAt,
        });
      }
    }
    return list;
  };

  // phát lại danh sách ghế đang giữ mới nhất cho toàn bộ client trong phòng suất chiếu
  const broadcastHolds = (showtimeId) => {
    io.to(getRoomName(showtimeId)).emit('seat:holds', {
      showtimeId: String(showtimeId),
      holds: serializeHolds(showtimeId),
    });
  };

  // xóa một ghế khỏi bộ nhớ tạm và hủy timer đếm ngược tương ứng
  const releaseSeatEntry = (showtimeId, seatKey) => {
    const id = String(showtimeId);
    const showtimeMap = holdsByShowtime.get(id);
    if (!showtimeMap) return false;
    const entry = showtimeMap.get(seatKey);
    if (!entry) return false;
    if (entry.timer) clearTimeout(entry.timer);
    showtimeMap.delete(seatKey);
    // dọn luôn Map của suất chiếu nếu không còn ghế nào đang giữ
    if (showtimeMap.size === 0) {
      holdsByShowtime.delete(id);
    }
    return true;
  };

  // giải phóng toàn bộ ghế thuộc về một socketId khi rời phòng hoặc mất kết nối
  const releaseSocketHolds = (socketId, targetShowtimeId = null) => {
    const affectedShowtimes = new Set();
    const showtimeIds = targetShowtimeId
      ? [String(targetShowtimeId)]
      : Array.from(holdsByShowtime.keys());

    for (const showtimeId of showtimeIds) {
      const showtimeMap = holdsByShowtime.get(showtimeId);
      if (!showtimeMap) continue;
      for (const [seatKey, entry] of Array.from(showtimeMap.entries())) {
        if (entry.socketId === socketId) {
          releaseSeatEntry(showtimeId, seatKey);
          affectedShowtimes.add(showtimeId);
        }
      }
    }

    // thông báo ngay cho các client còn lại trong những suất chiếu vừa bị nhả ghế
    for (const showtimeId of affectedShowtimes) {
      broadcastHolds(showtimeId);
    }
  };

  io.on('connection', (socket) => {
    // client tham gia phòng của suất chiếu và nhận ngay danh sách ghế đang bị giữ
    socket.on('showtime:join', (payload = {}) => {
      const showtimeId = payload.showtimeId ? String(payload.showtimeId).trim() : '';
      if (!showtimeId) return;
      socket.join(getRoomName(showtimeId));
      socket.emit('seat:holds', {
        showtimeId,
        holds: serializeHolds(showtimeId),
      });
    });

    // client rời màn hình chọn ghế của suất chiếu -> rời phòng và nhả toàn bộ ghế đang giữ
    socket.on('showtime:leave', (payload = {}) => {
      const showtimeId = payload.showtimeId ? String(payload.showtimeId).trim() : '';
      if (!showtimeId) return;
      socket.leave(getRoomName(showtimeId));
      releaseSocketHolds(socket.id, showtimeId);
    });

    // xử lý sự kiện giữ ghế (hold) hoặc bỏ giữ ghế (release) từ người dùng
    socket.on('seat:holding', (payload = {}) => {
      const showtimeId = payload.showtimeId ? String(payload.showtimeId).trim() : '';
      const row = payload.row !== undefined ? String(payload.row).trim().toUpperCase() : '';
      const number = Number(payload.number);
      const action = payload.action === 'release' ? 'release' : 'hold';

      // bỏ qua payload thiếu thông tin hoặc số ghế không hợp lệ
      if (!showtimeId || !row || !Number.isInteger(number) || number < 1) {
        return;
      }

      const seatKey = `${row}-${number}`;
      let showtimeMap = holdsByShowtime.get(showtimeId);

      // nếu là thao tác bỏ chọn ghế -> chỉ nhả nếu chính socket này đang giữ
      if (action === 'release') {
        if (showtimeMap) {
          const existing = showtimeMap.get(seatKey);
          if (existing && existing.socketId === socket.id) {
            releaseSeatEntry(showtimeId, seatKey);
            broadcastHolds(showtimeId);
          }
        }
        return;
      }

      // khởi tạo Map cho suất chiếu nếu chưa có ghế nào được giữ
      if (!showtimeMap) {
        showtimeMap = new Map();
        holdsByShowtime.set(showtimeId, showtimeMap);
      }

      // nếu ghế đang được một socket khác giữ và chưa hết hạn thì từ chối giữ đè
      const existing = showtimeMap.get(seatKey);
      if (existing && existing.socketId !== socket.id && existing.expiresAt > Date.now()) {
        socket.emit('seat:hold-rejected', {
          showtimeId,
          row,
          number,
          message: `Ghế ${row}${number} đang được người khác giữ chỗ.`,
        });
        return;
      }

      // nếu chính socket này gia hạn lại ghế thì xóa timer cũ trước khi đặt timer mới
      if (existing && existing.timer) {
        clearTimeout(existing.timer);
      }

      // đặt bộ đếm tự động nhả ghế sau 5 phút nếu người dùng giữ lâu không thanh toán
      const timer = setTimeout(() => {
        if (releaseSeatEntry(showtimeId, seatKey)) {
          broadcastHolds(showtimeId);
        }
      }, holdTtlMs);
      // không để timer giữ tiến trình Node bị treo khi tắt server hoặc chạy test
      if (typeof timer.unref === 'function') {
        timer.unref();
      }

      showtimeMap.set(seatKey, {
        row,
        number,
        socketId: socket.id,
        expiresAt: Date.now() + holdTtlMs,
        timer,
      });

      // phát ngay trạng thái ghế giữ chỗ mới tới mọi trình duyệt đang mở cùng suất
      broadcastHolds(showtimeId);
    });

    // khi trình duyệt đóng tab hoặc rớt mạng, tự động giải phóng toàn bộ ghế socket đó đang giữ
    socket.on('disconnect', () => {
      releaseSocketHolds(socket.id);
    });
  });

  return io;
};

module.exports = {
  initSeatSocket,
  HOLD_TTL_MS,
};
