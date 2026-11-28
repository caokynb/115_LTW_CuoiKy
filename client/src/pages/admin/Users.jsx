import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, FormField } from '../../components/ui';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/users', { params: { page, limit: 20, search: appliedSearch } });
      setUsers(response.data?.data?.users || []);
      setPages(Math.max(1, response.data?.data?.pages || 1));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không thể tải danh sách người dùng.'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const updateUser = async (user, endpoint, data) => {
    setBusyId(user._id);
    setError('');
    try {
      const response = await api.patch(`/admin/users/${user._id}/${endpoint}`, data);
      const changed = response.data?.data?.user;
      setUsers((current) => current.map((item) => item._id === user._id ? changed : item));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không thể cập nhật tài khoản.'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-neutral-950 dark:text-white">Quản lý người dùng</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Tra cứu tài khoản, điều chỉnh vai trò và trạng thái hoạt động.</p>
      </header>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}>
        <div className="min-w-0 flex-1"><FormField label="Tìm theo tên hoặc email" name="search" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="self-end"><Button type="submit" variant="secondary">Tìm kiếm</Button></div>
      </form>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-cinema-borderSubtle dark:bg-cinema-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-600 dark:bg-cinema-elevated dark:text-neutral-300"><tr><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-cinema-borderSubtle">
            {loading ? <tr><td className="px-4 py-8 text-center" colSpan="4">Đang tải danh sách…</td></tr> : users.length === 0 ? <tr><td className="px-4 py-8 text-center text-neutral-500" colSpan="4">Không tìm thấy người dùng.</td></tr> : users.map((user) => (
              <tr key={user._id}>
                <td className="px-4 py-3"><div className="font-semibold text-neutral-900 dark:text-white">{user.fullName}</div><div className="text-neutral-500 dark:text-neutral-400">{user.email}</div></td>
                <td className="px-4 py-3"><select aria-label={`Vai trò của ${user.email}`} className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 dark:border-cinema-border dark:bg-cinema-elevated" value={user.role} disabled={busyId === user._id} onChange={(event) => updateUser(user, 'role', { role: event.target.value })}><option value="member">Thành viên</option><option value="admin">Quản trị viên</option></select></td>
                <td className="px-4 py-3"><span className={user.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>{user.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span></td>
                <td className="px-4 py-3"><Button size="sm" variant={user.isActive ? 'secondary' : 'primary'} loading={busyId === user._id} onClick={() => updateUser(user, 'status', { isActive: !user.isActive })}>{user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3"><span className="text-sm text-neutral-600 dark:text-neutral-300">Trang {page} / {pages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trước</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Tiếp</Button></div></div>
    </section>
  );
}
