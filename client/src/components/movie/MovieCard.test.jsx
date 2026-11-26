import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MovieCard } from './MovieCard';

describe('MovieCard', () => {
  const sampleMovie = {
    _id: 'm1',
    title: 'Inception',
    description: 'Một chuyên gia xâm nhập giấc mơ nhận nhiệm vụ cấy một ý tưởng.',
    genres: ['Hành động', 'Khoa học viễn tưởng'],
    duration: 148,
    releaseDate: '2026-11-14T00:00:00.000Z',
    status: 'now_showing',
    ageRating: 'T13',
  };

  test('renders movie title, synopsis hover overlay, badges, and booking link', () => {
    render(
      <MemoryRouter>
        <MovieCard movie={sampleMovie} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText('Tóm tắt phim')).toBeInTheDocument();
    expect(screen.getByText(sampleMovie.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đặt vé ngay' })).toHaveAttribute('href', '/movies/m1');
  });
});
