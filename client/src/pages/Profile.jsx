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
  const { data: loyaltyData } = useFetch('/loyalty/me');

  const profileUser = data?.data?.user || user;
  const loyalty = loyaltyData?.data;

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
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
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

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
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

      {/* Khối Điểm thưởng & Hạng thành viên (T18) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Điểm thưởng & Hạng thành viên
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tích lũy 5% giá trị mỗi đơn vé và dùng điểm để giảm trừ trực tiếp tiền vé
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              ⭐ Hạng: {loyalty?.tier || 'Bạc (Silver)'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Điểm khả dụng
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {Number(loyalty?.points ?? profileUser?.rewardPoints ?? 0).toLocaleString('vi-VN')}
              </span>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">điểm</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tương đương: {Number(loyalty?.points ?? profileUser?.rewardPoints ?? 0).toLocaleString('vi-VN')} đ
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Tỷ lệ tích điểm
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              5% / đơn vé
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Tự động cộng vào tài khoản sau khi đặt vé thành công
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Hạng kế tiếp
            </span>
            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              {loyalty?.tierInfo?.nextTier || 'Hạng cao nhất (Diamond)'}
            </div>
            {loyalty?.tierInfo?.pointsToNext > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Cần thêm {Number(loyalty.tierInfo.pointsToNext).toLocaleString('vi-VN')} điểm để thăng hạng
              </p>
            ) : (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Bạn đang giữ quyền lợi thành viên cao nhất
              </p>
            )}
          </div>
        </div>

        {/* Lịch sử biến động điểm */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Lịch sử biến động điểm
          </h3>
          {loyalty?.history && loyalty.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-4">Thời gian</th>
                    <th className="py-2.5 pr-4">Loại giao dịch</th>
                    <th className="py-2.5 pr-4">Nội dung</th>
                    <th className="py-2.5 pr-4 text-right">Biến động</th>
                    <th className="py-2.5 text-right">Số dư sau GD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loyalty.history.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            tx.type === 'earn'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {tx.type === 'earn' ? 'Cộng điểm (+)' : 'Trừ điểm (-)'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-800 dark:text-slate-200">{tx.description}</td>
                      <td
                        className={`py-2.5 pr-4 text-right font-mono font-bold ${
                          tx.points > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.points > 0 ? `+${tx.points.toLocaleString('vi-VN')}` : tx.points.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                        {Number(tx.balanceAfter || 0).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
              Chưa có lịch sử biến động điểm. Đặt vé xem phim để bắt đầu tích lũy 5% điểm thưởng!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Profile;
