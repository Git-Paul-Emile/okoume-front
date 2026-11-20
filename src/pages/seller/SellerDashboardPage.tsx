import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { ButtonLink } from '@/components/ui/Button';
import { useSellerDashboard } from '@/features/seller/seller.queries';
import { formatPrice } from '@/utils/formatPrice';

function Tile({ label, value, to }: { label: string; value: string | number; to: string }) {
  return (
    <Link to={to} className="card block p-4 hover:border-forest">
      <span className="block text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </Link>
  );
}

/** Tableau de bord du vendeur (32.8) : commandes à traiter, état des produits et ce qu'Okoumé lui doit. */
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Commandes à préparer" value={orders.toPrepare} to="/vendeur/commandes?etat=confirmed" />
        <Tile label="Commandes à livrer" value={orders.toDeliver} to="/vendeur/commandes?etat=ready" />
        <Tile label="Encaissements à déclarer" value={orders.toCollect} to="/vendeur/commandes?etat=delivered" />
        <Tile label="Okoumé vous doit" value={formatPrice(data.payouts.due)} to="/vendeur/reversements" />
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
            Aucun produit pour le moment. Vos produits validés sont publiés sur Okoumé, avec le nom de votre boutique.
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
