import { motion } from 'motion/react';
import { Check, Package, PackageCheck, ShoppingCart, Truck, UserCheck, Home } from 'lucide-react';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import { ORDER_FLOW, orderStatusLabel } from '../orders.constants';
import type { Order } from '../orders.types';

const icons = {
  confirmed: ShoppingCart,
  preparing: Package,
  ready: PackageCheck,
  courier_assigned: UserCheck,
  shipping: Truck,
  delivered: Home,
};

export function OrderTimeline({ order }: { order: Order }) {
  const currentIndex = Math.max(0, ORDER_FLOW.indexOf(order.status));
  const progress = currentIndex / (ORDER_FLOW.length - 1);

  return (
    <ol className="relative grid gap-6 md:grid-cols-6 md:gap-2">
      {/* Ligne de progression */}
      <div className="absolute top-5 right-[8%] left-[8%] hidden h-1 rounded-full bg-sage md:block" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-forest"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
      <div className="absolute top-2 bottom-2 left-5 w-1 rounded-full bg-sage md:hidden" aria-hidden="true">
        <motion.div
          className="w-full rounded-full bg-forest"
          initial={{ height: 0 }}
          animate={{ height: `${progress * 100}%` }}
          transition={{ duration: 1.1, delay: 0.2 }}
        />
      </div>
      {ORDER_FLOW.map((status, i) => {
        const done = i <= currentIndex;
        const Icon = done && i < currentIndex ? Check : icons[status as keyof typeof icons];
        const entry = order.history.find((h) => h.status === status);
        return (
          <li
            key={status}
            className="relative flex items-center gap-4 md:flex-col md:text-center"
            aria-current={i === currentIndex ? 'step' : undefined}
          >
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'relative z-10 grid size-11 shrink-0 place-items-center rounded-full border-2',
                done ? 'border-forest bg-white text-forest' : 'border-sage-dark bg-white text-ink-muted',
                i === currentIndex && 'ring-4 ring-forest/20',
              )}
            >
              <Icon className="size-5" />
            </motion.span>
            <div>
              <p className={cn('text-sm font-semibold', done ? 'text-ink' : 'text-ink-muted')}>
                {orderStatusLabel[status]}
              </p>
              {entry && <p className="text-xs text-ink-muted">{formatDateTime(entry.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
