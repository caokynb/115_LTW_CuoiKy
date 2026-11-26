import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AdminLayout } from './AdminLayout';

const mockLogout = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Admin CineHub' },
    logout: mockLogout,
  }),
}));

function renderAdminLayout() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>Admin Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AdminLayout', () => {
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

  test('renders admin links, SVG theme toggle without raw emoji, and logout', () => {
    renderAdminLayout();

    expect(screen.getByText('CineHub Admin')).toBeInTheDocument();
    expect(screen.getByText('Bảng điều khiển quản trị')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý phim' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vé đã bán' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về trang khách' })).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /chuyển sang giao diện tối/i });
    expect(toggleBtn.textContent).not.toMatch(/[☀️🌙]/);
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu quản trị' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }));

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
