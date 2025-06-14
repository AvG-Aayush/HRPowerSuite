import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Debounced search hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Background worker hook
export function useWebWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    try {
      workerRef.current = new Worker('/worker.js');
    } catch (error) {
      console.warn('Web Worker not available:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const postMessage = useCallback((message: any) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);

  const addEventListener = useCallback((callback: (e: MessageEvent) => void) => {
    if (workerRef.current) {
      workerRef.current.addEventListener('message', callback);
      return () => {
        if (workerRef.current) {
          workerRef.current.removeEventListener('message', callback);
        }
      };
    }
    return () => {};
  }, []);

  return { postMessage, addEventListener, isAvailable: !!workerRef.current };
}

// Optimized query hook with intelligent caching
export function useOptimizedQuery<T>(
  queryKey: string[],
  options: {
    priority?: 'high' | 'normal' | 'low';
    backgroundRefetch?: boolean;
    cacheTime?: number;
  } = {}
) {
  const { priority = 'normal', backgroundRefetch = false, cacheTime } = options;
  
  const queryConfig = useMemo(() => {
    const baseConfig = {
      queryKey,
      staleTime: priority === 'high' ? 30000 : priority === 'normal' ? 60000 : 120000,
      gcTime: cacheTime || (priority === 'high' ? 300000 : 600000),
      refetchOnWindowFocus: priority === 'high',
      refetchInterval: backgroundRefetch && priority === 'high' ? 30000 : backgroundRefetch ? 60000 : false,
    };

    return baseConfig;
  }, [queryKey.join(','), priority, backgroundRefetch, cacheTime]);

  return useQuery(queryConfig);
}

// Prefetch manager for route-based preloading
export function usePrefetchManager() {
  const queryClient = useQueryClient();

  const prefetchRoute = useCallback((route: string, data?: any) => {
    const prefetchMap: Record<string, string[]> = {
      '/dashboard': ['/api/dashboard/metrics', '/api/attendance/today'],
      '/attendance': ['/api/attendance/history', '/api/work-locations'],
      '/messages': ['/api/messages/unread-count', '/api/users/contacts'],
      '/employees': ['/api/users', '/api/attendance/today'],
      '/admin-requests': ['/api/admin/pending-requests'],
    };

    const queries = prefetchMap[route] || [];
    
    queries.forEach(queryKey => {
      queryClient.prefetchQuery({
        queryKey: [queryKey],
        staleTime: 60000,
      });
    });
  }, [queryClient]);

  return { prefetchRoute };
}

