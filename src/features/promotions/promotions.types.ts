import type { Id } from '@/api/types';

export interface PromoCode {
  id: Id;
  code: string;
  label: string;
  type: 'percent' | 'fixed';
  value: number;
  minAmount: number;
  productIds: Id[];
  categoryIds: Id[];
  freeDelivery: boolean;
  endsAt: string;
  /** null : sans limite d'utilisation */
  maxUses: number | null;
  uses: number;
  active: boolean;
}
