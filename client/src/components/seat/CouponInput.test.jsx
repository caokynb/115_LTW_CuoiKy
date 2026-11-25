import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CouponInput from './CouponInput';
import api from '../../api/axios';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

describe('CouponInput Component (A12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('gọi API validate và trả kết quả khi nhập mã hợp lệ', async () => {
    const onApply = jest.fn();
    api.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          code: 'CINE10',
          description: 'Giảm 10%',
          discountAmount: 20000,
          finalAmount: 180000,
        },
      },
    });

    render(<CouponInput orderAmount={200000} onApply={onApply} onRemove={jest.fn()} />);

    const input = screen.getByLabelText(/mã giảm giá/i);
    fireEvent.change(input, { target: { value: 'cine10' } });
    fireEvent.click(screen.getByTestId('coupon-apply'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/coupons/validate', {
        code: 'CINE10',
        orderAmount: 200000,
      });
    });
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CINE10',
        discountAmount: 20000,
        finalAmount: 180000,
      })
    );
  });

  test('hiển thị lỗi rõ ràng khi mã hết hạn hoặc không hợp lệ', async () => {
    api.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Mã giảm giá đã hết hạn.' } },
    });

    render(<CouponInput orderAmount={100000} onApply={jest.fn()} onRemove={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/mã giảm giá/i), { target: { value: 'HETHAN50' } });
    fireEvent.click(screen.getByTestId('coupon-apply'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mã giảm giá đã hết hạn.');
  });

  test('hiển thị trạng thái đã áp dụng và gọi onRemove khi bấm Bỏ mã', () => {
    const onRemove = jest.fn();
    render(
      <CouponInput
        orderAmount={200000}
        appliedCoupon={{ code: 'CINE10', discountAmount: 20000, description: 'Giảm 10%' }}
        onApply={jest.fn()}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText('Đã áp dụng: CINE10')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('coupon-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
