import { useQuery } from '@tanstack/react-query';
import { deliveryApi } from './delivery.api';

export function useDeliveryZones() {
  return useQuery({
    queryKey: ['deliveryZones'],
    queryFn: ({ signal }) => deliveryApi.zones(signal),
    staleTime: 10 * 60_000,
  });
}
