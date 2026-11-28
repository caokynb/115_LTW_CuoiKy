import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { Button, FormField } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(response.data?.message || 'Nếu email tồn tại, hướng dẫn sẽ được gửi đến hộp thư của bạn.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Chưa thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto my-8 max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card sm:p-8">
      <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">{message}</p>}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>}
        <Button type="submit" fullWidth loading={submitting} size="lg">Gửi hướng dẫn</Button>
      </form>
      <p className="mt-5 text-center text-sm text-neutral-600 dark:text-neutral-300"><Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300">Quay lại đăng nhập</Link></p>
    </section>
  );
}
