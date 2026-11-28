import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { Button, FormField } from '../components/ui';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.');
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { notice: 'Mật khẩu đã được cập nhật. Hãy đăng nhập lại.' } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Liên kết không hợp lệ hoặc đã hết hạn.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto my-8 max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card sm:p-8">
      <h1 className="text-2xl font-bold text-neutral-950 dark:text-white">Đặt mật khẩu mới</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="Mật khẩu mới" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        <FormField label="Nhập lại mật khẩu" name="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>}
        <Button type="submit" fullWidth loading={submitting} size="lg">Cập nhật mật khẩu</Button>
      </form>
      <p className="mt-5 text-center text-sm"><Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300">Quay lại đăng nhập</Link></p>
    </section>
  );
}
