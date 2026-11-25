import React from 'react';
import { render, screen } from '@testing-library/react';
import TicketQR from './TicketQR';

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }) => <canvas data-testid="qr-canvas" data-value={value} />,
}));

describe('TicketQR Component', () => {
  it('returns null when booking has no id', () => {
    const { container } = render(<TicketQR booking={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders QR code and booking details from booking object', () => {
    const booking = {
      _id: '65f1234567890abcdef12345',
      status: 'confirmed',
      totalPrice: 200000,
      showtimeId: {
        startTime: '2026-11-26T12:00:00.000Z',
        movieId: { title: 'Dune: Part Two' },
        roomId: { name: 'Phòng 01' },
      },
      tickets: [
        { row: 'A', number: 1 },
        { row: 'A', number: 2 },
      ],
    };

    render(<TicketQR booking={booking} />);

    expect(screen.getByTestId('ticket-qr')).toBeInTheDocument();
    expect(screen.getByTestId('qr-canvas')).toHaveAttribute(
      'data-value',
      '65f1234567890abcdef12345'
    );
    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('Phòng 01')).toBeInTheDocument();
    expect(screen.getByText('A1, A2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải mã QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /In vé/i })).toBeInTheDocument();
  });
});
