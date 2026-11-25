import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminMovies from './Movies';
import api from '../../api/axios';
import { ToastProvider } from '../../components/ui';

jest.mock('../../api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
  },
  getErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const sampleMovies = [
  {
    _id: 'm1',
    title: 'Dune: Hành Tinh Cát',
    genres: ['Khoa học viễn tưởng', 'Phiêu lưu'],
    duration: 166,
    releaseDate: '2026-03-01T00:00:00.000Z',
    status: 'now_showing',
    posterUrl: 'https://example.com/dune.jpg',
  },
  {
    _id: 'm2',
    title: 'Kung Fu Panda 4',
    genres: ['Hoạt hình', 'Hài hước'],
    duration: 94,
    releaseDate: '2026-03-08T00:00:00.000Z',
    status: 'coming_soon',
    posterUrl: 'https://example.com/panda.jpg',
  },
];

function renderAdminMovies() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminMovies />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('AdminMovies Page (A06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hiển thị bảng phim và tải phân trang từ server khi chuyển trang', async () => {
    api.get.mockResolvedValue({
      data: {
        data: sampleMovies,
        total: 12,
        page: 1,
        pages: 2,
      },
    });

    renderAdminMovies();

    // chờ tải dữ liệu trang 1
    expect(await screen.findByText('Dune: Hành Tinh Cát')).toBeInTheDocument();
    expect(screen.getByText('Kung Fu Panda 4')).toBeInTheDocument();

    // bấm sang trang 2
    const page2Btn = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Btn);

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/movies',
        expect.objectContaining({
          params: expect.objectContaining({
            page: 2,
            limit: 8,
          }),
        })
      );
    });
  });

  test('tìm kiếm phim có debounce gọi API với từ khóa q', async () => {
    jest.useFakeTimers();
    api.get.mockResolvedValue({
      data: { data: sampleMovies, total: 2, page: 1, pages: 1 },
    });

    renderAdminMovies();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByRole('textbox', { name: /tìm kiếm phim/i });
    fireEvent.change(searchInput, { target: { value: 'Dune' } });

    act(() => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/movies',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Dune',
            page: 1,
          }),
        })
      );
    });

    jest.useRealTimers();
  });

  test('bấm nút Xóa mở Modal xác nhận và gọi API DELETE khi đồng ý', async () => {
    api.get.mockResolvedValue({
      data: { data: sampleMovies, total: 2, page: 1, pages: 1 },
    });
    api.delete.mockResolvedValue({ data: { success: true } });

    renderAdminMovies();

    expect(await screen.findByText('Dune: Hành Tinh Cát')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: 'Xóa' });
    fireEvent.click(deleteButtons[0]);

    // kiểm tra modal xác nhận đã mở
    expect(screen.getByText('Xác nhận xóa phim')).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Xóa phim' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/movies/m1');
    });
  });

  test('bấm nút Sửa và Thêm phim điều hướng đúng đường dẫn', async () => {
    api.get.mockResolvedValue({
      data: { data: sampleMovies, total: 2, page: 1, pages: 1 },
    });

    renderAdminMovies();
    expect(await screen.findByText('Dune: Hành Tinh Cát')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm phim' }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/movies/new');

    const editButtons = screen.getAllByRole('button', { name: 'Sửa' });
    fireEvent.click(editButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/movies/m1/edit');
  });
});
