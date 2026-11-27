import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/utils/formatDate';
import { OrderItems, OrderTotalsTable } from './OrderSummary';
import { OrderTimeline } from './OrderTimeline';
import { orderStatusLabel, paymentStatusLabel } from '../orders.constants';
import type { Order } from '../orders.types';

/** Résumé et suivi des étapes principales d'une commande. */
export function OrderDetailPanel({ order }: { order: Order }) {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-xl">{order.number}</h2>
            <p className="mt-1 text-xs text-ink-muted">Commande du {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="forest">{orderStatusLabel[order.status]}</Badge>
            <Badge tone={order.paymentStatus === 'paid' ? 'forest' : 'warning'}>{paymentStatusLabel[order.paymentStatus]}</Badge>
          </div>
        </header>
        <OrderTimeline order={order} />
        {!!order.trackedOrders?.length && order.trackedOrders.length > 1 && (
          <section className="mt-5 rounded-md bg-ivory p-4">
            <h3 className="font-semibold">Suivi des boutiques</h3>
            <ul className="mt-2 divide-y divide-sage text-sm">
              {order.trackedOrders.map((stop) => (
                <li key={stop.number} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{stop.shopName}</span>
                  <span>{orderStatusLabel[stop.status]} · {stop.total.toLocaleString('fr-FR')} FCFA</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="card p-6">
          <h3 className="mb-2 text-base">Articles</h3>
          <OrderItems order={order} />
        </section>
        <div className="space-y-6">
          <section className="card p-6">
            <h3 className="mb-3 text-base">Montant</h3>
            <OrderTotalsTable order={order} />
          </section>
          <section className="card p-6 text-sm">
            <h3 className="mb-2 text-base">Livraison</h3>
            <p className="text-ink-soft">
              {order.customer.recipient && <>{order.customer.recipient}<br /></>}
              {order.customer.phone && <>{order.customer.phone}<br /></>}
              {[order.customer.zoneName, order.customer.landmark].filter(Boolean).join(', ')}
            </p>
            {order.customer.instructions && <p className="mt-1 text-ink-muted">« {order.customer.instructions} »</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
