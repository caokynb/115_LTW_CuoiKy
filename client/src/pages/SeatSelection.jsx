import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSeatPolling } from '../hooks/useSeatPolling';
import { Button, SeatMapSkeleton, useToast } from '../components/ui';
import { SeatMap, BookingSummary, SnackSelector } from '../components/booking';
import ConfirmDialog from '../components/seat/ConfirmDialog';
import CountdownTimer from '../components/seat/CountdownTimer';
import {
  setBookingShowtime,
  toggleSeat,
  selectSelectedSeats,
} from '../store/slices/bookingSlice';

export function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { showtime, loading, error } = useSeatPolling(id);
  const selectedSeats = useSelector(selectSelectedSeats);
  const [selectedSnacks, setSelectedSnacks] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (id) dispatch(setBookingShowtime(id));
  }, [id, dispatch]);

  const standardPrice = Number(showtime?.standardPrice) || 0;
  const vipPrice = Number(showtime?.vipPrice) || standardPrice;
  const snackTotal = useMemo(
    () =>
      selectedSnacks.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [selectedSnacks]
  );
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

  if (loading && !showtime) {
    return (
      <div className="space-y-5">
        <SeatMapSkeleton />
      </div>
    );
  }

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

  const handleCheckout = () => {
    if (selectedSeats.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ghế.');
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">Chọn ghế xem phim</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {movie?.title || 'Phim'} · {roomName}
          </p>
          {error && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" role="status">Chưa cập nhật được trạng thái ghế mới nhất. Đang thử lại tự động.</p>}
        </div>
        <CountdownTimer movieId={movieId} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card" aria-label="Sơ đồ phòng chiếu">
            <SeatMap
              rows={showtime.rows || room.rows || 8}
              seatsPerRow={showtime.seatsPerRow || room.seatsPerRow || 10}
              vipRows={showtime.vipRows || room.vipRows || []}
              soldSeats={showtime.soldSeats || []}
              selectedSeats={selectedSeats}
              onSeatClick={(seat) => dispatch(toggleSeat(seat))}
              standardPrice={standardPrice}
              vipPrice={vipPrice}
            />
          </section>

          <SnackSelector
            selectedSnacks={selectedSnacks}
            onChange={setSelectedSnacks}
          />
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
      />
    </div>
  );
}

export default SeatSelection;
