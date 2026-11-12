import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';

function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </section>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={
                  <PlaceholderPage
                    title="Trang chủ CineHub"
                    description="Chào mừng đến với hệ thống đặt vé xem phim trực tuyến."
                  />
                }
              />
              <Route
                path="/movies"
                element={
                  <PlaceholderPage
                    title="Danh sách phim"
                    description="Trang danh sách phim đang chiếu và sắp chiếu."
                  />
                }
              />
              <Route
                path="/movies/:id"
                element={
                  <PlaceholderPage
                    title="Chi tiết phim"
                    description="Thông tin chi tiết phim và lịch chiếu."
                  />
                }
              />
              <Route
                path="/login"
                element={
                  <PlaceholderPage
                    title="Đăng nhập"
                    description="Trang đăng nhập hệ thống."
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <PlaceholderPage
                    title="Đăng ký"
                    description="Trang tạo tài khoản thành viên mới."
                  />
                }
              />
              <Route path="/forbidden" element={<Forbidden />} />

              <Route element={<ProtectedRoute />}>
                <Route
                  path="/showtimes/:id/seats"
                  element={
                    <PlaceholderPage
                      title="Chọn ghế"
                      description="Sơ đồ chọn ghế theo suất chiếu."
                    />
                  }
                />
                <Route
                  path="/bookings/:id"
                  element={
                    <PlaceholderPage
                      title="Chi tiết đặt vé"
                      description="Thông tin xác nhận và mã QR vé."
                    />
                  }
                />
                <Route
                  path="/my-bookings"
                  element={
                    <PlaceholderPage
                      title="Vé của tôi"
                      description="Lịch sử đặt vé của bạn."
                    />
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PlaceholderPage
                      title="Hồ sơ cá nhân"
                      description="Quản lý thông tin tài khoản và mật khẩu."
                    />
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route
                  index
                  element={
                    <PlaceholderPage
                      title="Tổng quan hệ thống"
                      description="Thống kê doanh thu và hoạt động đặt vé."
                    />
                  }
                />
                <Route
                  path="movies"
                  element={
                    <PlaceholderPage
                      title="Quản lý phim"
                      description="Thêm, sửa, xóa danh sách phim."
                    />
                  }
                />
                <Route
                  path="rooms"
                  element={
                    <PlaceholderPage
                      title="Quản lý phòng chiếu"
                      description="Thiết lập sơ đồ ghế và phòng chiếu."
                    />
                  }
                />
                <Route
                  path="showtimes"
                  element={
                    <PlaceholderPage
                      title="Quản lý suất chiếu"
                      description="Sắp xếp lịch chiếu phim theo phòng."
                    />
                  }
                />
                <Route
                  path="bookings"
                  element={
                    <PlaceholderPage
                      title="Quản lý vé đã bán"
                      description="Tra cứu và theo dõi đơn đặt vé."
                    />
                  }
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
