import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api, { getErrorMessage } from '../api/axios';

/**
 * Custom hook gọi API GET với trạng thái data/loading/error và tự hủy request khi unmount.
 */
export function useFetch(url, options = {}) {
  const {
    params = null,
    immediate = true,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(immediate && url));
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const serializedParams = params ? JSON.stringify(params) : '';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(
    async (overrideParams) => {
      if (!url) return null;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const parsedParams = serializedParams ? JSON.parse(serializedParams) : undefined;
        const response = await api.get(url, {
          params: overrideParams || parsedParams,
          signal: controller.signal,
        });

        if (isMountedRef.current && !controller.signal.aborted) {
          setData(response.data);
          setLoading(false);
        }

        return response.data;
      } catch (err) {
        const isCanceled =
          axios.isCancel(err) ||
          err.name === 'CanceledError' ||
          err.name === 'AbortError' ||
          err.code === 'ERR_CANCELED';

        if (!isCanceled && isMountedRef.current) {
          setError(getErrorMessage(err));
          setLoading(false);
        }

        return null;
      }
    },
    [url, serializedParams]
  );

  useEffect(() => {
    if (!immediate || !url) {
      setLoading(false);
      return;
    }

    execute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, url, execute]);

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
  };
}

export default useFetch;
