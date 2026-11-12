import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route bảo vệ dành riêng cho vai trò admin.
 * Chưa đăng nhập -> /login; không phải admin -> /forbidden.
 */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"
          aria-label="Đang kiểm tra quyền truy cập"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  return children || <Outlet />;
}

export default AdminRoute;
