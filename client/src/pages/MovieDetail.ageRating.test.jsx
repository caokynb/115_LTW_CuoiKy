import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderMovieDetailPage(ageRating = 'T18') {
  api.get.mockImplementation((url) => {
    if (url === '/movies/m1') {
      return Promise.resolve({
        data: {
          data: {
            _id: 'm1',
            title: 'Phim Test Độ Tuổi',
            description: 'Mô tả phim',
            genres: ['Kinh dị'],
            duration: 115,
            status: 'now_showing',
            ageRating,
            posterUrl: 'https://example.com/poster.jpg',
            trailerYoutubeId: 'dQw4w9WgXcQ',
          },
        },
      });
    }
    return Promise.resolve({
      data: {
        data: [
          {
            _id: 'st1',
            roomId: { name: 'Phòng 1' },
            startTime: '2026-12-01T12:00:00.000Z',
            standardPrice: 80000,
          },
        ],
      },
    });
  });

  return render(
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/movies/m1']}>
          <Routes>
            <Route path="/movies/:id" element={<MovieDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

describe('MovieDetail Age Rating Warning (A17)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('phim T18 mở modal cảnh báo độ tuổi và bắt buộc xác nhận trước khi sang trang chọn ghế', async () => {
    renderMovieDetailPage('T18');

    const chooseBtn = await screen.findByRole('button', { name: 'Chọn ghế' });
    fireEvent.click(chooseBtn);

    // modal cảnh báo hiện ra và chưa chuyển trang ngay
    expect(screen.getByText(/Cảnh báo giới hạn độ tuổi \(T18\)/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận & Chọn ghế/i });
    expect(confirmBtn).toBeDisabled();

    // tích xác nhận đủ tuổi -> cho phép bấm và điều hướng sang /showtimes/st1/seats
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/showtimes/st1/seats');
  });

  test('phim P đi thẳng sang trang chọn ghế không cần modal cảnh báo', async () => {
    renderMovieDetailPage('P');

    const chooseBtn = await screen.findByRole('button', { name: 'Chọn ghế' });
    fireEvent.click(chooseBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/showtimes/st1/seats');
  });
});
