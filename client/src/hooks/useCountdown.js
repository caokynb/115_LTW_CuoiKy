import { useEffect, useRef, useState } from 'react';

export default function useCountdown(totalSeconds, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const endAt = Date.now() + totalSeconds * 1000;
    setSecondsLeft(totalSeconds);

    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(id);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [totalSeconds]);// 24 25 tối ưu bộ nhớ

  return secondsLeft;
}