import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  EmptyState,
  FormField,
  Modal,
  MovieCardSkeleton,
  Pagination,
  SeatMapSkeleton,
  Select,
  Skeleton,
  Spinner,
  TableSkeleton,
  ToastProvider,
  useToast,
} from './index';

function ToastTrigger() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success('Thành công mẫu')}>
        Show Success
      </button>
      <button type="button" onClick={() => toast.error('Lỗi mẫu')}>
        Show Error
      </button>
    </div>
  );
}

describe('Shared UI Kit Components', () => {
  describe('Button', () => {
    test('renders all variants and sizes and handles clicks', () => {
      const handleClick = jest.fn();
      const { rerender } = render(
        <Button variant="primary" size="md" onClick={handleClick}>
          Đặt vé
        </Button>
      );

      const btn = screen.getByRole('button', { name: 'Đặt vé' });
      expect(btn).toHaveClass('bg-brand-600');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      ['secondary', 'outline', 'ghost', 'danger', 'vip'].forEach((variant) => {
        rerender(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
      });
    });

    test('disables interaction and renders inline spinner when loading', () => {
      const handleClick = jest.fn();
      render(
        <Button loading onClick={handleClick}>
          Đang gửi
        </Button>
      );

      const btn = screen.getByRole('button', { name: /Đang gửi/i });
      expect(btn).toBeDisabled();
      expect(screen.getByRole('status')).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Select', () => {
    const options = [
      { value: '', label: 'Tất cả' },
      { value: 'action', label: 'Hành động' },
      { value: 'scifi', label: 'Khoa học viễn tưởng' },
    ];

    test('opens rounded listbox on click and selects an option', () => {
      const onChange = jest.fn();
      render(
        <Select
          ariaLabel="Chọn mục"
          value=""
          onChange={onChange}
          options={options}
        />
      );

      const trigger = screen.getByRole('combobox', { name: 'Chọn mục' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toHaveClass('rounded-xl');

      fireEvent.click(screen.getByRole('option', { name: 'Hành động' }));
      expect(onChange).toHaveBeenCalledWith('action');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('supports keyboard ArrowDown/Enter selection and Escape dismissal', () => {
      const onChange = jest.fn();
      render(
        <Select
          ariaLabel="Chọn mục phím"
          value=""
          onChange={onChange}
          options={options}
        />
      );

      const trigger = screen.getByRole('combobox', { name: 'Chọn mục phím' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('action');
    });
  });

  describe('FormField', () => {
    test('links label, input, and error alert cleanly', () => {
      const handleChange = jest.fn();
      render(
        <FormField
          label="Email"
          name="email"
          value=""
          onChange={handleChange}
          error="Email không hợp lệ"
          required
        />
      );

      const input = screen.getByLabelText(/Email/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Email không hợp lệ');

      fireEvent.change(input, { target: { value: 'a@b.com' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Modal', () => {
    test('opens, closes on Escape and close button click', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen title="Xác nhận" onClose={handleClose}>
          <p>Nội dung hộp thoại</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Nội dung hộp thoại')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }));
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    test('keeps keyboard focus in the dialog and restores it after closing', () => {
      const onClose = jest.fn();
      const { rerender } = render(
        <>
          <button type="button">Mở hộp thoại</button>
          <Modal isOpen={false} title="Chọn vé" onClose={onClose}>
            <button type="button">Hủy</button>
            <button type="button">Xác nhận</button>
          </Modal>
        </>
      );

      const opener = screen.getByRole('button', { name: 'Mở hộp thoại' });
      opener.focus();
      rerender(
        <>
          <button type="button">Mở hộp thoại</button>
          <Modal isOpen title="Chọn vé" onClose={onClose}>
            <button type="button">Hủy</button>
            <button type="button">Xác nhận</button>
          </Modal>
        </>
      );

      const closeButton = screen.getByRole('button', { name: 'Đóng hộp thoại' });
      const confirmButton = screen.getByRole('button', { name: 'Xác nhận' });
      expect(closeButton).toHaveFocus();

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(confirmButton).toHaveFocus();

      fireEvent.keyDown(window, { key: 'Tab' });
      expect(closeButton).toHaveFocus();

      rerender(
        <>
          <button type="button">Mở hộp thoại</button>
          <Modal isOpen={false} title="Chọn vé" onClose={onClose}>
            <button type="button">Hủy</button>
            <button type="button">Xác nhận</button>
          </Modal>
        </>
      );
      expect(opener).toHaveFocus();
    });
  });

  describe('Pagination', () => {
    test('highlights active page and triggers onPageChange', () => {
      const onPageChange = jest.fn();
      render(<Pagination page={2} pages={5} onPageChange={onPageChange} />);

      const active = screen.getByRole('button', { name: '2' });
      expect(active).toHaveAttribute('aria-current', 'page');

      fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });
  });

  describe('EmptyState, Toast, Spinner & Skeletons', () => {
    test('renders EmptyState action button and triggers handler', () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="Không có phim"
          description="Thử bộ lọc khác"
          action={{ label: 'Xóa lọc', onClick: onAction }}
        />
      );

      expect(screen.getByText('Không có phim')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Xóa lọc' }));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    test('renders and dismisses Toasts via ToastProvider', () => {
      render(
        <ToastProvider>
          <ToastTrigger />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Show Success' }));
      expect(screen.getByText('Thành công mẫu')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
      expect(screen.queryByText('Thành công mẫu')).not.toBeInTheDocument();
    });

    test('renders Spinner and Skeleton primitives', () => {
      render(
        <div>
          <Spinner label="Đang tải dữ liệu" />
          <Skeleton className="h-4 w-20" />
          <MovieCardSkeleton />
          <SeatMapSkeleton rows={2} cols={4} />
          <TableSkeleton rows={2} columns={5} />
        </div>
      );

      expect(screen.getByLabelText('Đang tải dữ liệu')).toBeInTheDocument();
      expect(screen.getByTestId('movie-card-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('seat-map-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });
  });
});
