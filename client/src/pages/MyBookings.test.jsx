import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyBookings } from './MyBookings';
import { ToastProvider } from '../components/ui/Toast';
import api from '../api';

jest.mock('../api');

describe('MyBookings Page Component', () => {
  const futureShowtimeEligible = {
    _id: 'st_eligible',
    startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 giờ nữa (> 2h)
    movieId: {
      _id: 'm1',
      title: 'Dune: Hành Tinh Cát',
      posterUrl: 'https://example.com/dune.jpg',
    },
    roomId: {
      _id: 'r1',
      name: 'Phòng Chiếu 1',
    },
  };

  const futureShowtimeIneligible = {
    _id: 'st_ineligible',
    startTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 giờ nữa (< 2h)
    movieId: {
      _id: 'm2',
      title: 'Oppenheimer',
      posterUrl: 'https://example.com/oppenheimer.jpg',
    },
    roomId: {
      _id: 'r2',
      name: 'Phòng Chiếu 2',
    },
  };

  const futureShowtimeCancelled = {
    _id: 'st_cancelled',
    startTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    movieId: {
      _id: 'm3',
      title: 'Spider-Man: No Way Home',
      posterUrl: 'https://example.com/spiderman.jpg',
    },
    roomId: {
      _id: 'r3',
      name: 'Phòng Chiếu 3',
    },
  };

  const mockBookings = [
    {
      _id: 'b_eligible_123456',
      totalPrice: 150000,
      status: 'confirmed',
      showtimeId: futureShowtimeEligible,
      tickets: [
        { row: 'A', number: 1 },
        { row: 'A', number: 2 },
      ],
    },
    {
      _id: 'b_ineligible_654321',
      totalPrice: 90000,
      status: 'confirmed',
      showtimeId: futureShowtimeIneligible,
      tickets: [{ row: 'B', number: 5 }],
    },
    {
      _id: 'b_cancelled_999999',
      totalPrice: 120000,
      status: 'cancelled',
      showtimeId: futureShowtimeCancelled,
      tickets: [{ row: 'C', number: 3 }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter>
          <MyBookings />
        </MemoryRouter>
      </ToastProvider>
    );

  test('renders empty state when user has no bookings', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [] } });

    renderComponent();

    expect(screen.getByText(/Đang tải lịch sử đặt vé.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Bạn chưa có đơn đặt vé nào/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Khám phá phim đang chiếu/i)).toBeInTheDocument();
  });

  test('renders booking cards and displays cancel button based on 2-hour rule', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockBookings } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
      expect(screen.getByText('Oppenheimer')).toBeInTheDocument();
    });

    // Vé đủ điều kiện (còn 5h) có nút Hủy vé
    const cancelBtn = screen.getByRole('button', {
      name: /Hủy vé xem phim Dune: Hành Tinh Cát/i,
    });
    expect(cancelBtn).toBeInTheDocument();

    // Vé không đủ điều kiện (còn 1h) hiển thị thông báo không thể hủy
    expect(screen.getByText(/Không thể hủy \(< 2h\)/i)).toBeInTheDocument();

    // Vé đã hủy hiển thị nhãn "Đã hủy"
    const cancelledBadges = screen.getAllByText('Đã hủy');
    expect(cancelledBadges.length).toBeGreaterThan(0);
  });

  test('filters bookings by tabs: Tất cả, Đã xác nhận, Đã hủy', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockBookings } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
    });

    // Ban đầu ở tab "Tất cả": hiển thị cả 3 phim
    expect(screen.getByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
    expect(screen.getByText('Oppenheimer')).toBeInTheDocument();

    // Chuyển sang tab "Đã hủy"
    const tabCancelled = screen.getByRole('button', { name: /^Đã hủy/i });
    fireEvent.click(tabCancelled);

    // Chỉ còn hiển thị vé đã hủy
    expect(screen.queryByText('Oppenheimer')).not.toBeInTheDocument();

    // Chuyển sang tab "Đã xác nhận"
    const tabConfirmed = screen.getByRole('button', { name: /^Đã xác nhận/i });
    fireEvent.click(tabConfirmed);

    expect(screen.getByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
    expect(screen.getByText('Oppenheimer')).toBeInTheDocument();
  });

  test('opens modal and successfully cancels booking when confirmed', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: mockBookings } });
    api.patch.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Hủy vé thành công, ghế đã được giải phóng',
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', {
      name: /Hủy vé xem phim Dune: Hành Tinh Cát/i,
    });
    fireEvent.click(cancelBtn);

    // Modal xuất hiện
    expect(screen.getByText(/Xác nhận hủy đặt vé/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Toàn bộ ghế của đơn đặt vé này sẽ được giải phóng ngay lập tức/i)
    ).toBeInTheDocument();

    // Nhấn nút Xác nhận hủy vé trong modal
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận hủy vé/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/bookings/b_eligible_123456/cancel');
    });

    // Thông báo toast thành công xuất hiện
    await waitFor(() => {
      expect(
        screen.getByText(/Hủy vé thành công, ghế đã được giải phóng/i)
      ).toBeInTheDocument();
    });
  });
});
