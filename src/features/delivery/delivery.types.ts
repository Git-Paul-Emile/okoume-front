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

/** Demande d'un client dont le quartier n'est pas dans la liste (9.1). */
export interface ZoneRequest {
  id: Id;
  neighbourhood: string;
  city: string;
  contact: string;
  status: 'new' | 'added' | 'declined';
  note?: string;
  createdAt: string;
}
