import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroCarousel } from './HeroCarousel';

const sampleMovies = [
  {
    _id: 'm1',
    title: 'Phim Nổi Bật 1',
    description: 'Mô tả phim 1',
    genres: ['Hành động'],
    duration: 120,
    status: 'now_showing',
    posterUrl: 'https://example.com/1.jpg',
  },
  {
    _id: 'm2',
    title: 'Phim Nổi Bật 2',
    description: 'Mô tả phim 2',
    genres: ['Phiêu lưu'],
    duration: 135,
    status: 'now_showing',
    posterUrl: 'https://example.com/2.jpg',
  },
  {
    _id: 'm3',
    title: 'Phim Nổi Bật 3',
    description: 'Mô tả phim 3',
    genres: ['Kịch tính'],
    duration: 110,
    status: 'coming_soon',
    posterUrl: 'https://example.com/3.jpg',
  },
];

describe('HeroCarousel Component (A09)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('tự động chuyển slide mỗi 5 giây và dọn dẹp interval khi unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <MemoryRouter>
        <HeroCarousel movies={sampleMovies} autoPlayInterval={5000} />
      </MemoryRouter>
    );

    const dot1 = screen.getByRole('button', { name: 'Chuyển tới slide 1' });
    const dot2 = screen.getByRole('button', { name: 'Chuyển tới slide 2' });
    expect(dot1).toHaveAttribute('aria-current', 'true');

    // sau 5 giây phải chuyển sang slide 2
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(dot2).toHaveAttribute('aria-current', 'true');

    // khi unmount phải gọi clearInterval để không còn timer chạy ngầm
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('tạm dừng tự chuyển khi rê chuột vào banner và chạy tiếp khi rời chuột', () => {
    render(
      <MemoryRouter>
        <HeroCarousel movies={sampleMovies} autoPlayInterval={5000} />
      </MemoryRouter>
    );

    const section = screen.getByRole('region', { name: 'Phim nổi bật' });
    const dot1 = screen.getByRole('button', { name: 'Chuyển tới slide 1' });
    const dot2 = screen.getByRole('button', { name: 'Chuyển tới slide 2' });

    // rê chuột vào -> tạm dừng
    fireEvent.mouseEnter(section);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(dot1).toHaveAttribute('aria-current', 'true');

    // rời chuột ra -> tiếp tục chạy timer 5s
    fireEvent.mouseLeave(section);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(dot2).toHaveAttribute('aria-current', 'true');
  });

  test('bấm nút mũi tên trái phải chuyển slide đúng', () => {
    render(
      <MemoryRouter>
        <HeroCarousel movies={sampleMovies} autoPlayInterval={5000} />
      </MemoryRouter>
    );

    const nextBtn = screen.getByRole('button', { name: 'Slide tiếp theo' });
    const prevBtn = screen.getByRole('button', { name: 'Slide trước' });
    const dot2 = screen.getByRole('button', { name: 'Chuyển tới slide 2' });
    const dot1 = screen.getByRole('button', { name: 'Chuyển tới slide 1' });

    fireEvent.click(nextBtn);
    expect(dot2).toHaveAttribute('aria-current', 'true');

    fireEvent.click(prevBtn);
    expect(dot1).toHaveAttribute('aria-current', 'true');
  });
});
