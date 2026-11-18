import { useQuery } from '@tanstack/react-query';
import { settingsApi } from './settings.api';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: ({ signal }) => settingsApi.get(signal), staleTime: 10 * 60_000 });
}
