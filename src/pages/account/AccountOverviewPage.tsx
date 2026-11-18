import { Heart, Package, Coins } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { orderStatusLabel } from '@/features/orders/orders.constants';
import { useMyOrders } from '@/features/orders/orders.queries';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

export default function AccountOverviewPage() {
  const { user } = useCurrentUser();
  const { data: orders } = useMyOrders();
  if (!user) return null;
  const active = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)) ?? [];

  const tiles = [
    {
      to: '/compte/commandes',
      icon: Package,
      label: 'Commandes',
      value: String(orders?.length ?? '…'),
      sub: `${active.length} en cours`,
    },
    {
      to: '/compte/fidelite',
      icon: Coins,
      label: 'Points fidélité',
      value: String(user.loyaltyPoints),
      sub: `Niveau ${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}`,
    },
    {
      to: '/compte/favoris',
      icon: Heart,
      label: 'Favoris',
      value: String(user.favorites.length),
      sub: 'produits enregistrés',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Bonjour {user.firstName}</h1>
        <p className="mt-1 text-ink-soft">Retrouvez vos commandes, vos points et vos préférences.</p>
      </div>
      <RevealGroup className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <RevealItem key={t.to}>
            <Link to={t.to} className="group card block p-5 transition hover:border-forest">
              <span className="grid place-items-start text-forest">
                <t.icon className="size-5" />
              </span>
              <p className="mt-3 text-sm text-ink-muted">{t.label}</p>
              <p className="text-2xl font-extrabold">{t.value}</p>
              <p className="text-xs text-ink-muted">{t.sub}</p>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Dernières commandes</h2>
          <Link
            to="/compte/commandes"
            className="flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {orders?.length ? (
          <ul className="divide-y divide-sage">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link
                  to={`/compte/commandes/${o.number}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-forest"
                >
                  <span>
                    <span className="block font-mono font-bold">{o.number}</span>
                    <span className="text-xs text-ink-muted">{formatDate(o.createdAt)}</span>
                  </span>
                  <Badge tone={o.status === 'cancelled' ? 'danger' : 'forest'}>{orderStatusLabel[o.status]}</Badge>
                  <span className="font-semibold tabular-nums">{formatPrice(o.totals.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Vous n’avez pas encore passé de commande.</p>
        )}
      </div>
    </div>
  );
}
