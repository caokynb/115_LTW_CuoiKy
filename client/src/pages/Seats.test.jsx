import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import bookingReducer from '../store/slices/bookingSlice';
import AuthContext from '../context/AuthContext';
import { ToastProvider } from '../components/ui';
import Seats from './Seats';
import api from '../api/axios';

// Mock the axios API client
jest.mock('../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getErrorMessage: jest.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

const mockShowtimeData = {
  _id: 'showtime-test-123',
  movieId: {
    _id: 'movie-1',
    title: 'Lật Mặt 7: Một Điều Ước',
    duration: 138,
    posterUrl: 'https://example.com/lat-mat-7.jpg',
  },
  roomId: {
    _id: 'room-1',
    name: 'Phòng Chiếu 01',
    rows: 5,
    seatsPerRow: 6,
    vipRows: [3, 4], // Rows C and D are VIP
  },
  startTime: '2026-11-20T10:00:00.000Z',
  endTime: '2026-11-20T12:18:00.000Z',
  standardPrice: 80000,
  vipPrice: 120000,
  rows: 5,
  seatsPerRow: 6,
  vipRows: [3, 4],
  soldSeats: [
    { row: 'A', number: 1 },
  ],
};

function renderSeatsWithProviders({
  showtimeId = 'showtime-test-123',
  initialRoute = `/showtimes/${showtimeId}/seats`,
  preloadedState,
  authValue = {
    user: { id: 'u1', name: 'Test User', role: 'user' },
    token: 'valid-token',
    loading: false,
    isAuthenticated: true,
    isAdmin: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  },
  onCheckout = jest.fn(),
} = {}) {
  const store = configureStore({
    reducer: {
      booking: bookingReducer,
    },
    preloadedState,
  });

  const renderResult = render(
    <Provider store={store}>
      <AuthContext.Provider value={authValue}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route
                path="/showtimes/:id/seats"
                element={<Seats onCheckout={onCheckout} />}
              />
              <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </Provider>
  );

  return {
    ...renderResult,
    store,
    onCheckout,
  };
}

describe('Seats Page Suite (T04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading spinner initially while showtime data is fetching', () => {
    // Return pending promise
    api.get.mockReturnValue(new Promise(() => {}));

    renderSeatsWithProviders();

    expect(screen.getByTestId('seats-loading')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Đang tải sơ đồ ghế\.\.\./i })).toBeInTheDocument();
  });

  test('renders showtime details, seat map, and booking summary after successful fetch', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: mockShowtimeData },
    });

    renderSeatsWithProviders();

    // Wait for showtime data to load
    await waitFor(() => {
      expect(screen.queryByTestId('seats-loading')).not.toBeInTheDocument();
    });

    // Check movie title and room info in header and summary
    expect(screen.getByTestId('seats-page')).toBeInTheDocument();
    expect(screen.getAllByText(/Lật Mặt 7: Một Điều Ước/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Phòng Chiếu 01/i).length).toBeGreaterThan(0);

    // Check SeatMap components
    expect(screen.getByTestId('screen-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('seat-legend')).toBeInTheDocument();

    // Check sold seat A1 is disabled
    const seatA1 = screen.getByTestId('seat-A-1');
    expect(seatA1).toBeDisabled();
    expect(seatA1).toHaveAttribute('data-seat-status', 'sold');

    // Check BookingSummary initial state
    expect(screen.getByTestId('booking-summary')).toBeInTheDocument();
    expect(screen.getByTestId('no-seats-selected')).toBeInTheDocument();
    expect(screen.getByTestId('total-amount')).toHaveTextContent(/0\s*₫/);

    // Checkout button is disabled initially
    const checkoutBtn = screen.getByTestId('btn-checkout');
    expect(checkoutBtn).toBeDisabled();
  });

  test('calculates dynamic total using useMemo when seats are selected (2 regular + 1 VIP)', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: mockShowtimeData },
    });

    renderSeatsWithProviders();

    await waitFor(() => {
      expect(screen.queryByTestId('seats-loading')).not.toBeInTheDocument();
    });

    // Select 2 regular seats: A2 and B1 (80,000 VND each)
    const seatA2 = screen.getByTestId('seat-A-2');
    const seatB1 = screen.getByTestId('seat-B-1');
    fireEvent.click(seatA2);
    fireEvent.click(seatB1);

    // Select 1 VIP seat: C1 (Row C is VIP row 3, 120,000 VND)
    const seatC1 = screen.getByTestId('seat-C-1');
    expect(seatC1).toHaveAttribute('data-seat-type', 'vip');
    fireEvent.click(seatC1);

    // Check badge chips in BookingSummary
    expect(screen.getByTestId('selected-chip-A-2')).toHaveTextContent(/A2\s*\(Thường\)/i);
    expect(screen.getByTestId('selected-chip-B-1')).toHaveTextContent(/B1\s*\(Thường\)/i);
    expect(screen.getByTestId('selected-chip-C-1')).toHaveTextContent(/C1\s*\(VIP\)/i);

    // Regular subtotal: 2 * 80,000 = 160,000 VND
    expect(screen.getByTestId('regular-subtotal')).toHaveTextContent(/160\.000/);

    // VIP subtotal: 1 * 120,000 = 120,000 VND
    expect(screen.getByTestId('vip-subtotal')).toHaveTextContent(/120\.000/);

    // Total amount: 160,000 + 120,000 = 280,000 VND
    expect(screen.getByTestId('total-amount')).toHaveTextContent(/280\.000/);

    // Checkout button is now enabled
    const checkoutBtn = screen.getByTestId('btn-checkout');
    expect(checkoutBtn).not.toBeDisabled();
    expect(checkoutBtn).toHaveTextContent(/Tiếp tục đặt vé \(3 ghế\)/i);
  });

  test('updates total amount immediately when a seat is deselected', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: mockShowtimeData },
    });

    renderSeatsWithProviders();

    await waitFor(() => {
      expect(screen.queryByTestId('seats-loading')).not.toBeInTheDocument();
    });

    // Select 2 regular seats (A2, B1) and 1 VIP (C1) => 280,000 VND
    const seatA2 = screen.getByTestId('seat-A-2');
    const seatB1 = screen.getByTestId('seat-B-1');
    const seatC1 = screen.getByTestId('seat-C-1');
    fireEvent.click(seatA2);
    fireEvent.click(seatB1);
    fireEvent.click(seatC1);

    expect(screen.getByTestId('total-amount')).toHaveTextContent(/280\.000/);

    // Deselect regular seat A2
    fireEvent.click(seatA2);

    // Now 1 regular (80,000) + 1 VIP (120,000) = 200,000 VND
    expect(screen.queryByTestId('selected-chip-A-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('selected-chip-B-1')).toBeInTheDocument();
    expect(screen.getByTestId('selected-chip-C-1')).toBeInTheDocument();

    expect(screen.getByTestId('regular-subtotal')).toHaveTextContent(/80\.000/);
    expect(screen.getByTestId('vip-subtotal')).toHaveTextContent(/120\.000/);
    expect(screen.getByTestId('total-amount')).toHaveTextContent(/200\.000/);
  });

  test('displays error toast notification when attempting to select a 9th seat', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: mockShowtimeData },
    });

    renderSeatsWithProviders();

    await waitFor(() => {
      expect(screen.queryByTestId('seats-loading')).not.toBeInTheDocument();
    });

    // Select 8 seats: A2, A3, A4, A5, A6, B1, B2, B3
    const seatKeys = [
      ['A', 2], ['A', 3], ['A', 4], ['A', 5], ['A', 6],
      ['B', 1], ['B', 2], ['B', 3],
    ];

    seatKeys.forEach(([row, num]) => {
      const seat = screen.getByTestId(`seat-${row}-${num}`);
      fireEvent.click(seat);
    });

    // Check 8 seats selected
    expect(screen.getByText(/Ghế đã chọn \(8\/8\)/i)).toBeInTheDocument();

    // Attempting to select 9th seat: B4
    const seatB4 = screen.getByTestId('seat-B-4');
    fireEvent.click(seatB4);

    // Toast notification appears with max 8 limit message
    await waitFor(() => {
      expect(screen.getByText(/Bạn chỉ có thể chọn tối đa 8 ghế!/i)).toBeInTheDocument();
    });

    // 9th seat should NOT be selected
    expect(seatB4).toHaveAttribute('data-seat-status', 'available');
    expect(screen.getByText(/Ghế đã chọn \(8\/8\)/i)).toBeInTheDocument();
  });

  test('handles auth loading state properly on F5 refresh', () => {
    api.get.mockReturnValue(new Promise(() => {}));

    renderSeatsWithProviders({
      authValue: {
        user: null,
        token: 'existing-token',
        loading: true,
        isAuthenticated: false,
        isAdmin: false,
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
      },
    });

    expect(screen.getByTestId('seats-loading')).toBeInTheDocument();
  });

  test('handles 404 or network errors cleanly with EmptyState and navigation buttons', async () => {
    api.get.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: 'Không tìm thấy suất chiếu.' },
      },
    });

    renderSeatsWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId('seats-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Không tìm thấy suất chiếu/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-back')).toBeInTheDocument();
    expect(screen.getByTestId('btn-home')).toBeInTheDocument();

    // Clicking home button navigates to home
    fireEvent.click(screen.getByTestId('btn-home'));
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  test('clicking checkout button invokes onCheckout with showtimeId, selectedSeats, and totalAmount', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: mockShowtimeData },
    });

    const mockOnCheckout = jest.fn();
    renderSeatsWithProviders({ onCheckout: mockOnCheckout });

    await waitFor(() => {
      expect(screen.queryByTestId('seats-loading')).not.toBeInTheDocument();
    });

    // Select 1 seat A2
    fireEvent.click(screen.getByTestId('seat-A-2'));

    const checkoutBtn = screen.getByTestId('btn-checkout');
    fireEvent.click(checkoutBtn);

    expect(mockOnCheckout).toHaveBeenCalledTimes(1);
    expect(mockOnCheckout).toHaveBeenCalledWith({
      showtimeId: 'showtime-test-123',
      selectedSeats: [
        expect.objectContaining({ row: 'A', number: 2, price: 80000 }),
      ],
      totalAmount: 80000,
    });
  });
});
