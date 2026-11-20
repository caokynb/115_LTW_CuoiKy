import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 400));
    expect(result.current).toBe('initial');
  });

  test('should debounce value change with specified delay (400ms)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'first', delay: 400 },
      }
    );

    expect(result.current).toBe('first');

    // Cập nhật giá trị mới
    rerender({ value: 'second', delay: 400 });

    // Chưa đủ 400ms thì vẫn giữ giá trị cũ
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first');

    // Tiến thêm 200ms (tổng 400ms) thì cập nhật giá trị mới
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('second');
  });

  test('should cancel pending update when unmounted', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 400),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });
    unmount();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('initial');
  });
});
