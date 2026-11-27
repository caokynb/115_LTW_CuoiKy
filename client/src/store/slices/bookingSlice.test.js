import bookingReducer, {
  setShowtimeId,
  setBookingShowtime,
  toggleSeat,
  setSelectedSnacks,
  updateSnackQuantity,
  clearSnacks,
  clearSeats,
  clearBookingError,
  clearError,
  selectBookingState,
  selectBooking,
  selectShowtimeId,
  selectSelectedSeats,
  selectSelectedSnacks,
  selectSnackTotal,
  selectSelectedSeatCount,
  selectSelectedSeatsCount,
  selectBookingError,
  selectTotalPrice,
  selectIsSeatSelected,
} from './bookingSlice';
import { store } from '../index';

describe('bookingSlice', () => {
  const initialBookingState = {
    showtimeId: null,
    selectedSeats: [],
    selectedSnacks: [],
    error: null,
  };

  test('should return initial state when passed an undefined state', () => {
    expect(bookingReducer(undefined, { type: 'unknown' })).toEqual(initialBookingState);
  });

  describe('setShowtimeId / setBookingShowtime', () => {
    test('should set showtimeId and reset selectedSeats and error when showtimeId changes', () => {
      const stateWithSeats = {
        showtimeId: 'showtime-1',
        selectedSeats: [{ row: 'A', number: 1, seatType: 'standard', price: 80000 }],
        error: 'Some error',
      };

      const nextState = bookingReducer(stateWithSeats, setShowtimeId('showtime-2'));
      expect(nextState.showtimeId).toBe('showtime-2');
      expect(nextState.selectedSeats).toEqual([]);
      expect(nextState.error).toBeNull();
    });

    test('should retain selectedSeats if the same showtimeId is set', () => {
      const stateWithSeats = {
        showtimeId: 'showtime-1',
        selectedSeats: [{ row: 'A', number: 1, seatType: 'standard', price: 80000 }],
        error: null,
      };

      const nextState = bookingReducer(stateWithSeats, setShowtimeId('showtime-1'));
      expect(nextState.showtimeId).toBe('showtime-1');
      expect(nextState.selectedSeats).toHaveLength(1);
    });

    test('alias setBookingShowtime should work identically', () => {
      const state = bookingReducer(initialBookingState, setBookingShowtime('showtime-abc'));
      expect(state.showtimeId).toBe('showtime-abc');
    });
  });

  describe('toggleSeat', () => {
    test('should add an unselected seat to selectedSeats', () => {
      const seatA1 = { row: 'A', number: 1, seatType: 'standard', price: 80000 };
      const nextState = bookingReducer(initialBookingState, toggleSeat(seatA1));

      expect(nextState.selectedSeats).toHaveLength(1);
      expect(nextState.selectedSeats[0]).toEqual(seatA1);
      expect(nextState.error).toBeNull();
    });

    test('should remove an already selected seat (toggle deselect)', () => {
      const seatA1 = { row: 'A', number: 1, seatType: 'standard', price: 80000 };
      const seatA2 = { row: 'A', number: 2, seatType: 'standard', price: 80000 };
      const stateWithSeats = {
        showtimeId: 'showtime-1',
        selectedSeats: [seatA1, seatA2],
        error: 'An existing warning',
      };

      const nextState = bookingReducer(stateWithSeats, toggleSeat(seatA1));
      expect(nextState.selectedSeats).toHaveLength(1);
      expect(nextState.selectedSeats[0]).toEqual(seatA2);
      expect(nextState.error).toBeNull();
    });

    test('should allow selecting up to 8 seats successfully', () => {
      let state = initialBookingState;
      for (let i = 1; i <= 8; i++) {
        const seat = { row: 'A', number: i, seatType: 'standard', price: 80000 };
        state = bookingReducer(state, toggleSeat(seat));
      }

      expect(state.selectedSeats).toHaveLength(8);
      expect(state.error).toBeNull();
    });

    test('should reject 9th seat selection, keep count at 8, and set error notification', () => {
      let state = initialBookingState;
      for (let i = 1; i <= 8; i++) {
        const seat = { row: 'A', number: i, seatType: 'standard', price: 80000 };
        state = bookingReducer(state, toggleSeat(seat));
      }

      expect(state.selectedSeats).toHaveLength(8);
      expect(state.error).toBeNull();

      // Attempting to select 9th seat
      const seat9 = { row: 'A', number: 9, seatType: 'standard', price: 80000 };
      const rejectedState = bookingReducer(state, toggleSeat(seat9));

      expect(rejectedState.selectedSeats).toHaveLength(8);
      expect(rejectedState.selectedSeats.some((s) => s.number === 9)).toBe(false);
      expect(rejectedState.error).toBe('Bạn chỉ có thể chọn tối đa 8 ghế!');
    });

    test('should allow deselecting a seat when at 8 seats, clearing the error', () => {
      let state = initialBookingState;
      for (let i = 1; i <= 8; i++) {
        state = bookingReducer(state, toggleSeat({ row: 'A', number: i, seatType: 'standard', price: 80000 }));
      }
      // Trigger error with 9th seat
      state = bookingReducer(state, toggleSeat({ row: 'A', number: 9, seatType: 'standard', price: 80000 }));
      expect(state.error).toBe('Bạn chỉ có thể chọn tối đa 8 ghế!');

      // Deselect 1st seat
      state = bookingReducer(state, toggleSeat({ row: 'A', number: 1, seatType: 'standard', price: 80000 }));
      expect(state.selectedSeats).toHaveLength(7);
      expect(state.error).toBeNull();

      // Now 9th seat can be added
      state = bookingReducer(state, toggleSeat({ row: 'A', number: 9, seatType: 'standard', price: 80000 }));
      expect(state.selectedSeats).toHaveLength(8);
      expect(state.error).toBeNull();
    });

    test('should ignore invalid seat payloads gracefully', () => {
      const state = bookingReducer(initialBookingState, toggleSeat(null));
      expect(state).toEqual(initialBookingState);

      const state2 = bookingReducer(initialBookingState, toggleSeat({}));
      expect(state2).toEqual(initialBookingState);
    });
  });

  describe('clearSeats', () => {
    test('should reset selectedSeats to [] and clear error', () => {
      const stateWithSeats = {
        showtimeId: 'showtime-1',
        selectedSeats: [
          { row: 'A', number: 1, seatType: 'standard', price: 80000 },
          { row: 'B', number: 2, seatType: 'vip', price: 120000 },
        ],
        error: 'Some error message',
      };

      const nextState = bookingReducer(stateWithSeats, clearSeats());
      expect(nextState.selectedSeats).toEqual([]);
      expect(nextState.error).toBeNull();
      expect(nextState.showtimeId).toBe('showtime-1');
    });
  });

  describe('clearBookingError / clearError', () => {
    test('should clear error message', () => {
      const stateWithError = {
        showtimeId: 'showtime-1',
        selectedSeats: [],
        error: 'Bạn chỉ có thể chọn tối đa 8 ghế!',
      };

      const nextState = bookingReducer(stateWithError, clearBookingError());
      expect(nextState.error).toBeNull();

      const nextStateAlias = bookingReducer(stateWithError, clearError());
      expect(nextStateAlias.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    const rootState = {
      booking: {
        showtimeId: 'st-999',
        selectedSeats: [
          { row: 'A', number: 1, seatType: 'standard', price: 80000 },
          { row: 'A', number: 2, seatType: 'standard', price: 80000 },
          { row: 'E', number: 5, seatType: 'vip', price: 120000 },
        ],
        error: 'Test error message',
      },
    };

    test('selectBookingState and selectBooking should return booking slice', () => {
      expect(selectBookingState(rootState)).toEqual(rootState.booking);
      expect(selectBooking(rootState)).toEqual(rootState.booking);
    });

    test('selectShowtimeId should return current showtime ID', () => {
      expect(selectShowtimeId(rootState)).toBe('st-999');
      expect(selectShowtimeId({})).toBeNull();
    });

    test('selectSelectedSeats should return selected seats array', () => {
      expect(selectSelectedSeats(rootState)).toEqual(rootState.booking.selectedSeats);
      expect(selectSelectedSeats({})).toEqual([]);
    });

    test('selectSelectedSeatCount and selectSelectedSeatsCount should return seat count', () => {
      expect(selectSelectedSeatCount(rootState)).toBe(3);
      expect(selectSelectedSeatsCount(rootState)).toBe(3);
      expect(selectSelectedSeatCount({})).toBe(0);
    });

    test('selectBookingError should return error string or null', () => {
      expect(selectBookingError(rootState)).toBe('Test error message');
      expect(selectBookingError({})).toBeNull();
    });

    test('selectTotalPrice should calculate sum of seat prices', () => {
      // 80000 + 80000 + 120000 = 280000
      expect(selectTotalPrice(rootState)).toBe(280000);
      expect(selectTotalPrice({})).toBe(0);
    });

    test('selectIsSeatSelected should return true only if seat is in selectedSeats', () => {
      expect(selectIsSeatSelected('A', 1)(rootState)).toBe(true);
      expect(selectIsSeatSelected('E', 5)(rootState)).toBe(true);
      expect(selectIsSeatSelected('B', 1)(rootState)).toBe(false);
      expect(selectIsSeatSelected('A', 1)({})).toBe(false);
    });
  });

  describe('Configured Redux Store Integration', () => {
    test('store should dispatch actions and update state predictably', () => {
      store.dispatch(clearSeats());
      store.dispatch(setShowtimeId('test-st'));
      expect(selectShowtimeId(store.getState())).toBe('test-st');

      store.dispatch(toggleSeat({ row: 'C', number: 3, seatType: 'standard', price: 90000 }));
      expect(selectSelectedSeatCount(store.getState())).toBe(1);
      expect(selectTotalPrice(store.getState())).toBe(90000);

      store.dispatch(clearSeats());
      expect(selectSelectedSeatCount(store.getState())).toBe(0);
      expect(selectTotalPrice(store.getState())).toBe(0);
    });

    test('should manage selectedSnacks in Redux and include snackTotal in selectTotalPrice', () => {
      store.dispatch(clearSeats());
      store.dispatch(setShowtimeId('test-snack-st'));
      store.dispatch(toggleSeat({ row: 'A', number: 1, seatType: 'standard', price: 80000 }));
      store.dispatch(
        setSelectedSnacks([{ snackId: 's1', name: 'Combo Solo', price: 79000, quantity: 2 }])
      );

      expect(selectSelectedSnacks(store.getState())).toHaveLength(1);
      expect(selectSnackTotal(store.getState())).toBe(158000);
      expect(selectTotalPrice(store.getState())).toBe(238000);

      store.dispatch(updateSnackQuantity({ snackId: 's1', name: 'Combo Solo', price: 79000, delta: -1 }));
      expect(selectSnackTotal(store.getState())).toBe(79000);
      expect(selectTotalPrice(store.getState())).toBe(159000);

      store.dispatch(clearSnacks());
      expect(selectSelectedSnacks(store.getState())).toEqual([]);
      expect(selectTotalPrice(store.getState())).toBe(80000);

      store.dispatch(clearSeats());
    });
  });
});
