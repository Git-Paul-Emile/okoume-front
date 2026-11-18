import { Heart } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { ProductCard, ProductCardSkeleton } from '@/features/products/components/ProductCard';
import { useProductsByIds } from '@/features/products/products.queries';
import { useRatingStats } from '@/features/reviews/reviews.queries';

export default function AccountFavoritesPage() {
  const { user } = useCurrentUser();
  const ids = user?.favorites ?? [];
  const { data: products, isLoading } = useProductsByIds(ids);
  const { data: ratings } = useRatingStats();
  const list = (products ?? []).filter((p) => ids.includes(p.id));

  return (
    <div>
      <h1 className="mb-5 text-2xl">Mes favoris</h1>
      {!ids.length ? (
        <div className="card">
          <EmptyState
            icon={<Heart className="size-7" />}
            title="Aucun favori"
            description="Touchez le cœur sur un produit pour le retrouver ici, sur tous vos appareils."
            action={<ButtonLink to="/catalogue">Parcourir le catalogue</ButtonLink>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {isLoading
            ? ids.map((id) => <ProductCardSkeleton key={id} />)
            : list.map((p) => <ProductCard key={p.id} product={p} rating={ratings?.get(p.id)} />)}
        </div>
      )}
    </div>
  );
}
