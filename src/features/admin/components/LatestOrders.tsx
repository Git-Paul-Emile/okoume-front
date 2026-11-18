import { motion } from 'motion/react';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import type { AdminOrder } from '../admin.types';
import { OrderStatusBadge, PaymentStatusBadge } from './StatusBadges';

/** Dernières commandes reçues : client, numéro, statut et montant. */
export function LatestOrders({ orders }: { orders: AdminOrder[] }) {
  return (
    <ul className="-mx-2 flex-1 space-y-0.5">
      {orders.map((o, i) => {
        const [first = '', last = ''] = o.customer.recipient.split(' ');
        return (
          <motion.li
            key={o.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex items-center gap-3 rounded-md px-2 py-2.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-xs font-bold text-ink">
              {first[0]}
              {last[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{o.customer.recipient}</span>
              <span className="block truncate text-xs text-ink-muted">
                {o.number} · {formatDateTime(o.createdAt)}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-bold text-ink tabular-nums">{formatPrice(o.totals.total)}</span>
              {o.paymentStatus === 'awaiting_verification' ? (
                <PaymentStatusBadge status={o.paymentStatus} />
              ) : (
                <OrderStatusBadge status={o.status} />
              )}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
