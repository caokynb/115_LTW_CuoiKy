import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Checkout from './Checkout';
import api from '../api/axios';
import { ToastProvider } from '../components/ui';

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderCheckout(paymentId = 'pay1') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/checkout/${paymentId}`]}>
        <Routes>
          <Route path="/checkout/:paymentId" element={<Checkout />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('Checkout VietQR Page (K16)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hiển thị mã VietQR, đồng hồ đếm ngược 10 phút và xác nhận webhook chuyển sang chi tiết vé', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          payment: {
            _id: 'pay1',
            orderCode: 'CHTEST123',
            amount: 160000,
            status: 'pending',
            qrUrl: 'https://img.vietqr.io/image/MB-0901234567-compact2.png',
            bankInfo: {
              bankId: 'MB',
              accountNo: '0901234567',
              accountName: 'CINEHUB CINEMA',
              transferContent: 'CINEHUB CHTEST123',
            },
          },
          booking: {
            _id: 'bk1',
            showtimeId: {
              movieId: { title: 'Dune 2' },
              roomId: { name: 'Phòng 1' },
            },
          },
          tickets: [{ row: 'A', number: 1 }, { row: 'A', number: 2 }],
          remainingSeconds: 600,
        },
      },
    });
    api.post.mockResolvedValue({
      data: { data: { booking: { _id: 'bk1' } } },
    });

    renderCheckout();

    expect(await screen.findByText(/Đơn hàng CHTEST123/i)).toBeInTheDocument();
    expect(screen.getByTestId('payment-countdown')).toHaveTextContent('10:00');
    expect(screen.getByAltText(/Mã VietQR đơn CHTEST123/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-confirm-webhook'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/payments/webhook', {
        orderCode: 'CHTEST123',
        paymentId: 'pay1',
        status: 'paid',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/bookings/bk1', { replace: true });
    });
  });

  test('hiển thị thông báo hết hạn khi đơn thanh toán đã expired', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          payment: {
            _id: 'pay2',
            orderCode: 'CHEXP999',
            amount: 80000,
            status: 'expired',
            qrUrl: 'https://img.vietqr.io/image/MB-0901234567-compact2.png',
            bankInfo: {},
          },
          booking: { _id: 'bk2', status: 'cancelled' },
          tickets: [],
          remainingSeconds: 0,
        },
      },
    });

    renderCheckout('pay2');

    expect(await screen.findByTestId('payment-expired')).toHaveTextContent(
      /Phiên thanh toán đã hết hạn/i
    );
  });
});
