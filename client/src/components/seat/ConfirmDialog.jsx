import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function ConfirmDialog({ open, showtimeId, seats, onClose, onReloadSeats }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setConflict(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/bookings', {
        showtimeId,
        seatIds: seats.map((s) => s._id),
      });
      navigate(`/bookings/${data._id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        const lostIds = err.response.data?.conflictSeats || [];
        const labels = seats.filter((s) => lostIds.includes(s._id)).map((s) => s.label);
        setConflict(true);
        setError(
          labels.length
            ? `Ghế ${labels.join(', ')} đã có người đặt trước.`
            : err.response.data?.message || 'Một số ghế đã có người đặt trước.'
        );
        await onReloadSeats();
      } else {
        setError(err.response?.data?.message || 'Đặt vé thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 300 }}>
        <h3>Xác nhận đặt vé</h3>
        <p>Ghế đã chọn: {seats.map((s) => s.label).join(', ')}</p>
        {error && <p role="alert">{error}</p>}

        {conflict ? (
          <button onClick={onClose}>Đóng</button>
        ) : (
          <>
            <button onClick={onClose} disabled={loading}>Hủy</button>
            <button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Đang đặt...' : 'Xác nhận'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}