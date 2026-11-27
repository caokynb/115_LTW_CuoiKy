import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SnackSelector from './SnackSelector';

const sampleSnacks = [
  {
    _id: 's1',
    name: 'Combo Solo',
    description: '1 Bắp + 1 Nước',
    price: 79000,
    category: 'combo',
  },
  {
    _id: 's2',
    name: 'Combo Couple',
    description: '1 Bắp lớn + 2 Nước',
    price: 119000,
    category: 'combo',
  },
];

describe('SnackSelector Component (A16)', () => {
  test('hiển thị danh sách combo bắp nước và gọi onChange khi tăng giảm số lượng', () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <SnackSelector snacks={sampleSnacks} selectedSnacks={[]} onChange={handleChange} />
    );

    expect(screen.getByText('Combo Solo')).toBeInTheDocument();
    expect(screen.getByText('Combo Couple')).toBeInTheDocument();

    // tăng số lượng Combo Solo lên 1
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng Combo Solo' }));
    expect(handleChange).toHaveBeenCalledWith([
      {
        snackId: 's1',
        name: 'Combo Solo',
        price: 79000,
        quantity: 1,
      },
    ]);

    // render lại với số lượng = 1 rồi giảm về 0
    rerender(
      <SnackSelector
        snacks={sampleSnacks}
        selectedSnacks={[{ snackId: 's1', name: 'Combo Solo', price: 79000, quantity: 1 }]}
        onChange={handleChange}
      />
    );
    expect(screen.getByTestId('snack-qty-s1')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Giảm số lượng Combo Solo' }));
    expect(handleChange).toHaveBeenLastCalledWith([]);
  });

  test('hiển thị và kích hoạt đúng các nút điều hướng bước quay lại, bỏ qua và tiếp tục', () => {
    const onBack = jest.fn();
    const onSkip = jest.fn();
    const onContinue = jest.fn();

    render(
      <SnackSelector
        snacks={sampleSnacks}
        selectedSnacks={[]}
        onChange={jest.fn()}
        onBack={onBack}
        onSkip={onSkip}
        onContinue={onContinue}
      />
    );

    fireEvent.click(screen.getByTestId('snack-step-back'));
    fireEvent.click(screen.getByTestId('snack-step-skip'));
    fireEvent.click(screen.getByTestId('snack-step-continue'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
