import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Seat, SeatRow, SeatLegend, SeatMap } from './index';

describe('Seat Map Component Suite', () => {
  describe('Seat component', () => {
    test('renders available standard seat with correct number and label', () => {
      const handleClick = jest.fn();
      render(
        <Seat
          row="A"
          number={1}
          type="standard"
          status="available"
          price={80000}
          onClick={handleClick}
        />
      );

      const seatBtn = screen.getByRole('button', { name: /Ghế A1/i });
      expect(seatBtn).toBeInTheDocument();
      expect(seatBtn).toHaveTextContent('1');
      expect(seatBtn).not.toBeDisabled();
      expect(seatBtn).toHaveAttribute('data-seat-type', 'standard');
      expect(seatBtn).toHaveAttribute('data-seat-status', 'available');

      fireEvent.click(seatBtn);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith({
        row: 'A',
        number: 1,
        seatType: 'standard',
        price: 80000,
      });
    });

    test('renders available VIP seat with VIP styling and invokes onClick', () => {
      const handleClick = jest.fn();
      render(
        <Seat
          row="E"
          number={5}
          type="vip"
          status="available"
          price={120000}
          onClick={handleClick}
        />
      );

      const seatBtn = screen.getByRole('button', { name: /Ghế E5/i });
      expect(seatBtn).toBeInTheDocument();
      expect(seatBtn).toHaveAttribute('data-seat-type', 'vip');
      expect(seatBtn.className).toMatch(/amber/);

      fireEvent.click(seatBtn);
      expect(handleClick).toHaveBeenCalledWith({
        row: 'E',
        number: 5,
        seatType: 'vip',
        price: 120000,
      });
    });

    test('renders selected seat with selected styling and invokes onClick when clicked', () => {
      const handleClick = jest.fn();
      render(
        <Seat
          row="B"
          number={3}
          type="standard"
          status="selected"
          price={80000}
          onClick={handleClick}
        />
      );

      const seatBtn = screen.getByRole('button', { name: /Ghế B3/i });
      expect(seatBtn).toHaveAttribute('data-seat-status', 'selected');
      expect(seatBtn.className).toMatch(/bg-brand-600/);

      fireEvent.click(seatBtn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('renders sold seat disabled and clicking triggers no onClick interaction', () => {
      const handleClick = jest.fn();
      render(
        <Seat
          row="C"
          number={4}
          type="standard"
          status="sold"
          price={80000}
          onClick={handleClick}
        />
      );

      const seatBtn = screen.getByRole('button', { name: /Ghế C4/i });
      expect(seatBtn).toBeDisabled();
      expect(seatBtn).toHaveAttribute('data-seat-status', 'sold');

      fireEvent.click(seatBtn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('SeatRow component', () => {
    test('renders row labels on both sides and renders all seats', () => {
      const onSeatClick = jest.fn();
      const seats = [
        { row: 'A', number: 1, type: 'standard', status: 'available', price: 80000 },
        { row: 'A', number: 2, type: 'standard', status: 'sold', price: 80000 },
      ];

      render(<SeatRow rowLabel="A" seats={seats} onSeatClick={onSeatClick} />);

      const rowContainer = screen.getByTestId('seat-row-A');
      expect(rowContainer).toBeInTheDocument();

      const rowLabels = screen.getAllByText('A');
      expect(rowLabels).toHaveLength(2); // Left and right indicators

      expect(screen.getByTestId('seat-A-1')).toBeInTheDocument();
      expect(screen.getByTestId('seat-A-2')).toBeInTheDocument();
    });
  });

  describe('SeatLegend component', () => {
    test('renders legend items with prices when provided', () => {
      render(<SeatLegend standardPrice={80000} vipPrice={120000} />);

      expect(screen.getByTestId('seat-legend')).toBeInTheDocument();
      expect(screen.getByText(/Ghế thường/i)).toBeInTheDocument();
      expect(screen.getByText(/80\.000đ/i)).toBeInTheDocument();
      expect(screen.getByText(/Ghế VIP/i)).toBeInTheDocument();
      expect(screen.getByText(/120\.000đ/i)).toBeInTheDocument();
      expect(screen.getByText(/Đang chọn/i)).toBeInTheDocument();
      expect(screen.getByText(/Đã bán/i)).toBeInTheDocument();
    });
  });

  describe('SeatMap component', () => {
    test('renders screen indicator, rows, seats, and legend', () => {
      render(
        <SeatMap
          rows={3}
          seatsPerRow={4}
          vipRows={[2]}
          soldSeats={[{ row: 'A', number: 1 }]}
          selectedSeats={[{ row: 'B', number: 2 }]}
          standardPrice={70000}
          vipPrice={100000}
        />
      );

      // Screen indicator
      expect(screen.getByTestId('screen-indicator')).toBeInTheDocument();
      expect(screen.getByText(/Màn hình/i)).toBeInTheDocument();

      // Legend
      expect(screen.getByTestId('seat-legend')).toBeInTheDocument();

      // Total rows rendered: 3 rows (A, B, C)
      expect(screen.getByTestId('seat-row-A')).toBeInTheDocument();
      expect(screen.getByTestId('seat-row-B')).toBeInTheDocument();
      expect(screen.getByTestId('seat-row-C')).toBeInTheDocument();

      // Row A seat 1 should be sold
      const seatA1 = screen.getByTestId('seat-A-1');
      expect(seatA1).toBeDisabled();
      expect(seatA1).toHaveAttribute('data-seat-status', 'sold');

      // Row B is VIP row (index 2)
      const seatB1 = screen.getByTestId('seat-B-1');
      expect(seatB1).toHaveAttribute('data-seat-type', 'vip');

      // Row B seat 2 should be selected
      const seatB2 = screen.getByTestId('seat-B-2');
      expect(seatB2).toHaveAttribute('data-seat-status', 'selected');

      // Row C should be standard
      const seatC1 = screen.getByTestId('seat-C-1');
      expect(seatC1).toHaveAttribute('data-seat-type', 'standard');
      expect(seatC1).toHaveAttribute('data-seat-status', 'available');
    });

    test('mobile viewport container has horizontal scroll enabled (overflow-x-auto)', () => {
      render(<SeatMap rows={4} seatsPerRow={8} />);

      const scrollContainer = screen.getByTestId('seat-map-scroll-container');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer.className).toContain('overflow-x-auto');

      const innerWrapper = scrollContainer.querySelector('.min-w-fit');
      expect(innerWrapper).toBeInTheDocument();
    });

    test('selecting an available seat triggers onSeatClick callback', () => {
      const handleSeatClick = jest.fn();
      render(
        <SeatMap
          rows={2}
          seatsPerRow={3}
          standardPrice={80000}
          onSeatClick={handleSeatClick}
        />
      );

      const seatA2 = screen.getByTestId('seat-A-2');
      fireEvent.click(seatA2);

      expect(handleSeatClick).toHaveBeenCalledTimes(1);
      expect(handleSeatClick).toHaveBeenCalledWith({
        row: 'A',
        number: 2,
        seatType: 'standard',
        price: 80000,
      });
    });

    test('clicking a sold seat triggers no state change or interaction', () => {
      const handleSeatClick = jest.fn();
      render(
        <SeatMap
          rows={2}
          seatsPerRow={3}
          soldSeats={[{ row: 'A', number: 2 }]}
          onSeatClick={handleSeatClick}
        />
      );

      const seatA2 = screen.getByTestId('seat-A-2');
      expect(seatA2).toBeDisabled();

      fireEvent.click(seatA2);
      expect(handleSeatClick).not.toHaveBeenCalled();
    });

    test('updates visual state and color when seat is selected in controlled parent', () => {
      function ControlledSeatMap() {
        const [selectedSeats, setSelectedSeats] = useState([]);
        const handleSeatClick = (seat) => {
          setSelectedSeats((prev) => {
            const exists = prev.some(
              (s) => s.row === seat.row && s.number === seat.number
            );
            if (exists) {
              return prev.filter(
                (s) => !(s.row === seat.row && s.number === seat.number)
              );
            }
            return [...prev, seat];
          });
        };

        return (
          <SeatMap
            rows={2}
            seatsPerRow={2}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            standardPrice={80000}
          />
        );
      }

      render(<ControlledSeatMap />);

      const seatA1 = screen.getByTestId('seat-A-1');
      expect(seatA1).toHaveAttribute('data-seat-status', 'available');
      expect(seatA1.className).not.toContain('bg-brand-600');

      // Click to select
      fireEvent.click(seatA1);
      expect(seatA1).toHaveAttribute('data-seat-status', 'selected');
      expect(seatA1.className).toContain('bg-brand-600');

      // Click again to deselect
      fireEvent.click(seatA1);
      expect(seatA1).toHaveAttribute('data-seat-status', 'available');
      expect(seatA1.className).not.toContain('bg-brand-600');
    });

    test('VIP vs standard seat rendering distinguishes styling and price', () => {
      const handleSeatClick = jest.fn();
      render(
        <SeatMap
          rows={['A', 'B']}
          seatsPerRow={2}
          vipRows={['B']}
          standardPrice={80000}
          vipPrice={120000}
          onSeatClick={handleSeatClick}
        />
      );

      const standardSeat = screen.getByTestId('seat-A-1');
      const vipSeat = screen.getByTestId('seat-B-1');

      // Visual differences
      expect(standardSeat).toHaveAttribute('data-seat-type', 'standard');
      expect(vipSeat).toHaveAttribute('data-seat-type', 'vip');
      expect(standardSeat.className).not.toContain('amber');
      expect(vipSeat.className).toContain('amber');

      // Price differences passed to onSeatClick
      fireEvent.click(standardSeat);
      expect(handleSeatClick).toHaveBeenLastCalledWith(
        expect.objectContaining({ seatType: 'standard', price: 80000 })
      );

      fireEvent.click(vipSeat);
      expect(handleSeatClick).toHaveBeenLastCalledWith(
        expect.objectContaining({ seatType: 'vip', price: 120000 })
      );
    });
  });
});
