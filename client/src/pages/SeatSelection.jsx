import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSeatPolling } from '../hooks/useSeatPolling';
import { useSocketSeats } from '../hooks/useSocketSeats';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, SeatMapSkeleton, useToast } from '../components/ui';
import { SeatMap, BookingSummary, SnackSelector } from '../components/booking';
import ConfirmDialog from '../components/seat/ConfirmDialog';
import CountdownTimer from '../components/seat/CountdownTimer';
import {
  setBookingShowtime,
  restoreBooking,
  toggleSeat,
  setSelectedSnacks,
  clearSnacks,
  selectSelectedSeats,
  selectSelectedSnacks,
  selectSnackTotal,
} from '../store/slices/bookingSlice';

export function SeatSelection() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { isAdmin, isAuthenticated } = useAuth();
  const { showtime, loading, error } = useSeatPolling(id);
  // kết nối Socket.io lấy danh sách ghế người khác đang giữ và hàm phát sự kiện giữ/nhả ghế
  const { heldByOthers, emitSeatHold, connected, rejectedSeat, clearRejectedSeat } = useSocketSeats(id);
  const selectedSeats = useSelector(selectSelectedSeats);
  const selectedSnacks = useSelector(selectSelectedSnacks);
  const snackTotal = useSelector(selectSnackTotal);
  const [step, setStep] = useState('seats'); // 'seats' | 'snacks'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [latestSoldSeats, setLatestSoldSeats] = useState(null);
  const refreshTimer = useRef(null);

  useEffect(() => {
    setLatestSoldSeats(null);
    clearTimeout(refreshTimer.current);
    if (id) {
      dispatch(setBookingShowtime(id));
      try {
        const saved = JSON.parse(window.sessionStorage.getItem('cinehub_pending_booking') || 'null');
        if (saved && String(saved.showtimeId) === String(id)) {
          dispatch(restoreBooking(saved));
          window.sessionStorage.removeItem('cinehub_pending_booking');
        }
      } catch {
        window.sessionStorage.removeItem('cinehub_pending_booking');
      }
    }
    return () => clearTimeout(refreshTimer.current);
  }, [id, dispatch]);

  // tự quay lại bước chọn ghế nếu danh sách ghế bị rỗng khi đang ở bước chọn combo
  useEffect(() => {
    if (step === 'snacks' && selectedSeats.length === 0) {
      setStep('seats');
    }
  }, [step, selectedSeats.length]);

  const standardPrice = Number(showtime?.standardPrice) || 0;
  const vipPrice = Number(showtime?.vipPrice) || standardPrice;
  const { regularCount, vipCount, totalAmount } = useMemo(() => {
    const regular = selectedSeats.filter((seat) => seat.type !== 'vip' && seat.seatType !== 'vip').length;
    const vip = selectedSeats.length - regular;
    return {
      regularCount: regular,
      vipCount: vip,
      totalAmount: regular * standardPrice + vip * vipPrice + snackTotal,
    };
  }, [selectedSeats, standardPrice, vipPrice, snackTotal]);

  useEffect(() => {
    if (!showtime?.soldSeats?.length || selectedSeats.length === 0) return;
    const soldSeats = new Set(showtime.soldSeats.map((seat) => `${seat.row}-${seat.number}`));
    selectedSeats.forEach((seat) => {
      if (soldSeats.has(`${seat.row}-${seat.number}`)) dispatch(toggleSeat(seat));
    });
  }, [showtime?.soldSeats, selectedSeats, dispatch]);

  // nếu ghế đang chọn trên máy mình vừa bị người khác giữ trước thì tự động bỏ chọn
  useEffect(() => {
    if (!heldByOthers.length || selectedSeats.length === 0) return;
    const heldSet = new Set(heldByOthers.map((seat) => `${seat.row}-${seat.number}`));
    selectedSeats.forEach((seat) => {
      if (heldSet.has(`${seat.row}-${seat.number}`)) {
        dispatch(toggleSeat(seat));
      }
    });
  }, [heldByOthers, selectedSeats, dispatch]);

  useEffect(() => {
    if (!rejectedSeat) return;
    if (rejectedSeat.code !== 'AUTH_REQUIRED') {
      const rejected = selectedSeats.find((seat) => seat.row === rejectedSeat.row && Number(seat.number) === Number(rejectedSeat.number));
      if (rejected) dispatch(toggleSeat(rejected));
    }
    toast.error(rejectedSeat.message || 'Không thể giữ ghế đã chọn.');
    clearRejectedSeat();
  }, [rejectedSeat, selectedSeats, dispatch, toast, clearRejectedSeat]);

  useEffect(() => {
    if (connected && isAuthenticated) selectedSeats.forEach((seat) => emitSeatHold(seat, 'hold'));
  }, [connected, isAuthenticated, id, selectedSeats, emitSeatHold]);

  if (loading && !showtime) {
    return (
      <div className="space-y-5">
        <SeatMapSkeleton />
      </div>
    );
  }

  if (isAdmin) return <Navigate to="/forbidden" replace />;

  if (!showtime) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Không tải được suất chiếu</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error || 'Suất chiếu không tồn tại.'}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Quay lại
        </Button>
      </section>
    );
  }

  const room = showtime.roomId && typeof showtime.roomId === 'object' ? showtime.roomId : {};
  const movie = showtime.movieId && typeof showtime.movieId === 'object' ? showtime.movieId : null;
  const movieId =
    (movie && (movie._id || movie.id)) ||
    (typeof showtime.movieId === 'string' ? showtime.movieId : null);
  const roomName = room.name || 'Phòng chiếu';

  // khi bấm chọn hoặc bỏ chọn ghế: cập nhật Redux đồng thời phát tín hiệu Socket.io sang người dùng khác
  const handleSeatToggle = (seat) => {
    const alreadySelected = selectedSeats.some(
      (s) => s.row === seat.row && Number(s.number) === Number(seat.number)
    );
    // nếu đã đủ 8 ghế thì chỉ dispatch để Redux báo lỗi giới hạn, không gửi lệnh hold lên socket
    if (!alreadySelected && selectedSeats.length >= 8) {
      dispatch(toggleSeat(seat));
      toast.error('Bạn chỉ có thể chọn tối đa 8 ghế.');
      return;
    }
    if (!alreadySelected && !isAuthenticated) {
      const rowSeats = Number(showtime.seatsPerRow || room.seatsPerRow || 10);
      const selectedInRow = selectedSeats.filter((item) => String(item.row).toUpperCase() === String(seat.row).toUpperCase());
      const soldInRow = (latestSoldSeats || showtime.soldSeats || []).filter((item) => String(item.row).toUpperCase() === String(seat.row).toUpperCase());
      const heldInRow = heldByOthers.filter((item) => String(item.row).toUpperCase() === String(seat.row).toUpperCase());
      const blocked = new Set([...selectedInRow, ...soldInRow, ...heldInRow].map((item) => Number(item.number)));
      const countSingles = (blockedSeats) => {
        let singles = 0;
        let run = 0;
        for (let number = 1; number <= rowSeats + 1; number += 1) {
          if (number <= rowSeats && !blockedSeats.has(number)) run += 1;
          else { if (run === 1) singles += 1; run = 0; }
        }
        return singles;
      };
      blocked.add(Number(seat.number));
      const singlesAfter = countSingles(blocked);
      const before = new Set(blocked);
      before.delete(Number(seat.number));
      if (singlesAfter > countSingles(before)) {
        toast.error('Vui lòng chọn ghế khác để không bỏ lẻ một ghế trong hàng.');
        return;
      }
    }
    dispatch(toggleSeat(seat));
    if (isAuthenticated) emitSeatHold(seat, alreadySelected ? 'release' : 'hold');
  };

  const refreshAfterConflict = async () => {
    try {
      const response = await api.get(`/showtimes/${id}`);
      setLatestSoldSeats(response.data?.data?.soldSeats || []);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => setLatestSoldSeats(null), 6000);
    } catch {
      toast.error('Không thể làm mới sơ đồ ghế. Hệ thống sẽ tự cập nhật sau ít giây.');
    }
  };

  const requestPayment = () => {
    if (!isAuthenticated) {
      window.sessionStorage.setItem('cinehub_pending_booking', JSON.stringify({
        showtimeId: id,
        selectedSeats,
        selectedSnacks,
      }));
      navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } });
      return;
    }
    setConfirmOpen(true);
  };

  const handleCheckout = () => {
    if (selectedSeats.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ghế.');
      return;
    }
    if (step === 'seats') {
      setStep('snacks');
      return;
    }
    requestPayment();
  };

  const handleSnacksChange = (nextSnacks) => {
    dispatch(setSelectedSnacks(nextSnacks));
  };

  const handleSkipSnacks = () => {
    dispatch(clearSnacks());
    requestPayment();
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">
            {step === 'seats' ? 'Chọn ghế xem phim' : 'Chọn combo bắp nước'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {movie?.title || 'Phim'} · {roomName}
          </p>
          {error && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" role="status">Chưa cập nhật được trạng thái ghế mới nhất. Đang thử lại tự động.</p>}
        </div>
        <CountdownTimer movieId={movieId} />
      </header>

      {/* Thanh tiến trình 2 bước: Chọn ghế -> Chọn combo bắp nước */}
      <nav aria-label="Các bước đặt vé" className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
        <button
          type="button"
          onClick={() => setStep('seats')}
          data-testid="step-seats-tab"
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 transition-colors ${
            step === 'seats'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-cinema-borderSubtle dark:bg-cinema-card dark:text-neutral-200'
          }`}
        >
          <span>1. Chọn ghế</span>
        </button>
        <span className="text-neutral-400" aria-hidden="true">→</span>
        <button
          type="button"
          onClick={() => {
            if (selectedSeats.length === 0) {
              toast.error('Vui lòng chọn ít nhất một ghế trước khi chọn combo.');
              return;
            }
            setStep('snacks');
          }}
          data-testid="step-snacks-tab"
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 transition-colors ${
            step === 'snacks'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-cinema-borderSubtle dark:bg-cinema-card dark:text-neutral-200'
          }`}
        >
          <span>2. Chọn combo bắp nước</span>
        </button>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {step === 'seats' ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card" aria-label="Sơ đồ phòng chiếu">
              <SeatMap
                rows={showtime.rows || room.rows || 8}
                seatsPerRow={showtime.seatsPerRow || room.seatsPerRow || 10}
                vipRows={showtime.vipRows || room.vipRows || []}
                soldSeats={latestSoldSeats || showtime.soldSeats || []}
                heldSeats={heldByOthers}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatToggle}
                standardPrice={standardPrice}
                vipPrice={vipPrice}
              />
            </section>
          ) : (
            <SnackSelector
              selectedSnacks={selectedSnacks}
              onChange={handleSnacksChange}
              onBack={() => setStep('seats')}
              onSkip={handleSkipSnacks}
              onContinue={requestPayment}
            />
          )}
        </div>
        <BookingSummary
          movie={movie}
          roomName={roomName}
          startTime={showtime.startTime}
          selectedSeats={selectedSeats}
          selectedSnacks={selectedSnacks}
          snackTotal={snackTotal}
          standardPrice={standardPrice}
          vipPrice={vipPrice}
          regularCount={regularCount}
          vipCount={vipCount}
          totalAmount={totalAmount}
          onCheckout={handleCheckout}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        showtimeId={id}
        movieTitle={movie?.title || 'Phim'}
        roomName={roomName}
        startTime={showtime.startTime}
        seats={selectedSeats}
        snacks={selectedSnacks}
        totalAmount={totalAmount}
        onConflict={refreshAfterConflict}
      />
    </div>
  );
}

export default SeatSelection;
