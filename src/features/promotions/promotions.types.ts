import type { Id } from '@/api/types';
import type { TierId } from '@/features/settings/settings.types';

export interface PromoCode {
  id: Id;
  code: string;
  label: string;
  type: 'percent' | 'fixed';
  value: number;
  minAmount: number;
  productIds: Id[];
  categoryIds: Id[];
  newCustomersOnly: boolean;
  freeDelivery: boolean;
  tiers: TierId[];
  startsAt: string;
  endsAt: string;
  /** null : sans limite d'utilisation */
  maxUses: number | null;
  perCustomer: number;
  uses: number;
  active: boolean;
  /** Code personnel (bienvenue, anniversaire) : utilisable uniquement par ce client. */
  userId?: Id;
}
