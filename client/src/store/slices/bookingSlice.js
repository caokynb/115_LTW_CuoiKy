import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showtimeId: null,
  selectedSeats: [],
  selectedSnacks: [],
  error: null,
};

export const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setShowtimeId: (state, action) => {
      const newShowtimeId = action.payload;
      if (state.showtimeId !== newShowtimeId) {
        state.showtimeId = newShowtimeId;
        state.selectedSeats = [];
        state.selectedSnacks = [];
        state.error = null;
      }
    },
    restoreBooking: (state, action) => {
      const value = action.payload || {};
      state.showtimeId = value.showtimeId || state.showtimeId;
      state.selectedSeats = Array.isArray(value.selectedSeats) ? value.selectedSeats.slice(0, 8) : [];
      state.selectedSnacks = Array.isArray(value.selectedSnacks) ? value.selectedSnacks : [];
      state.error = null;
    },
    toggleSeat: (state, action) => {
      const seat = action.payload;
      if (!seat || seat.row === undefined || seat.number === undefined) {
        return;
      }

      const existingIndex = state.selectedSeats.findIndex(
        (s) => s.row === seat.row && s.number === seat.number
      );

      if (existingIndex >= 0) {
        // Seat is already selected -> Deselect seat and clear error
        state.selectedSeats.splice(existingIndex, 1);
        state.error = null;
      } else {
        // Attempting to select a new seat
        if (state.selectedSeats.length >= 8) {
          state.error = 'Bạn chỉ có thể chọn tối đa 8 ghế!';
          return;
        }
        state.selectedSeats.push(seat);
        state.error = null;
      }
    },
    setSelectedSnacks: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.selectedSnacks = list
        .filter((item) => item && item.snackId && Number(item.quantity) > 0)
        .map((item) => ({
          snackId: item.snackId,
          name: item.name || '',
          price: Number(item.price) || 0,
          quantity: Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 0))),
        }));
    },
    updateSnackQuantity: (state, action) => {
      const { snackId, name, price, delta } = action.payload || {};
      if (!snackId) return;
      const existingIndex = state.selectedSnacks.findIndex((s) => s.snackId === snackId);
      const currentQty = existingIndex >= 0 ? state.selectedSnacks[existingIndex].quantity : 0;
      const nextQty = Math.max(0, Math.min(20, currentQty + (Number(delta) || 0)));

      if (nextQty === 0) {
        if (existingIndex >= 0) {
          state.selectedSnacks.splice(existingIndex, 1);
        }
      } else if (existingIndex >= 0) {
        state.selectedSnacks[existingIndex].quantity = nextQty;
      } else {
        state.selectedSnacks.push({
          snackId,
          name: name || '',
          price: Number(price) || 0,
          quantity: nextQty,
        });
      }
    },
    clearSnacks: (state) => {
      state.selectedSnacks = [];
    },
    clearSeats: (state) => {
      state.selectedSeats = [];
      state.selectedSnacks = [];
      state.error = null;
    },
    clearBookingError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setShowtimeId,
  restoreBooking,
  toggleSeat,
  setSelectedSnacks,
  updateSnackQuantity,
  clearSnacks,
  clearSeats,
  clearBookingError,
} = bookingSlice.actions;

// Aliases for convenience across components
export const setBookingShowtime = setShowtimeId;
export const clearError = clearBookingError;

// Selectors
export const selectBookingState = (state) => state.booking;
export const selectBooking = selectBookingState;
export const selectShowtimeId = (state) => state.booking?.showtimeId ?? null;
export const selectSelectedSeats = (state) => state.booking?.selectedSeats ?? [];
export const selectSelectedSnacks = (state) => state.booking?.selectedSnacks ?? [];
export const selectSnackTotal = (state) =>
  (state.booking?.selectedSnacks || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
export const selectSelectedSeatCount = (state) => state.booking?.selectedSeats?.length ?? 0;
export const selectSelectedSeatsCount = selectSelectedSeatCount;
export const selectBookingError = (state) => state.booking?.error ?? null;
export const selectTotalPrice = (state) => {
  const seatTotal = (state.booking?.selectedSeats || []).reduce(
    (sum, s) => sum + (Number(s.price) || 0),
    0
  );
  const snackTotal = selectSnackTotal(state);
  return seatTotal + snackTotal;
};
export const selectIsSeatSelected = (row, number) => (state) =>
  (state.booking?.selectedSeats || []).some((s) => s.row === row && s.number === number);

export default bookingSlice.reducer;
