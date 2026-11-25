import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Bookings from './Bookings';
import api from '../../api/axios';
import { ToastProvider } from '../../components/ui';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

jest.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <canvas data-testid="mock-qr-canvas" />,
}));

const sampleBookings = [
  {
    _id: '6650000000000000000001a2',
    userId: {
      fullName: 'Nguyễn Văn A',
      email: 'a@example.com',
      phone: '0901234567',
    },
    showtimeId: {
      _id: 'st1',
      startTime: '2026-12-01T12:00:00.000Z',
      movieId: { title: 'Dune 2' },
      roomId: { name: 'Phòng 1' },
    },
    tickets: [{ row: 'A', number: 1 }, { row: 'A', number: 2 }],
    totalPrice: 180000,
    status: 'confirmed',
    createdAt: '2026-11-20T10:00:00.000Z',
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <Bookings />
    </ToastProvider>
  );
}

describe('Admin Bookings Page (K18)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/showtimes') {
        return Promise.resolve({
          data: {
            data: [
              {
                _id: 'st1',
                startTime: '2026-12-01T12:00:00.000Z',
                movieId: { title: 'Dune 2' },
                roomId: { name: 'Phòng 1' },
              },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          data: sampleBookings,
          total: 1,
          page: 1,
          pages: 1,
        },
      });
    });
  });

  test('hiển thị danh sách vé, SĐT khách hàng và hỗ trợ tìm kiếm debounce', async () => {
    jest.useFakeTimers();
    renderPage();

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
    expect(screen.getByText('A1, A2')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Nhập #mã vé/i);
    fireEvent.change(searchInput, { target: { value: '0901234567' } });

    act(() => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/bookings',
        expect.objectContaining({
          params: expect.objectContaining({
            q: '0901234567',
            page: 1,
          }),
        })
      );
    });

    jest.useRealTimers();
  });

  test('mở modal chi tiết / in vé và thực hiện hủy vé hỗ trợ', async () => {
    api.patch.mockResolvedValue({ data: { success: true } });
    renderPage();

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết / In vé' }));
    expect(screen.getByText(/Chi tiết đơn #0001A2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In vé quầy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    fireEvent.click(screen.getByRole('button', { name: 'Hủy vé' }));
    expect(screen.getByText('Xác nhận hủy vé hỗ trợ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy vé' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/bookings/6650000000000000000001a2/cancel');
    });
  });
});
