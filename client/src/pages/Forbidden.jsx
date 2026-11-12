import React from 'react';
import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-amber-500">403</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        Không có quyền truy cập
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Tài khoản của bạn không có quyền truy cập vào khu vực quản trị.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Quay về trang chủ
      </Link>
    </section>
  );
}

export default Forbidden;
