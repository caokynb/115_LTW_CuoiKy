import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Toast, useToast } from '../components/ui';
import { validateEmail, validateLoginForm } from '../utils/validators';

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = location.state?.from;
  const redirectTo = fromLocation
    ? `${fromLocation.pathname || '/'}${fromLocation.search || ''}`
    : '/';

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setServerError('');

    if (name === 'email') {
      setErrors((prev) => ({
        ...prev,
        email: value.trim() ? validateEmail(value) : '',
      }));
    } else if (name === 'password') {
      setErrors((prev) => ({
        ...prev,
        password: value ? '' : prev.password,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (name === 'password') {
      setErrors((prev) => ({
        ...prev,
        password: value ? '' : 'Mật khẩu không được để trống',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateLoginForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/login', {
        email: values.email.trim(),
        password: values.password,
      });

      const payload = response.data?.data;
      login(payload);
      toast.success('Đăng nhập thành công!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Đăng nhập thất bại. Vui lòng thử lại!'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto my-8 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Đăng nhập để đặt vé và quản lý lịch sử xem phim
        </p>
      </div>

      {serverError && (
        <Toast
          type="error"
          message={serverError}
          onClose={() => setServerError('')}
          className="mb-4"
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="nhapemail@example.com"
          error={errors.email}
          autoComplete="email"
          required
        />

        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Nhập mật khẩu"
          error={errors.password}
          autoComplete="current-password"
          required
        />

        <Button type="submit" fullWidth loading={submitting} size="lg">
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-500"
        >
          Đăng ký ngay
        </Link>
      </p>
    </section>
  );
}

export default Login;
