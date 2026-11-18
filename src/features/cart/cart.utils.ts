import type { ShopSettings } from '@/features/settings/settings.types';
import type { CartLine, CartTotals } from './cart.types';

/**
 * TVA incluse dans les prix TTC (5.3, 25.4) : par taux, remises (code, points) réparties au prorata,
 * livraison à son propre taux. Indicatif : la facture fait foi.
 */
export function vatIncluded(
  lines: CartLine[],
  totals: Pick<CartTotals, 'subtotal' | 'codeDiscount' | 'pointsDiscount' | 'deliveryFee' | 'deliveryDiscount'>,
  deliveryVat: number | null,
) {
  const goods = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = totals.codeDiscount + totals.pointsDiscount;
  const byRate = new Map<number, number>();
  for (const l of lines) {
    const ttc = l.unitPrice * l.quantity;
    const net = goods > 0 ? ttc - (discount * ttc) / goods : ttc;
    const rate = l.vatRate ?? 18;
    byRate.set(rate, (byRate.get(rate) ?? 0) + net);
  }
  const delivery = totals.deliveryFee - totals.deliveryDiscount;
  if (deliveryVat !== null && delivery > 0) byRate.set(deliveryVat, (byRate.get(deliveryVat) ?? 0) + delivery);
  const rows = [...byRate.entries()]
    .filter(([, ttc]) => ttc > 0)
    .sort((a, b) => b[0] - a[0])
    .map(([rate, ttc]) => ({ rate, vat: Math.round(ttc - ttc / (1 + rate / 100)) }))
    .filter((r) => r.vat > 0);
  return { rows, total: rows.reduce((s, r) => s + r.vat, 0) };
}

/**
 * Estimation du panier affichée pendant le tout premier devis serveur : prix des articles et livraison,
 * sans code promo ni points (seul le devis de l'API les vérifie et les applique).
 */
export function estimateTotals(
  lines: CartLine[],
  deliveryFee: number | null,
  loyalty: Pick<ShopSettings['loyalty'], 'earnPer'>,
): CartTotals {
  const baseSubtotal = lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const fee = deliveryFee ?? 0;
  return {
    baseSubtotal,
    subtotal,
    productDiscount: baseSubtotal - subtotal,
    codeDiscount: 0,
    pointsUsed: 0,
    pointsDiscount: 0,
    deliveryFee: fee,
    deliveryDiscount: 0,
    total: subtotal + fee,
    pointsEarned: Math.floor(subtotal / loyalty.earnPer),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    codeError: null,
    pointsError: null,
  };
}
