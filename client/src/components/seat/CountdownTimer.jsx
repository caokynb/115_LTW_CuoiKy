import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useCountdown from '../hooks/useCountdown';

const HOLD_SECONDS = 5 * 60;

export default function CountdownTimer({ movieId, clearSeats }) {
  const navigate = useNavigate();

  const secondsLeft = useCountdown(HOLD_SECONDS, () => {
    clearSeats();
    toast.warn('Đã hết thời gian giữ ghế. Vui lòng chọn lại.');
    navigate(`/movies/${movieId}`);
  });

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div>
      Thời gian giữ ghế còn lại: <strong>{`${mm}:${ss}`}</strong>
    </div>
  );
}