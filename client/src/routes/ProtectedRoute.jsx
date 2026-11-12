import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route bảo vệ yêu cầu người dùng đã đăng nhập.
 * Nếu chưa đăng nhập sẽ điều hướng về /login kèm vị trí trang hiện tại.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"
          aria-label="Đang kiểm tra phiên đăng nhập"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
