import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MovieDetail } from './MovieDetail';
import api from '../api/axios';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ui';

jest.mock('../components/movie/MovieReviews', () => () => <div data-testid="movie-reviews-stub" />);

jest.mock('../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

function renderMovieDetail(id = 'm1') {
  return render(
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/movies/${id}`]}>
          <Routes>
            <Route path="/movies/:id" element={<MovieDetail />} />
            <Route path="/movies" element={<div>Movies List</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

describe('MovieDetail UI States (A11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hiển thị skeleton khi đang tải dữ liệu phim', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderMovieDetail('m1');
    expect(screen.getByTestId('movie-detail-skeleton')).toBeInTheDocument();
  });

  test('hiển thị EmptyState khi API trả về 404 không tìm thấy phim', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });

    renderMovieDetail('unknown-id');
    expect(await screen.findByText('Không tìm thấy phim!')).toBeInTheDocument();
  });

  test('hiển thị thông báo lỗi và nút Thử lại khi mất kết nối', async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: 'Lỗi máy chủ' } } });

    renderMovieDetail('m1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi máy chủ');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  test('ảnh poster có loading="lazy" và hiển thị EmptyState khi chưa có suất chiếu', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/movies/m1') {
        return Promise.resolve({
          data: {
            data: {
              _id: 'm1',
              title: 'Interstellar',
              description: 'Du hành vũ trụ',
              genres: ['Khoa học viễn tưởng'],
              duration: 169,
              status: 'now_showing',
              posterUrl: 'https://example.com/poster.jpg',
              trailerYoutubeId: 'zSWdZVtXT7E',
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderMovieDetail('m1');

    const poster = await screen.findByAltText('Interstellar');
    expect(poster).toHaveAttribute('loading', 'lazy');
    expect(await screen.findByText('Chưa có suất chiếu cho phim này')).toBeInTheDocument();
  });
});
