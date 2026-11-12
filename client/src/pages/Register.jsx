import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Toast, useToast } from '../components/ui';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
  validateRegisterForm,
} from '../utils/validators';

export function Register() {
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateSingleField = (name, value, nextValues) => {
    switch (name) {
      case 'fullName':
        return validateFullName(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'password':
        return validatePassword(value, 6);
      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu';
        return value !== nextValues.password ? 'Mật khẩu xác nhận không khớp' : '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    setServerError('');

    if (name === 'email' && value.trim()) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateSingleField(name, value, nextValues),
      }));
    }

    if (name === 'password' && nextValues.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword:
          nextValues.confirmPassword !== value ? 'Mật khẩu xác nhận không khớp' : '',
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldError = validateSingleField(name, value, values);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateRegisterForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/auth/register', {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });

      const payload = response.data?.data;
      login(payload);
      toast.success('Đăng ký tài khoản thành công!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err, 'Đăng ký thất bại. Vui lòng thử lại!');
      setServerError(msg);
      if (err.response?.status === 400 && msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto my-8 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Đăng ký tài khoản</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tạo tài khoản thành viên để đặt vé nhanh chóng
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
          label="Họ và tên"
          name="fullName"
          type="text"
          value={values.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Nguyễn Văn A"
          error={errors.fullName}
          autoComplete="name"
          required
        />

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
          label="Số điện thoại"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="0912345678 (không bắt buộc)"
          error={errors.phone}
          autoComplete="tel"
        />

        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Ít nhất 6 ký tự"
          error={errors.password}
          autoComplete="new-password"
          required
        />

        <FormField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Nhập lại mật khẩu"
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        <Button type="submit" fullWidth loading={submitting} size="lg">
          Đăng ký
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-500"
        >
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}

export default Register;
