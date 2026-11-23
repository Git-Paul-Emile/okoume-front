import { Link } from 'react-router';
import { BadgeCheck, ClipboardList, Clock3, PackagePlus, Store } from 'lucide-react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ButtonLink } from '@/components/ui/Button';
import { useSellerDashboard } from '@/features/seller/seller.queries';

function Tile({ label, value, to }: { label: string; value: string | number; to: string }) {
  return (
    <Link to={to} className="card block p-4 hover:border-forest">
      <span className="block text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </Link>
  );
}

/** Tableau de bord du vendeur (32.8) : commandes à traiter et état des produits. */
export default function SellerDashboardPage() {
  const { data, isLoading, error, refetch } = useSellerDashboard();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const { products, orders } = data;
  const states = [
    { label: 'En vente', count: products.published, to: '/vendeur/produits' },
    { label: 'En vérification', count: products.inReview, to: '/vendeur/produits?etat=in_review' },
    {
      label: 'Corrections demandées',
      count: products.changesRequested,
      to: '/vendeur/produits?etat=changes_requested',
    },
    {
      label: 'Examen par l’équipe',
      count: products.pendingModeration,
      to: '/vendeur/produits?etat=pending_moderation',
    },
    { label: 'Refusés', count: products.rejected, to: '/vendeur/produits?etat=rejected' },
    { label: 'Retirés de la vente', count: products.archived, to: '/vendeur/produits' },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-forest">Bonjour, {data.shop.name}</p>
          <h2 className="mt-1 text-xl">Gérez votre boutique sur OKOZA</h2>
        </div>
        <div
          className={data.shop.verified
            ? 'flex items-start gap-2 rounded-lg bg-forest-50 p-3 text-sm text-forest'
            : 'flex items-start gap-2 rounded-lg bg-ivory p-3 text-sm text-ink-soft'}
          role="status"
        >
          {data.shop.verified ? <BadgeCheck className="mt-0.5 size-5 shrink-0" /> : <Clock3 className="mt-0.5 size-5 shrink-0" />}
          <span>
            {data.shop.verified
              ? 'Votre boutique est vérifiée par OKOZA.'
              : 'La vérification de votre boutique est en attente de l’équipe OKOZA.'}{' '}
            {!data.shop.verified && (
              <Link to="/vendeur/boutique" className="font-semibold underline underline-offset-2">
                Voir l’état de ma boutique
              </Link>
            )}
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/vendeur/produits/nouveau" className="card flex items-center gap-3 p-4 hover:border-forest">
            <PackagePlus className="size-5 text-forest" />
            <span><strong className="block">Ajouter un produit</strong><span className="text-xs text-ink-soft">Publier un nouvel article</span></span>
          </Link>
          <Link to="/vendeur/commandes" className="card flex items-center gap-3 p-4 hover:border-forest">
            <ClipboardList className="size-5 text-forest" />
            <span><strong className="block">Mes commandes</strong><span className="text-xs text-ink-soft">Traiter les commandes reçues</span></span>
          </Link>
          <Link to="/vendeur/boutique" className="card flex items-center gap-3 p-4 hover:border-forest">
            <Store className="size-5 text-forest" />
            <span><strong className="block">Ma boutique</strong><span className="text-xs text-ink-soft">Modifier ma vitrine et mon offre</span></span>
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Commandes à préparer" value={orders.toPrepare} to="/vendeur/commandes?etat=confirmed" />
        <Tile label="Commandes à livrer" value={orders.toDeliver} to="/vendeur/commandes?etat=ready" />
        <Tile label="Encaissements à déclarer" value={orders.toCollect} to="/vendeur/commandes?etat=delivered" />
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">Mes produits</h2>
          <ButtonLink to="/vendeur/produits/nouveau" size="sm">
            Nouveau produit
          </ButtonLink>
        </div>
        {states.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Aucun produit pour le moment. Vos produits validés sont publiés sur OKOZA, avec le nom de votre boutique.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {states.map((s) => (
              <li key={s.label}>
                <Link to={s.to} className="inline-block rounded-md border border-sage px-3 py-1.5 hover:border-forest">
                  {s.label} : <strong>{s.count}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
