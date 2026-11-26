import React from 'react';
import { Link } from 'react-router-dom';
import { getButtonClasses } from '../components/ui';

export function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-brand-600 dark:text-brand-300">404</p>
      <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi.
      </p>
      <Link to="/" className={getButtonClasses({ variant: 'primary', className: 'mt-6' })}>
        Quay về trang chủ
      </Link>
    </section>
  );
}

export default NotFound;
