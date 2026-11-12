import React, { useState, useEffect } from 'react';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { Button, FormField, Spinner, Toast, useToast } from '../components/ui';
import { validateFullName, validatePassword, validatePhone } from '../utils/validators';

export function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { data, loading, error: fetchError } = useFetch('/users/me');

  const profileUser = data?.data?.user || user;

  const [profileValues, setProfileValues] = useState({
    fullName: profileUser?.fullName || '',
    phone: profileUser?.phone || '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileServerError, setProfileServerError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordServerError, setPasswordServerError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profileUser) {
      setProfileValues({
        fullName: profileUser.fullName || '',
        phone: profileUser.phone || '',
      });
    }
  }, [profileUser]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileValues((prev) => ({ ...prev, [name]: value }));
    setProfileServerError('');

    if (name === 'fullName') {
      setProfileErrors((prev) => ({ ...prev, fullName: validateFullName(value) }));
    } else if (name === 'phone') {
      setProfileErrors((prev) => ({ ...prev, phone: validatePhone(value) }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileServerError('');

    const nextErrors = {};
    const nameError = validateFullName(profileValues.fullName);
    if (nameError) nextErrors.fullName = nameError;
    const phoneError = validatePhone(profileValues.phone);
    if (phoneError) nextErrors.phone = phoneError;

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.put('/users/me', {
        fullName: profileValues.fullName.trim(),
        phone: profileValues.phone.trim(),
      });
      const updatedUser = response.data?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      toast.success('Cập nhật thông tin hồ sơ thành công!');
    } catch (err) {
      setProfileServerError(getErrorMessage(err, 'Không thể cập nhật hồ sơ.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const nextValues = { ...passwordValues, [name]: value };
    setPasswordValues(nextValues);
    setPasswordServerError('');

    if (name === 'currentPassword' && passwordErrors.currentPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: value ? '' : 'Vui lòng nhập mật khẩu hiện tại',
      }));
    } else if (name === 'newPassword') {
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: value ? validatePassword(value, 6) : '',
        confirmPassword:
          nextValues.confirmPassword && nextValues.confirmPassword !== value
            ? 'Mật khẩu xác nhận không khớp'
            : '',
      }));
    } else if (name === 'confirmPassword') {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword:
          value !== nextValues.newPassword ? 'Mật khẩu xác nhận không khớp' : '',
      }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordServerError('');

    const nextErrors = {};
    if (!passwordValues.currentPassword) {
      nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }
    const newPassError = validatePassword(passwordValues.newPassword, 6);
    if (newPassError) {
      nextErrors.newPassword = newPassError;
    }
    if (!passwordValues.confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (passwordValues.confirmPassword !== passwordValues.newPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/users/me', {
        currentPassword: passwordValues.currentPassword,
        newPassword: passwordValues.newPassword,
      });

      setPasswordValues({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      toast.success('Đổi mật khẩu thành công!');
    } catch (err) {
      setPasswordServerError(getErrorMessage(err, 'Không thể đổi mật khẩu.'));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading && !profileUser) {
    return <Spinner fullScreen label="Đang tải thông tin hồ sơ..." />;
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Quản lý thông tin tài khoản và bảo mật mật khẩu của bạn
        </p>
      </header>

      {fetchError && <Toast type="error" message={fetchError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Thông tin cá nhân
          </h2>

          {profileServerError && (
            <Toast
              type="error"
              message={profileServerError}
              onClose={() => setProfileServerError('')}
              className="mb-4"
            />
          )}

          <form onSubmit={handleProfileSubmit} noValidate className="space-y-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={profileUser?.email || ''}
              disabled
              helperText="Email đăng nhập không thể thay đổi"
            />

            <FormField
              label="Vai trò"
              name="role"
              type="text"
              value={profileUser?.role === 'admin' ? 'Quản trị viên (Admin)' : 'Thành viên (Member)'}
              disabled
            />

            <FormField
              label="Tên hiển thị"
              name="fullName"
              type="text"
              value={profileValues.fullName}
              onChange={handleProfileChange}
              placeholder="Nhập họ và tên"
              error={profileErrors.fullName}
              required
            />

            <FormField
              label="Số điện thoại"
              name="phone"
              type="tel"
              value={profileValues.phone}
              onChange={handleProfileChange}
              placeholder="0912345678"
              error={profileErrors.phone}
            />

            <Button type="submit" loading={savingProfile}>
              Lưu thay đổi
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Đổi mật khẩu
          </h2>

          {passwordServerError && (
            <Toast
              type="error"
              message={passwordServerError}
              onClose={() => setPasswordServerError('')}
              className="mb-4"
            />
          )}

          <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
            <FormField
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type="password"
              value={passwordValues.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Nhập mật khẩu hiện tại"
              error={passwordErrors.currentPassword}
              autoComplete="current-password"
              required
            />

            <FormField
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              value={passwordValues.newPassword}
              onChange={handlePasswordChange}
              placeholder="Ít nhất 6 ký tự"
              error={passwordErrors.newPassword}
              autoComplete="new-password"
              required
            />

            <FormField
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              value={passwordValues.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Nhập lại mật khẩu mới"
              error={passwordErrors.confirmPassword}
              autoComplete="new-password"
              required
            />

            <Button type="submit" variant="secondary" loading={savingPassword}>
              Cập nhật mật khẩu
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Profile;
