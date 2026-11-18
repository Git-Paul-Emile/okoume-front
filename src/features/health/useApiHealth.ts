import { useQuery } from '@tanstack/react-query';
import { healthApi } from './health.api';

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => healthApi.ping(signal),
    refetchInterval: (q) => (q.state.status === 'error' ? 8_000 : 60_000),
    retry: false,
    staleTime: 0,
  });
}
