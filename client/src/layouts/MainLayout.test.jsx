import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { MainLayout } from './MainLayout';

const mockLogout = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../components/cinema/CinemaSelector', () => function MockCinemaSelector() {
  return <div data-testid="cinema-selector-stub">CinemaSelector</div>;
});

function renderMainLayout() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>Trang chủ nội dung</div>} />
            <Route path="/movies" element={<div>Danh sách phim</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('MainLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  });

  test('renders brand, navigation landmarks, and theme toggle for guest', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      logout: mockLogout,
    });

    renderMainLayout();

    expect(screen.getByText('CineHub')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Thanh điều hướng nhanh di động' })
    ).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /chuyển sang giao diện tối/i });
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(
      screen.getByRole('button', { name: /chuyển sang giao diện sáng/i })
    ).toBeInTheDocument();
  });

  test('renders mobile drawer, admin link, and logout action for authenticated admin', () => {
    mockUseAuth.mockReturnValue({
      user: { fullName: 'Quản trị viên', email: 'admin@cinema.local' },
      isAuthenticated: true,
      isAdmin: true,
      logout: mockLogout,
    });

    renderMainLayout();

    expect(screen.getByRole('link', { name: 'Quản trị' })).toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: 'Mở menu điều hướng' });
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).toBeInTheDocument();

    const logoutButtons = screen.getAllByRole('button', { name: 'Đăng xuất' });
    fireEvent.click(logoutButtons[0]);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
