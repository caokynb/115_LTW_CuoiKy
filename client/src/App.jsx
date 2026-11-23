import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Movies from './pages/Movies';
import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import BookingDetail from './pages/BookingDetail';
import MyBookings from './pages/MyBookings';
import RoomPage from './pages/admin/Rooms';
import ShowtimePage from './pages/admin/Showtimes';
import AdminMovies from './pages/admin/Movies';
import MovieForm from './pages/admin/MovieForm';
import Cinemas from './pages/admin/Cinemas';

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
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/movies/:id" element={<MovieDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forbidden" element={<Forbidden />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/showtimes/:id/seats" element={<SeatSelection />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/profile" element={<Profile />} />
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
                <Route path="movies" element={<AdminMovies />} />
                <Route path="movies/new" element={<MovieForm />} />
                <Route path="movies/:id/edit" element={<MovieForm />} />
                <Route path="rooms" element={<RoomPage />} />
                <Route path="cinemas" element={<Cinemas />} />
                <Route path="showtimes" element={<ShowtimePage />} />
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
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
