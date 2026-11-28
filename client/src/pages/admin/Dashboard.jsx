import React, { useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../../api/axios';
import { Button, Spinner } from '../../components/ui';
import RevenueChart from '../../components/admin/RevenueChart';
import StatCard from '../../components/admin/StatCard';
import OccupancyTable from '../../components/admin/OccupancyTable';

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

export function Dashboard() {
  const today = new Date();
  const [fromDate, setFromDate] = useState(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate, setToDate] = useState(toDateInput(today));
  const [appliedRange, setAppliedRange] = useState({ fromDate, toDate });
  const [movieData, setMovieData] = useState([]);
  const [dayData, setDayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = appliedRange;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [movieResponse, dayResponse] = await Promise.all([
          api.get('/stats/revenue-by-movie', { params, signal: controller.signal }),
          api.get('/stats/revenue-by-day', { params, signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) {
          setMovieData(Array.isArray(movieResponse.data?.data) ? movieResponse.data.data : []);
          setDayData(Array.isArray(dayResponse.data?.data) ? dayResponse.data.data : []);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError, 'Không tải được số liệu thống kê.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, [appliedRange, retryKey]);

  const summary = useMemo(() => {
    const revenue = movieData.reduce((sum, item) => sum + (Number(item.totalRevenue) || 0), 0);
    const ticketCount = movieData.reduce((sum, item) => sum + (Number(item.ticketCount) || 0), 0);
    const bestMovie = movieData.reduce((best, item) => (
      !best || Number(item.ticketCount) > Number(best.ticketCount) ? item : best
    ), null);
    return { revenue, ticketCount, bestMovie };
  }, [movieData]);

  const applyRange = (event) => {
    event.preventDefault();
    if (!fromDate || !toDate || fromDate > toDate) {
      setError('Vui lòng chọn khoảng ngày hợp lệ.');
      return;
    }
    setAppliedRange({ fromDate, toDate });
  };

  const formatDay = (value) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T12:00:00+07:00`));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Doanh thu và tình hình đặt vé theo khoảng ngày.</p>
      </header>

      <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
        <label className="grid gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Từ ngày
          <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-white" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          Đến ngày
          <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-cinema-border dark:bg-cinema-elevated dark:text-white" />
        </label>
        <Button type="submit" disabled={loading}>Lọc dữ liệu</Button>
      </form>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>Thử lại</Button>
        </div>
      )}

      {loading && movieData.length === 0 && dayData.length === 0 ? (
        <div className="flex justify-center rounded-2xl border border-neutral-200 bg-white p-10 dark:border-cinema-borderSubtle dark:bg-cinema-card">
          <Spinner label="Đang tải thống kê..." />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tóm tắt thống kê">
            <StatCard title="Tổng doanh thu" value={formatCurrency(summary.revenue)} note="Từ các đơn đặt vé đã xác nhận" />
            <StatCard title="Số vé đã bán" value={new Intl.NumberFormat('vi-VN').format(summary.ticketCount)} note="Vé đang có hiệu lực trong khoảng ngày" />
            <StatCard title="Phim bán chạy nhất" value={summary.bestMovie?.title || 'Chưa có dữ liệu'} note={summary.bestMovie ? `${new Intl.NumberFormat('vi-VN').format(summary.bestMovie.ticketCount)} vé đã bán` : ''} />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <RevenueChart title="Doanh thu theo phim" data={movieData} labelKey="title" />
            <RevenueChart
              title="Doanh thu theo ngày"
              data={dayData.map((item) => ({ ...item, label: formatDay(item.date) }))}
              labelKey="label"
              type="area"
            />
          </div>

          <OccupancyTable />
        </>
      )}
    </div>
  );
}

export default Dashboard;
