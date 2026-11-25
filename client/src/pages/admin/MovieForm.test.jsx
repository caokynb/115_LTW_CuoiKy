import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieForm from './MovieForm';
import api from '../../api/axios';
import { ToastProvider } from '../../components/ui';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderMovieForm(initialEntry = '/admin/movies/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/movies/new" element={<MovieForm />} />
          <Route path="/admin/movies/:id/edit" element={<MovieForm />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('MovieForm Page (A07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('báo lỗi khi bỏ trống tiêu đề hoặc các trường bắt buộc', async () => {
    renderMovieForm('/admin/movies/new');

    fireEvent.click(screen.getByRole('button', { name: 'Tạo phim' }));

    expect(await screen.findByText('Tên phim không được để trống')).toBeInTheDocument();
    expect(screen.getByText('Mô tả phim không được để trống')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('dán link YouTube tự tách đúng ID, xem trước poster và useNavigate sau khi lưu', async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { _id: 'new1' } } });

    renderMovieForm('/admin/movies/new');

    fireEvent.change(screen.getByLabelText(/tên phim/i), { target: { value: 'Interstellar' } });
    fireEvent.change(screen.getByLabelText(/mô tả nội dung/i), {
      target: { value: 'Hành trình du hành vũ trụ xuyên hố đen.' },
    });
    fireEvent.change(screen.getByLabelText(/thể loại/i), {
      target: { value: 'Khoa học viễn tưởng, Phiêu lưu' },
    });
    fireEvent.change(screen.getByLabelText(/thời lượng/i), { target: { value: '169' } });
    fireEvent.change(screen.getByLabelText(/ngày khởi chiếu/i), {
      target: { value: '2026-12-01' },
    });
    fireEvent.change(screen.getByLabelText(/url ảnh poster/i), {
      target: { value: 'https://example.com/interstellar.jpg' },
    });
    fireEvent.change(screen.getByLabelText(/link youtube trailer/i), {
      target: { value: 'https://www.youtube.com/watch?v=zSWdZVtXT7E&feature=youtu.be' },
    });

    // kiểm tra hiển thị xem trước poster và YouTube ID đã tách
    expect(screen.getByText(/Đã nhận diện YouTube ID: zSWdZVtXT7E/i)).toBeInTheDocument();
    expect(screen.getByAltText('Interstellar')).toHaveAttribute(
      'src',
      'https://example.com/interstellar.jpg'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tạo phim' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/movies',
        expect.objectContaining({
          title: 'Interstellar',
          genres: ['Khoa học viễn tưởng', 'Phiêu lưu'],
          duration: 169,
          trailerYoutubeId: 'zSWdZVtXT7E',
        })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/movies');
  });

  test('chế độ sửa nạp sẵn dữ liệu cũ và gọi PUT khi lưu', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          _id: 'm1',
          title: 'Phim Cũ',
          description: 'Mô tả cũ',
          genres: ['Hành động'],
          duration: 110,
          releaseDate: '2026-05-10T00:00:00.000Z',
          status: 'coming_soon',
          posterUrl: 'https://example.com/old.jpg',
          trailerYoutubeId: 'dQw4w9WgXcQ',
        },
      },
    });
    api.put.mockResolvedValue({ data: { success: true } });

    renderMovieForm('/admin/movies/m1/edit');

    expect(await screen.findByDisplayValue('Phim Cũ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mô tả cũ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('dQw4w9WgXcQ')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/tên phim/i), { target: { value: 'Phim Đã Sửa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/movies/m1',
        expect.objectContaining({
          title: 'Phim Đã Sửa',
          trailerYoutubeId: 'dQw4w9WgXcQ',
        })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin/movies');
  });
});
