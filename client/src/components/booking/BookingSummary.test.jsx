import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingSummary, { formatVND, formatDateTime } from './BookingSummary';

describe('BookingSummary Component Suite', () => {
  const mockMovie = {
    _id: 'movie-1',
    title: 'Avatar: The Way of Water',
    duration: 192,
    posterUrl: 'https://example.com/avatar.jpg',
  };

  test('formats VND currency accurately', () => {
    expect(formatVND(0)).toMatch(/0\s*₫/);
    expect(formatVND(80000)).toMatch(/80\.000\s*₫/);
    expect(formatVND(280000)).toMatch(/280\.000\s*₫/);
  });

  test('formats date and time accurately', () => {
    const formatted = formatDateTime('2026-11-20T10:00:00.000Z');
    expect(formatted).toContain('20/11/2026');
    expect(formatDateTime(null)).toBe('');
  });

  test('renders movie info, room name, formatted time, and poster', () => {
    render(
      <BookingSummary
        movie={mockMovie}
        roomName="Phòng 02 - IMAX"
        startTime="2026-11-20T10:00:00.000Z"
        selectedSeats={[]}
        standardPrice={80000}
        vipPrice={120000}
      />
    );

    expect(screen.getByTestId('booking-summary')).toBeInTheDocument();
    expect(screen.getByTestId('booking-movie-title')).toHaveTextContent('Avatar: The Way of Water');
    expect(screen.getByText(/Thời lượng: 192 phút/i)).toBeInTheDocument();
    expect(screen.getByTestId('booking-room')).toHaveTextContent('Phòng 02 - IMAX');
    expect(screen.getByTestId('booking-datetime')).toHaveTextContent('20/11/2026');

    const poster = screen.getByTestId('booking-movie-poster');
    expect(poster).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  test('renders poster placeholder when movie has no posterUrl', () => {
    render(
      <BookingSummary
        movie={{ title: 'Untitled Movie' }}
        roomName="Phòng 1"
        selectedSeats={[]}
      />
    );

    expect(screen.getByTestId('booking-movie-poster-placeholder')).toBeInTheDocument();
  });

  test('renders selected seats as badges/chips with regular vs VIP indicator', () => {
    const selectedSeats = [
      { row: 'B', number: 2, seatType: 'standard', price: 80000 },
      { row: 'A', number: 1, seatType: 'standard', price: 80000 },
      { row: 'E', number: 5, seatType: 'vip', price: 120000 },
    ];

    render(
      <BookingSummary
        movie={mockMovie}
        roomName="Phòng 1"
        selectedSeats={selectedSeats}
        standardPrice={80000}
        vipPrice={120000}
      />
    );

    // Selected seats are sorted (A1, B2, E5)
    expect(screen.getByTestId('selected-chip-A-1')).toHaveTextContent('A1 (Thường)');
    expect(screen.getByTestId('selected-chip-B-2')).toHaveTextContent('B2 (Thường)');
    expect(screen.getByTestId('selected-chip-E-5')).toHaveTextContent('E5 (VIP)');

    // Ticket count indicators
    expect(screen.getByText(/Ghế đã chọn \(3\/8\)/i)).toBeInTheDocument();

    // Subtotals
    expect(screen.getByTestId('regular-subtotal')).toHaveTextContent(/160\.000/);
    expect(screen.getByTestId('vip-subtotal')).toHaveTextContent(/120\.000/);

    // Total
    expect(screen.getByTestId('total-amount')).toHaveTextContent(/280\.000/);
  });

  test('checkout button is disabled when selectedSeats is empty', () => {
    const handleCheckout = jest.fn();
    render(
      <BookingSummary
        movie={mockMovie}
        roomName="Phòng 1"
        selectedSeats={[]}
        onCheckout={handleCheckout}
      />
    );

    const btn = screen.getByTestId('btn-checkout');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/Vui lòng chọn ghế/i);

    fireEvent.click(btn);
    expect(handleCheckout).not.toHaveBeenCalled();
  });

  test('checkout button is enabled when seats are selected and clicking triggers onCheckout', () => {
    const handleCheckout = jest.fn();
    const selectedSeats = [{ row: 'A', number: 1, seatType: 'standard', price: 80000 }];

    render(
      <BookingSummary
        movie={mockMovie}
        roomName="Phòng 1"
        selectedSeats={selectedSeats}
        standardPrice={80000}
        vipPrice={120000}
        onCheckout={handleCheckout}
      />
    );

    const btn = screen.getByTestId('btn-checkout');
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent(/Tiếp tục đặt vé \(1 ghế\)/i);

    fireEvent.click(btn);
    expect(handleCheckout).toHaveBeenCalledTimes(1);
  });
});
