import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

const mockDispatch = vi.fn();
const mockNavigate = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
const mockPost = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../ui', () => ({
  Modal: ({ isOpen, title, children }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, onClick, disabled, loading, ...rest }) => (
    <button onClick={onClick} disabled={disabled || loading} {...rest}>
      {children}
    </button>
  ),
  useToast: () => mockToast,
}));

vi.mock('../../api/axios', () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    showtimeId: 'st_001',
    movieTitle: 'Dune: Part Two',
    roomName: 'Phòng 01',
    startTime: '2026-11-25T19:30:00.000Z',
    seats: [
      { row: 'A', number: 1, price: 90000 },
      { row: 'A', number: 2, price: 90000 },
    ],
    totalAmount: 180000,
    onConflict: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị đúng danh sách ghế, thông tin phim và tổng tiền', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('Phòng 01')).toBeInTheDocument();
    expect(screen.getByText(/A1, A2 \(2 ghế\)/)).toBeInTheDocument();
    expect(screen.getByText(/180\.000 đ/)).toBeInTheDocument();
  });

  it('click xác nhận gọi API POST /bookings và điều hướng khi thành công', async () => {
    mockPost.mockResolvedValueOnce({
      data: { data: { booking: { _id: 'bk_999' } } },
    });

    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId('confirm-submit'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/bookings', {
        showtimeId: 'st_001',
        seats: [
          { row: 'A', number: 1 },
          { row: 'A', number: 2 },
        ],
      });
      expect(mockNavigate).toHaveBeenCalledWith('/bookings/bk_999');
    });
  });

  it('khi API trả về 409 thì hiển thị cảnh báo, bỏ ghế mất và gọi onConflict', async () => {
    mockPost.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { conflictingSeats: [{ row: 'A', number: 1 }] },
      },
    });

    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByTestId('confirm-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-conflict')).toHaveTextContent(/Ghế A1 đã có người đặt trước/i);
      expect(mockDispatch).toHaveBeenCalled();
      expect(defaultProps.onConflict).toHaveBeenCalledTimes(1);
    });
  });
});