import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MovieCard } from './MovieCard';

const movieWithPosters = {
  _id: 'm_tmdb_0',
  title: 'Interstellar',
  genres: ['Khoa học viễn tưởng'],
  duration: 169,
  releaseDate: '2026-11-01T00:00:00.000Z',
  status: 'now_showing',
  ageRating: 'T13',
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster1.jpg',
  posterUrls: [
    'https://image.tmdb.org/t/p/w500/poster2.jpg',
    'https://image.tmdb.org/t/p/w500/poster3.jpg',
  ],
};

describe('MovieCard Poster Rotation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('luân phiên chuyển poster sau mỗi chu kỳ và tạm dừng khi rê chuột', () => {
    const { container } = render(
      <MemoryRouter>
        <MovieCard movie={movieWithPosters} />
      </MemoryRouter>
    );

    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveClass('opacity-100');
    expect(imgs[1]).toHaveClass('opacity-0');

    // qua chu kỳ xoay đầu tiên (~4.5s + stagger tối đa 1.05s)
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(imgs[0]).toHaveClass('opacity-0');
    expect(imgs[1]).toHaveClass('opacity-100');

    // rê chuột vào thẻ -> tạm dừng luân phiên
    fireEvent.mouseEnter(screen.getByText('Interstellar').closest('.group'));
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(imgs[1]).toHaveClass('opacity-100');
  });
});
