import { Link, NavLink, Outlet } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { ShopForm } from '@/features/seller/components/ShopForm';
import { sellerBackend } from '@/features/seller/seller.backend';
import { useSellerAction, useSellerShop } from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';

const links = [
  { to: '/vendeur', label: 'Tableau de bord', end: true },
  { to: '/vendeur/produits', label: 'Produits' },
  { to: '/vendeur/commandes', label: 'Commandes' },
  { to: '/vendeur/paiements', label: 'Paiements' },
  { to: '/vendeur/livraison', label: 'Livraison' },
  { to: '/vendeur/boutique', label: 'Boutique' },
];

function OpenShop() {
  const { user } = useCurrentUser();
  const open = useSellerAction(sellerBackend.openShop);

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-2xl">Ouvrir ma boutique</h1>
        <p className="mt-1.5 mb-6 text-ink-soft">
          Présentez votre boutique, ajoutez vos produits et gérez vos commandes depuis cet espace.
        </p>
        <ShopForm
          initial={{
            name: '',
            description: '',
            city: 'Libreville',
            district: '',
            phone: user?.phone ?? '',
            acceptedPaymentMethods: ['cash'],
          }}
          submitLabel="Ouvrir ma boutique"
          onSubmit={async (fields) => {
            await open.mutateAsync(fields);
            toast.success('Boutique ouverte', { description: 'Créez votre premier produit.' });
          }}
        />
      </div>
    </div>
  );
}

export default function SellerLayout() {
  const shop = useSellerShop();

  if (shop.isLoading) return <PageLoader />;
  if (shop.isError) return <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />;
  if (!shop.data) return <OpenShop />;

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl">Mon espace vendeur</h1>
          <p className="mt-1 text-sm text-ink-soft">Bonjour, {shop.data.name}</p>
        </div>
        {!shop.data.verified && <p className="text-sm text-ink-muted">Boutique en attente de vérification</p>}
      </div>
      {shop.data.status === 'suspended' && (
        <p className="mb-4 rounded-md bg-[#fbf1dc] p-3 text-sm text-warning" role="status">
          Boutique suspendue{shop.data.suspensionReason ? `: ${shop.data.suspensionReason}` : ''}. Vos produits ne sont
          plus visibles.{' '}
          <Link to="/contact" className="font-semibold underline">
            Contacter OKOZA
          </Link>
        </p>
      )}
      <nav aria-label="Espace vendeur" className="mb-6 flex gap-1 overflow-x-auto border-b border-sage">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap',
                isActive ? 'border-forest text-forest' : 'border-transparent text-ink-soft hover:text-ink',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
