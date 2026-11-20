import { useState, useEffect } from 'react';

// hook debounce trì hoãn cập nhật giá trị (mặc định 400ms để chờ người dùng gõ xong)
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // hẹn giờ cập nhật giá trị mới sau khoảng delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // xóa timer cũ nếu người dùng vẫn đang gõ tiếp hoặc component unmount
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
