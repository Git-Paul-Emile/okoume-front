import { create } from 'zustand';
import { recordEvent } from '@/features/analytics/analytics.api';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/features/cart/cart.types';
import { expired } from '@/features/privacy/retention';

/** Panier conservé localement : aucune réservation de stock n'est faite à l'ajout. */
interface CartState {
  lines: CartLine[];
  promoCode: string | null;
  /** Dernière modification, pour la durée de conservation des paniers abandonnés (30 jours). */
  updatedAt: number | null;
  add: (line: Omit<CartLine, 'key' | 'quantity'>, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** Met à jour le prix d'une ligne après acceptation par le client du nouveau prix. */
  acceptPrice: (key: string, unitPrice: number, originalPrice: number, hasPromotion: boolean) => void;
  setPromoCode: (code: string | null) => void;
  clear: () => void;
}

export const lineKey = (productId: string, variantId: string) => `${productId}:${variantId}`;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      promoCode: null,
      updatedAt: null,
      add: (line, quantity = 1) => {
        recordEvent({ kind: 'add_to_cart', productId: line.productId });
        set((s) => {
          const key = lineKey(line.productId, line.variantId);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              updatedAt: Date.now(),
              lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l)),
            };
          }
          return { updatedAt: Date.now(), lines: [...s.lines, { ...line, key, quantity }] };
        });
      },
      setQuantity: (key, quantity) =>
        set((s) => ({
          updatedAt: Date.now(),
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.key !== key)
              : s.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        })),
      remove: (key) => set((s) => ({ updatedAt: Date.now(), lines: s.lines.filter((l) => l.key !== key) })),
      acceptPrice: (key, unitPrice, originalPrice, hasPromotion) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, unitPrice, originalPrice, hasPromotion } : l)),
        })),
      setPromoCode: (promoCode) => set({ promoCode }),
      clear: () => set({ lines: [], promoCode: null, updatedAt: null }),
    }),
    {
      name: 'shop-cart',
      version: 1,
      // Panier abandonné : vidé au retour du visiteur s'il n'a pas été modifié depuis 30 jours
      onRehydrateStorage: () => (state) => {
        if (state?.lines.length && expired('abandonedCarts', state.updatedAt ?? 0, Date.now())) state.clear();
      },
    },
  ),
);

export const selectItemCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
