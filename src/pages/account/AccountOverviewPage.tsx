import { Package } from 'lucide-react';
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
  const active = orders?.filter((order) => order.status !== 'delivered') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Bonjour {user.firstName}</h1>
        <p className="mt-1 text-ink-soft">Retrouvez vos commandes et vos informations personnelles.</p>
      </div>
      <RevealGroup className="grid max-w-md gap-4">
        <RevealItem>
          <Link to="/compte/commandes" className="group card block p-5 transition hover:border-forest">
            <span className="grid place-items-start text-forest"><Package className="size-5" /></span>
            <p className="mt-3 text-sm text-ink-muted">Commandes</p>
            <p className="text-2xl font-extrabold">{orders?.length ?? '…'}</p>
            <p className="text-xs text-ink-muted">{active.length} en cours</p>
          </Link>
        </RevealItem>
      </RevealGroup>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Dernières commandes</h2>
          <Link to="/compte/commandes" className="flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
            Tout voir
          </Link>
        </div>
        {orders?.length ? (
          <ul className="divide-y divide-sage">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link
                  to={`/compte/commandes/${order.number}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-forest"
                >
                  <span>
                    <span className="block font-mono font-bold">{order.number}</span>
                    <span className="text-xs text-ink-muted">{formatDate(order.createdAt)}</span>
                  </span>
                  <Badge tone="forest">{orderStatusLabel[order.status]}</Badge>
                  <span className="font-semibold tabular-nums">{formatPrice(order.totals.total)}</span>
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
