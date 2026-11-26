import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, getButtonClasses } from '../components/ui';

// hàm tạo class cho từng mục điều hướng sidebar admin theo trạng thái active
const adminNavLinkClass = ({ isActive }) =>
  `flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
    isActive
      ? 'bg-brand-600 text-white shadow-cinema-cta'
      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-cinema-elevated dark:hover:text-white'
  }`;

// danh sách các route quản trị hiển thị trong menu bên trái
const ADMIN_LINKS = [
  {
    to: '/admin',
    label: 'Tổng quan',
    end: true,
    icon: 'M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-18v6h8V3h-8Z',
  },
  {
    to: '/admin/movies',
    label: 'Quản lý phim',
    icon: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4 0v16M16 4v16',
  },
  {
    to: '/admin/rooms',
    label: 'Phòng chiếu',
    icon: 'M4 6h16v12H4V6Zm4 12v2m8-2v2',
  },
  {
    to: '/admin/cinemas',
    label: 'Cụm rạp',
    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 11h.01M15 11h.01M9 15h.01M15 15h.01',
  },
  {
    to: '/admin/showtimes',
    label: 'Suất chiếu',
    icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    to: '/admin/snacks',
    label: 'Bắp nước',
    icon: 'M6 9h12l-1.5 11h-9L6 9Zm3-4a3 3 0 0 1 6 0',
  },
  {
    to: '/admin/bookings',
    label: 'Vé đã bán',
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5Z',
  },
];

// khung bố cục chính cho khu vực quản trị gồm sidebar responsive, thanh header và Outlet
export function AdminLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // đăng xuất tài khoản quản trị và điều hướng về trang đăng nhập
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900 dark:bg-cinema-bg dark:text-neutral-100">
      {/* lớp nền mờ đóng drawer sidebar khi bấm ra ngoài trên mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* thanh điều hướng bên trái (dạng drawer trượt trên mobile, cố định trên desktop) */}
      <aside
        aria-label="Menu quản trị"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-cinema-borderSubtle dark:bg-cinema-card lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-cinema-borderSubtle">
          <Link to="/admin" className="flex items-center gap-2.5 font-extrabold text-neutral-950 dark:text-white">
            <svg className="h-9 w-9 shrink-0" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <path
                fill="#e11d48"
                fillRule="evenodd"
                d="M16 14H48A6 6 0 0 1 54 20V25.5A6.5 6.5 0 0 0 54 38.5V44A6 6 0 0 1 48 50H16A6 6 0 0 1 10 44V38.5A6.5 6.5 0 0 0 10 25.5V20A6 6 0 0 1 16 14ZM24.5 23.2Q22.5 22 22.5 24.3V39.7Q22.5 42 24.5 40.8L37.8 33.1Q39.8 32 37.8 30.9Z"
              />
              <rect x="42.5" y="18.5" width="3.5" height="6" rx="1.75" fill="#f59e0b" />
              <rect x="42.5" y="39.5" width="3.5" height="6" rx="1.75" fill="#f59e0b" />
            </svg>
            <span>CineHub Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-cinema-elevated dark:hover:text-white lg:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Điều hành rạp
          </p>
          {ADMIN_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={adminNavLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-4 dark:border-cinema-borderSubtle">
          <Link
            to="/"
            className={getButtonClasses({ variant: 'secondary', size: 'md', fullWidth: true })}
          >
            Về trang khách
          </Link>
        </div>
      </aside>

      {/* vùng nội dung chính gồm thanh topbar sticky và các trang con quản trị */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="cinema-header-bar sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu quản trị"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:bg-neutral-700 lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-neutral-950 dark:text-white sm:text-lg">
              Bảng điều khiển quản trị
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              {isDark ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <span className="hidden text-sm font-medium text-neutral-700 dark:text-neutral-200 sm:inline">
              {user?.fullName || 'Admin'}
            </span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
