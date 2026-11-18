import { useCallback } from 'react';
import type { Product, Variant } from '@/features/products/products.types';
import { applyPromotion, availableStock, isPromotionActive } from '@/features/products/products.utils';
import { useCartStore } from '@/stores/cartStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

export function useAddToCart() {
  const add = useCartStore((s) => s.add);
  const lines = useCartStore((s) => s.lines);
  const flyToCart = useUiStore((s) => s.flyToCart);

  return useCallback(
    (product: Product, variant: Variant, quantity = 1, source?: Element | null) => {
      const inCart = lines.find((l) => l.productId === product.id && l.variantId === variant.id)?.quantity ?? 0;
      const stock = availableStock(variant);
      if (stock === 0) {
        toast.error('Ce produit est indisponible', {
          description: 'Il reste consultable mais ne peut pas être commandé.',
        });
        return false;
      }
      if (inCart + quantity > stock) {
        toast.error('Quantité maximale atteinte', {
          description: `Il reste ${stock} unité(s) disponible(s) pour cette variante.`,
        });
        return false;
      }
      const image = variant.image ?? product.images[0] ?? product.thumbnail;
      add(
        {
          productId: product.id,
          variantId: variant.id,
          slug: product.slug,
          name: product.name,
          variantLabel: variant.label,
          image: product.thumbnail,
          categoryId: product.categoryId,
          rootCategoryId: product.rootCategoryId,
          unitPrice: applyPromotion(variant.price, product.promotion),
          originalPrice: variant.price,
          hasPromotion: isPromotionActive(product.promotion),
          vatRate: product.tax?.vatRate ?? 18,
        },
        quantity,
      );
      flyToCart(image, source ?? null);
      toast.success('Ajouté au panier', {
        description: `${product.name}, ${variant.label}`,
        icon: false,
        action: { label: 'Voir le panier', href: '/panier' },
      });
      return true;
    },
    [add, lines, flyToCart],
  );
}
