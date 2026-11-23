import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { ShopForm } from '@/features/seller/components/ShopForm';
import { accessLabel, sellerBackend } from '@/features/seller/seller.backend';
import { useAccessPlans, useSellerAction, useSellerShop } from '@/features/seller/seller.queries';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

const links = [
  { to: '/vendeur', label: 'Tableau de bord', end: true },
  { to: '/vendeur/produits', label: 'Produits' },
  { to: '/vendeur/commandes', label: 'Commandes' },
  { to: '/vendeur/livraison', label: 'Livraison' },
  { to: '/vendeur/boutique', label: 'Boutique et offre' },
];

/** Ouverture d'une boutique (32.2) : sa fiche et l'offre d'accès choisie. */
function OpenShop() {
  const { user } = useCurrentUser();
  const { data: plans = [] } = useAccessPlans();
  const [planId, setPlanId] = useState<string | null>(null);
  const open = useSellerAction(
    ({ fields, plan }: { fields: Parameters<typeof sellerBackend.openShop>[0]; plan: string }) =>
      sellerBackend.openShop(fields, plan),
  );

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <h1 className="text-2xl">Ouvrir ma boutique</h1>
        <p className="mt-1.5 mb-6 text-ink-soft">
          Vendez vos produits sur Okoumé. Ils sont publiés avec le nom de votre boutique ; vous recevez et gérez vos
          commandes, livrées par Okoumé ou par vous-même, et payées par le client à la livraison.
        </p>
        <ShopForm
          initial={{
            name: '',
            description: '',
            city: 'Libreville',
            district: '',
            phone: user?.phone ?? '',
            acceptedPaymentMethods: ['cash'],
            handoverModes: ['pickup'],
          }}
          submitLabel="Ouvrir ma boutique"
          extra={
            <fieldset>
              <legend className="label">Offre d’accès</legend>
              <ul className="grid gap-2">
                {plans.map((p) => (
                  <li key={p.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-md border p-3 text-sm',
                        planId === p.id ? 'border-forest' : 'border-sage-dark hover:border-forest',
                      )}
                    >
                      <input
                        type="radio"
                        className="mt-1 accent-forest"
                        checked={planId === p.id}
                        onChange={() => setPlanId(p.id)}
                      />
                      <span>
                        <span className="block font-semibold">
                          {p.name} :{' '}
                          {p.kind === 'free' ? 'gratuit' : `${formatPrice(p.price)} pour ${p.periodDays ?? 0} jours`}
                        </span>
                        {p.description && <span className="block text-ink-soft">{p.description}</span>}
                        {p.trialDays > 0 && (
                          <span className="block text-forest">{p.trialDays} jours d’essai à l’ouverture</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          }
          onSubmit={async (fields) => {
            // Le message s'affiche sous le formulaire, comme les erreurs de l'API
            if (!planId) throw new Error('Choisissez une offre d’accès.');
            await open.mutateAsync({ fields, plan: planId });
            toast.success('Boutique ouverte', { description: 'Créez votre première annonce.' });
          }}
        />
      </div>
    </div>
  );
}

/** Espace vendeur : la boutique du compte connecté, ou son ouverture. */
export default function SellerLayout() {
  const shop = useSellerShop();

  if (shop.isLoading) return <PageLoader />;
  if (shop.isError) return <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />;
  if (!shop.data) return <OpenShop />;

  const { access, status, suspensionReason } = shop.data;
  const warning =
    status === 'suspended'
      ? `Boutique suspendue${suspensionReason ? ` : ${suspensionReason}` : ''}. Vos produits ne sont plus visibles.`
      : access.state === 'awaiting_payment'
        ? 'Votre offre attend son paiement : vos produits ne sont pas encore visibles.'
        : access.state === 'grace'
          ? `Votre accès est échu. Vos produits restent visibles jusqu’au ${access.graceEndsAt ? formatDate(access.graceEndsAt) : 'terme du délai de grâce'} : renouvelez votre offre.`
          : access.state === 'expired'
            ? 'Votre accès a expiré : vos produits sont masqués jusqu’au renouvellement.'
            : null;

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl">{shop.data.name}</h1>
        <p className="text-sm text-ink-muted">
          {shop.data.plan.name}, {accessLabel[access.state].toLowerCase()}
          {access.endsAt && access.state !== 'expired' && `, jusqu’au ${formatDate(access.endsAt)}`}
        </p>
      </div>
      {warning && (
        <p className="mb-4 rounded-md bg-[#fbf1dc] p-3 text-sm text-warning" role="status">
          {warning}{' '}
          {status !== 'suspended' && (
            <Link to="/vendeur/boutique" className="font-semibold underline">
              Gérer mon offre
            </Link>
          )}
        </p>
      )}
      <nav aria-label="Espace vendeur" className="mb-6 flex gap-1 overflow-x-auto border-b border-sage">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap',
                isActive ? 'border-forest text-forest' : 'border-transparent text-ink-soft hover:text-ink',
              )
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
