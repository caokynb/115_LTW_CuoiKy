import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CinemaSelector from '../components/cinema/CinemaSelector';
import { Button, getButtonClasses } from '../components/ui';

// style link điều hướng trên thanh topbar desktop
const navLinkClass = ({ isActive }) =>
  `inline-flex min-h-[38px] items-center whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
    isActive
      ? 'bg-brand-600 text-white shadow-cinema-cta'
      : 'text-neutral-700 hover:bg-neutral-200/70 hover:text-neutral-950 dark:text-neutral-200 dark:hover:bg-cinema-elevated dark:hover:text-white'
  }`;

// style link trong drawer menu di động
const mobileNavLinkClass = ({ isActive }) =>
  `flex min-h-[44px] items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-brand-600 text-white shadow-cinema-cta'
      : 'text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-cinema-elevated'
  }`;

// style nút tab trong thanh điều hướng dưới cùng trên mobile
const bottomTabClass = ({ isActive }) =>
  `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl px-1 py-1 text-[11px] font-semibold transition-colors ${
    isActive
      ? 'text-brand-600 dark:text-brand-300'
      : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white'
  }`;

// bố cục chính cho trang khách hàng: Header 3 vùng, Outlet, Footer và thanh tab di động
export function MainLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cinemaId, setCinemaId] = useState(() => window.localStorage.getItem('cinemaId') || '');

  // lưu cụm rạp đang chọn vào localStorage và phát sự kiện để các trang phim/suất chiếu tự cập nhật
  const handleCinemaChange = (nextCinemaId) => {
    setCinemaId(nextCinemaId);
    window.localStorage.setItem('cinemaId', nextCinemaId);
    window.dispatchEvent(new CustomEvent('cinema:change', { detail: { cinemaId: nextCinemaId } }));
  };

  // đăng xuất, đóng menu di động và đưa người dùng về trang chủ
  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-cinema-bg dark:text-neutral-100">
      <header className="cinema-header-bar sticky top-0 z-40 border-b">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          {/* Vùng 1: Thương hiệu */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 text-lg font-extrabold tracking-tight text-neutral-950 dark:text-white"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-cinema-cta">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M7 4v16M17 4v16M2 12h20" />
              </svg>
            </span>
            <span>CineHub</span>
          </Link>

          {/* Vùng 2: Khối điều hướng trung tâm */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden items-center gap-1 rounded-2xl border border-neutral-200 bg-neutral-100/80 p-1 dark:border-cinema-borderSubtle dark:bg-cinema-card lg:flex"
          >
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

          {/* Vùng 3: Tiện ích (Rạp + Giao diện) & Tài khoản */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CinemaSelector value={cinemaId} onChange={handleCinemaChange} />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
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

            <span className="hidden h-6 w-px bg-neutral-200 dark:bg-cinema-border lg:block" aria-hidden="true" />

            <div className="hidden items-center gap-2 lg:flex">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="inline-flex min-h-[40px] max-w-[160px] items-center truncate rounded-xl px-3 py-1.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-200/70 dark:text-neutral-100 dark:hover:bg-cinema-elevated"
                    title={user?.email}
                  >
                    {user?.fullName || 'Tài khoản'}
                  </Link>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Đăng xuất
                  </Button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Đăng nhập
                  </NavLink>
                  <Link
                    to="/register"
                    className={getButtonClasses({ variant: 'primary', size: 'sm' })}
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-cinema-border dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:bg-neutral-700 lg:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* menu xổ xuống dành riêng cho màn hình nhỏ hơn desktop */}
        {menuOpen && (
          <nav
            aria-label="Điều hướng di động"
            className="cinema-fade-enter space-y-1.5 border-t border-neutral-200 bg-white px-4 py-3 dark:border-cinema-borderSubtle dark:bg-cinema-card lg:hidden"
          >
            <div className="px-1 py-1.5 sm:hidden">
              <CinemaSelector value={cinemaId} onChange={handleCinemaChange} />
            </div>
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
            <div className="border-t border-neutral-200 pt-2.5 dark:border-cinema-borderSubtle">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {user?.fullName}
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <NavLink to="/login" className={mobileNavLinkClass} onClick={() => setMenuOpen(false)}>
                    Đăng nhập
                  </NavLink>
                  <NavLink
                    to="/register"
                    className={getButtonClasses({ variant: 'primary', fullWidth: true })}
                    onClick={() => setMenuOpen(false)}
                  >
                    Đăng ký
                  </NavLink>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* nội dung trang con, chừa khoảng trống dưới đáy cho thanh tab di động */}
      <main className="w-full flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8 xl:px-10 2xl:px-12">
        <Outlet />
      </main>

      {/* chân trang hiển thị thông tin bản quyền và nhóm thực hiện */}
      <footer className="border-t border-neutral-200 bg-white py-6 pb-28 text-sm text-neutral-700 dark:border-cinema-borderSubtle dark:bg-cinema-card dark:text-neutral-300 lg:pb-6">
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            CineHub &copy; {new Date().getFullYear()} - Hệ thống đặt vé xem phim
          </p>
          <span>Nhóm 115 &bull; Lập trình Web</span>
        </div>
      </footer>

      {/* Thanh điều hướng nhanh di động: nút Trang chủ hình tròn trọng tâm ở giữa, các chức năng xung quanh */}
      <nav
        aria-label="Thanh điều hướng nhanh di động"
        className="cinema-header-bar fixed inset-x-0 bottom-0 z-30 flex items-end justify-around overflow-visible border-t px-2 pb-1.5 pt-1 lg:hidden"
      >
        <NavLink to="/movies" className={bottomTabClass}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 4v16M17 4v16M2 12h20" />
          </svg>
          <span>Phim</span>
        </NavLink>

        <NavLink to="/my-bookings" className={bottomTabClass}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5Z" />
          </svg>
          <span>Vé</span>
        </NavLink>

        <NavLink
          to="/"
          end
          className="flex min-w-[68px] flex-col items-center justify-end whitespace-nowrap pb-0.5 text-[11px] font-semibold transition-colors"
        >
          {({ isActive }) => (
            <>
              <span
                className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-neutral-50 shadow-lg transition-[transform,background-color,box-shadow] duration-150 active:scale-95 dark:border-cinema-bg ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-cinema-cta ring-2 ring-brand-500/40'
                    : 'bg-neutral-900 text-white hover:bg-brand-600 dark:bg-cinema-elevated dark:text-neutral-100 dark:hover:bg-brand-600 dark:hover:text-white'
                }`}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
                </svg>
              </span>
              <span
                className={`mt-0.5 ${
                  isActive ? 'text-brand-600 dark:text-brand-300' : 'text-neutral-600 dark:text-neutral-300'
                }`}
              >
                Trang chủ
              </span>
            </>
          )}
        </NavLink>

        <NavLink to={isAuthenticated ? '/profile' : '/login'} className={bottomTabClass}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20a8 8 0 0 1 16 0" />
          </svg>
          <span>{isAuthenticated ? 'Hồ sơ' : 'Đăng nhập'}</span>
        </NavLink>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl px-1 py-1 text-[11px] font-semibold text-neutral-600 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        ) : (
          <NavLink to="/register" className={bottomTabClass}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 8v6m3-3h-6" />
            </svg>
            <span>Đăng ký</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}

export default MainLayout;
