import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook đồng bộ state với localStorage và lắng nghe thay đổi giữa các tab.
 */
export function useLocalStorage(key, initialValue) {
  const readValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      // Hỗ trợ đọc chuỗi thuần nếu giá trị cũ không phải JSON
      const raw = window.localStorage.getItem(key);
      return raw !== null ? raw : initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== 'undefined') {
            if (valueToStore === undefined || valueToStore === null) {
              window.localStorage.removeItem(key);
            } else {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
          }
        } catch (error) {
          console.error(`Lỗi khi lưu localStorage key "${key}":`, error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    setStoredValue(undefined);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Lỗi khi xóa localStorage key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key) {
        setStoredValue(readValue());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
