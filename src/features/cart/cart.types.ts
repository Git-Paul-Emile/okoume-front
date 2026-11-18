import type { Id } from '@/api/types';

export interface CartLine {
  key: string;
  productId: Id;
  variantId: Id;
  slug: string;
  name: string;
  variantLabel: string;
  image: string;
  categoryId: Id;
  rootCategoryId: Id;
  /** Prix payé (après promotion produit) au moment de l'ajout. */
  unitPrice: number;
  /** Prix catalogue de la variante avant promotion. */
  originalPrice: number;
  hasPromotion: boolean;
  /** Taux de TVA du produit au moment de l'ajout (18 % par défaut). */
  vatRate?: number;
  quantity: number;
}

export interface CartTotals {
  baseSubtotal: number;
  subtotal: number;
  productDiscount: number;
  codeDiscount: number;
  pointsUsed: number;
  pointsDiscount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  total: number;
  pointsEarned: number;
  itemCount: number;
  codeError: string | null;
  pointsError: string | null;
}
