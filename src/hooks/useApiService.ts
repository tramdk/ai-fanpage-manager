import { useMemo } from 'react';
import { ApiService } from '../api';
import { AuthFetch } from '../types';

/**
 * Custom hook to provide a typed API service
 */
export const useApiService = (authFetch: AuthFetch) => {
  const api = useMemo(() => new ApiService(authFetch), [authFetch]);
  return api;
};
