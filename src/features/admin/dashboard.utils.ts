import type { AdminProduct } from './admin.types';

/** Variantes publiées dont le stock disponible atteint le seuil défini. */
export function stockAlerts(products: AdminProduct[]) {
  return products
    .filter((product) => product.status === 'published')
    .flatMap((product) => product.variants
      .map((variant) => ({ product, variant, available: variant.stock - variant.reserved }))
      .filter((row) => row.available <= row.variant.lowStockThreshold))
    .sort((a, b) => a.available - b.available);
}
