import type { Id } from '@/api/types';

export interface LoyaltyMovement {
  id: Id;
  userId: Id;
  points: number;
  /** restore : points rendus quand la commande qui les utilisait est annulée */
  type: 'earn' | 'redeem' | 'restore' | 'adjust' | 'referral' | 'birthday' | 'reversal';
  label: string;
  createdAt: string;
  orderId?: Id;
  /** Membre de l'équipe à l'origine d'une correction manuelle. */
  by?: string;
  /** Parrainage suspect : points crédités seulement après validation (12.5). */
  status?: 'pending' | 'approved' | 'rejected';
  signals?: string[];
  review?: { by: string; at: string; note: string };
}
