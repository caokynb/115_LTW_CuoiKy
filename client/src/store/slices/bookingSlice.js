import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showtimeId: null,
  selectedSeats: [],
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
        state.error = null;
      }
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
    clearSeats: (state) => {
      state.selectedSeats = [];
      state.error = null;
    },
    clearBookingError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setShowtimeId,
  toggleSeat,
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
export const selectSelectedSeatCount = (state) => state.booking?.selectedSeats?.length ?? 0;
export const selectSelectedSeatsCount = selectSelectedSeatCount;
export const selectBookingError = (state) => state.booking?.error ?? null;
export const selectTotalPrice = (state) =>
  (state.booking?.selectedSeats || []).reduce((sum, s) => sum + (s.price || 0), 0);
export const selectIsSeatSelected = (row, number) => (state) =>
  (state.booking?.selectedSeats || []).some((s) => s.row === row && s.number === number);

export default bookingSlice.reducer;
