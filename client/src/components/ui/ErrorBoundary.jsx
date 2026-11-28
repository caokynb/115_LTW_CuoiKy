import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Lỗi khi hiển thị trang:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-xl px-4 py-16 text-center" role="alert">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trang gặp sự cố</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Không thể hiển thị nội dung này. Hãy tải lại trang hoặc quay về trang chủ.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white">
              Tải lại
            </button>
            <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 dark:border-slate-600 dark:text-white">
              Trang chủ
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
