import type { Id } from '@/api/types';

export interface DeliveryZone {
  id: Id;
  name: string;
  city: string;
  fee: number;
  eta: string;
  days: string;
  available: boolean;
  /** Coût habituel d'une course pour la boutique, proposé à l'assignation du livreur. */
  courierCost?: number;
}

