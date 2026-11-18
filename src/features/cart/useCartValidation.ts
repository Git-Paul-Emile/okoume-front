import { useMemo } from 'react';
import { useProductsByIds } from '@/features/products/products.queries';
import { applyPromotion, availableStock, isPromotionActive } from '@/features/products/products.utils';
import { useCartStore } from '@/stores/cartStore';
import type { CartLine } from './cart.types';

export interface LineIssue {
  line: CartLine;
  kind: 'price_changed' | 'unavailable' | 'insufficient_stock';
  newUnitPrice?: number;
  newOriginalPrice?: number;
  hasPromotion?: boolean;
  available?: number;
}

/** Compare le panier local avec le catalogue actuel : prix modifiés, ruptures, stock insuffisant. */
export function useCartValidation() {
  const lines = useCartStore((s) => s.lines);
  const ids = useMemo(() => [...new Set(lines.map((l) => l.productId))], [lines]);
  const { data: products, isFetching, refetch } = useProductsByIds(ids);

  const issues = useMemo<LineIssue[]>(() => {
    if (!products) return [];
    const result: LineIssue[] = [];
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      const variant = product?.variants.find((v) => v.id === line.variantId);
      if (!product || !variant || product.status !== 'published' || availableStock(variant) === 0) {
        result.push({ line, kind: 'unavailable' });
        continue;
      }
      const unit = applyPromotion(variant.price, product.promotion);
      if (unit !== line.unitPrice) {
        result.push({
          line,
          kind: 'price_changed',
          newUnitPrice: unit,
          newOriginalPrice: variant.price,
          hasPromotion: isPromotionActive(product.promotion),
        });
      }
      if (availableStock(variant) < line.quantity)
        result.push({ line, kind: 'insufficient_stock', available: availableStock(variant) });
    }
    return result;
  }, [lines, products]);

  return { issues, blocking: issues.length > 0, checking: isFetching, products, recheck: refetch };
}
