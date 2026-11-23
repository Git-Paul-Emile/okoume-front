import { BadgeCheck, MapPin, Store } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/products.queries';
import { useRatingStats } from '@/features/reviews/reviews.queries';
import { usePublicShop } from '@/features/shops/shops.queries';

/** Boutique d'un vendeur inscrit (cahier des charges 32.1) : sa présentation et ses produits en vente. */
export default function ShopPage() {
  const { slug = '' } = useParams();
  const shop = usePublicShop(slug);
  const { data: products, isLoading } = useProducts();
  const { data: ratings } = useRatingStats();
  const items = (products ?? []).filter((p) => p.seller?.slug === slug);

  if (shop.isSuccess && !shop.data)
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl">Boutique introuvable</h1>
        <p className="mt-2 text-ink-soft">Cette boutique n’existe pas ou n’est plus ouverte.</p>
        <Link to="/catalogue" className="mt-4 inline-block font-semibold text-forest hover:underline">
          Voir le catalogue
        </Link>
      </div>
    );

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: shop.data?.name ?? 'Boutique' }]} />
      <header className="flex flex-wrap items-start gap-4 rounded-lg border border-sage bg-white p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-ivory text-forest">
          <Store className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl sm:text-3xl">
            {shop.data?.name ?? '…'}
            {shop.data?.verified && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
                <BadgeCheck className="size-4" aria-hidden /> Vendeur vérifié
              </span>
            )}
          </h1>
          {shop.data && (
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
              <MapPin className="size-4" aria-hidden />
              {[shop.data.district, shop.data.city].filter(Boolean).join(', ')}
            </p>
          )}
          {shop.data?.description && <p className="mt-3 max-w-3xl text-ink-soft">{shop.data.description}</p>}
          <p className="mt-3 text-sm text-ink-muted">
            Boutique d’un vendeur inscrit sur OKOZA : vous commandez sur OKOZA et payez à la livraison.
          </p>
        </div>
      </header>

      <h2 className="mt-8 text-xl">Produits de la boutique</h2>
      {isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length ? (
        <RevealGroup className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <RevealItem key={p.id}>
              <ProductCard product={p} rating={ratings?.get(p.id)} />
            </RevealItem>
          ))}
        </RevealGroup>
      ) : (
        <p className="mt-4 text-ink-soft">Cette boutique n’a pas encore de produit en vente.</p>
      )}
    </div>
  );
}
