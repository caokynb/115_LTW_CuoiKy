import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// suy ra địa chỉ Socket.io server từ biến môi trường (hoặc cắt bỏ hậu tố /api của API URL)
const resolveSocketUrl = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

// hook kết nối Socket.io theo dõi và phát trạng thái giữ ghế thời gian thực cho một suất chiếu
export function useSocketSeats(showtimeId) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('cinema_token') : null;
  const socketRef = useRef(null);
  const [socketId, setSocketId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [holds, setHolds] = useState([]);
  const [rejectedSeat, setRejectedSeat] = useState(null);
  const clearRejectedSeat = useCallback(() => setRejectedSeat(null), []);

  // mở kết nối socket khi vào trang suất chiếu và dọn sạch khi rời trang
  useEffect(() => {
    if (!showtimeId) return undefined;

    const socket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: token ? { token } : {},
    });
    socketRef.current = socket;

    // khi kết nối thành công thì lưu socket.id và tham gia đúng phòng suất chiếu
    const handleConnect = () => {
      setConnected(true);
      setSocketId(socket.id || null);
      socket.emit('showtime:join', { showtimeId });
    };

    // đánh dấu mất kết nối khi socket bị ngắt
    const handleDisconnect = () => {
      setConnected(false);
    };

    // cập nhật danh sách ghế đang được giữ nếu sự kiện khớp đúng suất chiếu hiện tại
    const handleSeatHolds = (payload) => {
      if (!payload || String(payload.showtimeId) !== String(showtimeId)) return;
      setHolds(Array.isArray(payload.holds) ? payload.holds : []);
    };
    const handleHoldRejected = (payload) => {
      if (!payload || String(payload.showtimeId) !== String(showtimeId)) return;
      setRejectedSeat(payload);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('seat:holds', handleSeatHolds);
    socket.on('seat:hold-rejected', handleHoldRejected);

    // trường hợp socket đã sẵn sàng ngay khi mount thì chủ động join phòng luôn
    if (socket.connected) {
      handleConnect();
    }

    // khi đổi suất hoặc rời trang: rời phòng, gỡ listener và ngắt kết nối để server nhả ghế ngay
    return () => {
      socket.emit('showtime:leave', { showtimeId });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('seat:holds', handleSeatHolds);
      socket.off('seat:hold-rejected', handleHoldRejected);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setSocketId(null);
      setHolds([]);
    };
  }, [showtimeId, token]);

  // phát sự kiện giữ hoặc bỏ giữ một ghế lên server
  const emitSeatHold = useCallback(
    (seat, action = 'hold') => {
      if (!socketRef.current || !showtimeId || !seat) return;
      socketRef.current.emit('seat:holding', {
        showtimeId,
        row: seat.row,
        number: seat.number,
        action,
      });
    },
    [showtimeId]
  );

  // tách danh sách ghế người khác đang giữ khỏi ghế của chính mình để tô màu vàng khóa chọn
  const heldByOthers = useMemo(
    () => holds.filter((h) => !socketId || h.socketId !== socketId),
    [holds, socketId]
  );

  return {
    heldByOthers,
    emitSeatHold,
    connected,
    rejectedSeat,
    clearRejectedSeat,
  };
}

export default useSocketSeats;
