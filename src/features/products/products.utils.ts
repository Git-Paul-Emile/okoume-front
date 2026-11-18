import type { Availability, Product, Promotion, Variant } from './products.types';

export function isPromotionActive(promotion: Promotion | null, now = new Date()): promotion is Promotion {
  if (!promotion) return false;
  return new Date(promotion.startsAt) <= now && now <= new Date(promotion.endsAt);
}

/** Prix après promotion produit (arrondi au franc). */
export function applyPromotion(price: number, promotion: Promotion | null, now = new Date()) {
  if (!isPromotionActive(promotion, now)) return price;
  const reduced = promotion.type === 'percent' ? price * (1 - promotion.value / 100) : price - promotion.value;
  return Math.max(0, Math.round(reduced));
}

export function availableStock(variant: Variant) {
  return Math.max(0, variant.stock - variant.reserved);
}

export function variantAvailability(variant: Variant): Availability {
  const stock = availableStock(variant);
  if (stock === 0) return 'out_of_stock';
  if (stock <= variant.lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export function productInStock(product: Product) {
  return product.variants.some((v) => availableStock(v) > 0);
}

/** Variante affichée par défaut : la moins chère disponible, sinon la première. */
export function defaultVariant(product: Product) {
  const available = product.variants.filter((v) => availableStock(v) > 0);
  const pool = available.length ? available : product.variants;
  return pool.reduce((min, v) => (v.price < min.price ? v : min), pool[0]);
}

export function productSalePrice(product: Product, now = new Date()) {
  const v = defaultVariant(product);
  return { price: applyPromotion(v.price, product.promotion, now), original: v.price };
}

export function discountLabel(promotion: Promotion | null, original: number) {
  if (!isPromotionActive(promotion)) return null;
  if (promotion.type === 'percent') return `-${promotion.value} %`;
  const pct = Math.round((promotion.value / original) * 100);
  return pct > 0 ? `-${pct} %` : null;
}

export const availabilityLabel: Record<Availability, string> = {
  in_stock: 'En stock',
  low_stock: 'Stock limité',
  out_of_stock: 'Indisponible',
};
