import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminCoupons from './Coupons';
import api from '../../api/axios';
import { ToastProvider } from '../../components/ui';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const sampleCoupons = [
  {
    _id: 'c1',
    code: 'CINE10',
    description: 'Giảm 10% tối đa 50k',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 50000,
    minOrderAmount: 0,
    usedCount: 2,
    maxUses: 50,
    expiresAt: '2027-12-31T23:59:59.000Z',
    isActive: true,
  },
];

describe('AdminCoupons Page (A24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { success: true, data: sampleCoupons } });
  });

  const renderPage = () =>
    render(
      <ToastProvider>
        <AdminCoupons />
      </ToastProvider>
    );

  it('hiển thị danh sách voucher và cho phép khóa/mở nhanh trạng thái', async () => {
    api.patch.mockResolvedValue({
      data: { success: true, data: { ...sampleCoupons[0], isActive: false } },
    });

    renderPage();

    expect(await screen.findByText('CINE10')).toBeInTheDocument();
    expect(screen.getByText('Giảm 10%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đang bật' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/coupons/c1/toggle');
    });
    expect(await screen.findByRole('button', { name: 'Đã khóa' })).toBeInTheDocument();
  });

  it('mở modal tạo voucher mới và kiểm tra validation rỗng mã', async () => {
    renderPage();
    await screen.findByText('CINE10');

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm voucher' }));
    expect(screen.getByText('Thêm voucher mới')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tạo voucher' }));
    expect(await screen.findByText('Mã giảm giá không được để trống.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
