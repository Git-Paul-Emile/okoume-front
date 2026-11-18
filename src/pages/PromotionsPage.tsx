import { motion } from 'motion/react';
import { Copy, Tag } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/products.queries';
import { isPromotionActive } from '@/features/products/products.utils';
import { usePublicPromoCodes } from '@/features/promotions/promotions.queries';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

export default function PromotionsPage() {
  const { data: products, isLoading } = useProducts();
  const { data: ratings } = useRatingStats();
  const { data: codes } = usePublicPromoCodes();
  const onSale = (products ?? []).filter((p) => isPromotionActive(p.promotion));
  const activeCodes = (codes ?? []).filter((c) => new Date(c.endsAt) > new Date() && c.tiers.length === 0);

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Promotions' }]} />
      <h1 className="text-2xl sm:text-3xl">Promotions en cours</h1>
      <p className="mt-1.5 max-w-2xl text-ink-soft">
        Les réductions produit ne se cumulent pas avec un code promo sur un même article. Un seul code par commande.
      </p>

      {activeCodes.length > 0 && (
        <RevealGroup className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCodes.map((c) => (
            <RevealItem key={c.id}>
              <motion.div
                whileHover={{ y: -3 }}
                className="relative flex h-full overflow-hidden rounded-lg border border-mure/30 bg-white"
              >
                <div className="grid w-16 shrink-0 place-items-center text-mure">
                  <Tag className="size-7" />
                </div>
                <div className="flex-1 p-4">
                  <p className="font-bold">{c.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {c.minAmount ? `Dès ${formatPrice(c.minAmount)} d’achats · ` : ''}jusqu’au {formatDate(c.endsAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        ?.writeText(c.code)
                        .then(() =>
                          toast.success(`Code ${c.code} copié`, { description: 'Collez-le dans votre panier.' }),
                        )
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-mure px-3 py-1.5 font-mono text-sm font-bold text-mure hover:bg-mure-50"
                  >
                    {c.code} <Copy className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      <section className="mt-10">
        <SectionHeading title={`Produits en promotion (${onSale.length})`} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
            : onSale.map((p) => <ProductCard key={p.id} product={p} rating={ratings?.get(p.id)} />)}
        </div>
      </section>
    </div>
  );
}
