import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-600 text-white shadow-sm'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
  }`;

const mobileNavLinkClass = ({ isActive }) =>
  `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-600 text-white'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
  }`;

export function MainLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-brand-600 dark:text-brand-500"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              CH
            </span>
            <span>CineHub</span>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Trang chủ
            </NavLink>
            <NavLink to="/movies" className={navLinkClass}>
              Phim
            </NavLink>
            <NavLink to="/my-bookings" className={navLinkClass}>
              Vé của tôi
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/profile" className={navLinkClass}>
                Hồ sơ
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                Quản trị
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isDark ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div className="hidden items-center gap-2 md:flex">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="max-w-[160px] truncate rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    title={user?.email}
                  >
                    {user?.fullName || 'Tài khoản'}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Đăng nhập
                  </NavLink>
                  <Link
                    to="/register"
                    className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label="Mở menu điều hướng"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            aria-label="Điều hướng di động"
            className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden"
          >
            <NavLink to="/" end className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
              Trang chủ
            </NavLink>
            <NavLink to="/movies" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
              Phim
            </NavLink>
            <NavLink to="/my-bookings" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
              Vé của tôi
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/profile" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
                Hồ sơ
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
                Quản trị
              </NavLink>
            )}
            <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user?.fullName}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <NavLink to="/login" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
                    Đăng nhập
                  </NavLink>
                  <NavLink to="/register" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
                    Đăng ký
                  </NavLink>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            CineHub &copy; {new Date().getFullYear()} - Hệ thống đặt vé xem phim
          </p>
          <p>Nhóm 115 &bull; Lập trình Web</p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
