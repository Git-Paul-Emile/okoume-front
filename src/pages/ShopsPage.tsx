import { BadgeCheck, MapPin, Store } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Pagination } from '@/components/ui/Pagination';
import { usePublicShops } from '@/features/seller/publicShops.queries';

export default function ShopsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const query = usePublicShops(page);

  if (query.isLoading) return <PageLoader />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const pageCount = Math.max(1, Math.ceil(query.data.total / query.data.limit));

  return (
    <div className="container-page space-y-6 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Boutiques' }]} />
      <header>
        <p className="text-sm font-semibold text-forest">Les boutiques partenaires</p>
        <h1 className="mt-1 text-2xl sm:text-3xl">Découvrez les vendeurs OKOUMÉ</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Parcourez les boutiques actuellement ouvertes sur la marketplace et découvrez les produits de nos vendeurs
          partenaires.
        </p>
      </header>

      {query.data.items.length === 0 ? (
        <EmptyState
          icon={<Store className="size-7" />}
          title="Aucune boutique partenaire pour le moment"
          description="Revenez bientôt pour découvrir les premières boutiques OKOUMÉ."
        />
      ) : (
        <>
          <p className="text-sm text-ink-muted">{query.data.total} boutique{query.data.total > 1 ? 's' : ''}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.items.map((shop) => (
              <Link
                key={shop.slug}
                to={`/boutiques/${shop.slug}`}
                className="card group flex min-h-52 flex-col p-5 transition hover:-translate-y-0.5 hover:border-forest hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-forest-50 text-forest">
                    <Store className="size-6" />
                  </span>
                  {shop.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest">
                      <BadgeCheck className="size-4" /> Boutique vérifiée
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold group-hover:text-forest">{shop.name}</h2>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-ink-soft">
                  {shop.description || 'Découvrez les produits de cette boutique partenaire.'}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPin className="size-4" /> {[shop.district, shop.city].filter(Boolean).join(', ')}
                </p>
              </Link>
            ))}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={(next) => setParams(next > 1 ? { page: String(next) } : {})}
          />
        </>
      )}
    </div>
  );
}
