import { formatPrice } from '@/utils/formatPrice';
import { paymentMethodLabel, paymentStatusLabel } from '../orders.constants';
import type { Order } from '../orders.types';

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-sage">
      {order.items.map((i) => (
        <li key={i.variantId} className="flex items-center gap-4 py-3">
          <img
            src={i.image}
            alt=""
            className="size-16 shrink-0 rounded-md border border-sage bg-white object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{i.name}</p>
            <p className="text-xs text-ink-muted">
              {i.variantLabel} · Qté {i.quantity} · {formatPrice(i.unitPrice)} l’unité
            </p>
          </div>
          <p className="text-sm font-bold tabular-nums">{formatPrice(i.unitPrice * i.quantity)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsTable({ order }: { order: Order }) {
  const t = order.totals;
  const rows: Array<[string, number, boolean?]> = [
    ['Sous-total articles', t.subtotal],
    ...(t.codeDiscount ? [[`Code ${order.promoCode ?? ''}`, -t.codeDiscount, true] as [string, number, boolean]] : []),
    [`Livraison (${order.customer.zoneName})`, t.deliveryFee],
    ...(t.deliveryDiscount ? [['Livraison offerte', -t.deliveryDiscount, true] as [string, number, boolean]] : []),
  ];
  return (
    <dl className="space-y-2 text-sm">
      {t.productDiscount > 0 && (
        <div className="flex justify-between text-mure">
          <dt>Économies sur promotions</dt>
          <dd className="tabular-nums">{formatPrice(t.productDiscount)}</dd>
        </div>
      )}
      {rows.map(([label, value, discount]) => (
        <div key={label} className="flex justify-between">
          <dt className="text-ink-soft">{label}</dt>
          <dd className={discount ? 'text-mure tabular-nums' : 'tabular-nums'}>
            {value < 0 ? `− ${formatPrice(-value)}` : formatPrice(value)}
          </dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-sage pt-3 text-base font-extrabold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(t.total)}</dd>
      </div>
      <div className="flex justify-between pt-1 text-xs text-ink-muted">
        <dt>{paymentMethodLabel[order.paymentMethod]}</dt>
        <dd>{paymentStatusLabel[order.paymentStatus]}</dd>
      </div>
    </dl>
  );
}
