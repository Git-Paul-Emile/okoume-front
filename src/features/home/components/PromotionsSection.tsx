import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/products.queries';
import { isPromotionActive, productInStock } from '@/features/products/products.utils';
import { useRatingStats } from '@/features/reviews/reviews.queries';

/** Produits en promotion en ce moment (promotions actives à la date du jour). */
export function PromotionsSection() {
  const { data: products } = useProducts();
  const { data: ratings } = useRatingStats();
  const items = (products ?? [])
    .filter((p) => isPromotionActive(p.promotion))
    .sort((a, b) => Number(productInStock(b)) - Number(productInStock(a)))
    .slice(0, 6);
  if (!items.length) return null;

  return (
    <section>
      <SectionHeading title="Promotions" link={{ to: '/promotions', label: 'Voir toutes les promotions' }} />
      <RevealGroup gap={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {items.map((p) => (
          <RevealItem key={p.id}>
            <ProductCard product={p} rating={ratings?.get(p.id)} compact />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
