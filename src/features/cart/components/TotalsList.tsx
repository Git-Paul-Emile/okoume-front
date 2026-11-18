import { motion } from 'motion/react';
import { formatPrice } from '@/utils/formatPrice';
import type { CartTotals } from '../cart.types';

function Row({ label, value, tone }: { label: string; value: string; tone?: 'discount' | 'muted' }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={tone === 'muted' ? 'text-ink-muted' : 'text-ink-soft'}>{label}</dt>
      <dd className={tone === 'discount' ? 'font-semibold text-mure tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}

export function TotalsList({
  totals,
  deliveryKnown,
  promoCode,
  vat,
}: {
  totals: CartTotals;
  deliveryKnown: boolean;
  promoCode?: string | null;
  /** TVA incluse, calculée par l'appelant (prix TTC). */
  vat?: { rows: Array<{ rate: number; vat: number }>; total: number };
}) {
  return (
    <dl className="space-y-2.5 text-sm">
      <Row label={`Articles (${totals.itemCount})`} value={formatPrice(totals.baseSubtotal)} />
      {totals.productDiscount > 0 && (
        <Row label="Promotions" value={`− ${formatPrice(totals.productDiscount)}`} tone="discount" />
      )}
      {totals.codeDiscount > 0 && (
        <Row label={`Code ${promoCode ?? ''}`} value={`− ${formatPrice(totals.codeDiscount)}`} tone="discount" />
      )}
      {totals.pointsDiscount > 0 && (
        <Row
          label={`Points (${totals.pointsUsed})`}
          value={`− ${formatPrice(totals.pointsDiscount)}`}
          tone="discount"
        />
      )}
      {deliveryKnown ? (
        <>
          <Row label="Livraison" value={formatPrice(totals.deliveryFee)} />
          {totals.deliveryDiscount > 0 && (
            <Row label="Livraison offerte" value={`− ${formatPrice(totals.deliveryDiscount)}`} tone="discount" />
          )}
        </>
      ) : (
        <Row label="Livraison" value="selon le quartier" tone="muted" />
      )}
      <div className="flex items-baseline justify-between border-t border-sage pt-3">
        <dt className="text-base font-bold">{deliveryKnown ? 'Total à payer' : 'Total hors livraison'}</dt>
        <motion.dd
          key={totals.total}
          initial={{ opacity: 0.4, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold tabular-nums"
        >
          {formatPrice(totals.total)}
        </motion.dd>
      </div>
      {vat && vat.total > 0 && (
        <p className="text-xs text-ink-muted">
          Prix TTC, dont TVA {formatPrice(vat.total)}
          {vat.rows.length > 1 && ` (${vat.rows.map((r) => `${r.rate} % : ${formatPrice(r.vat)}`).join(', ')})`}
          {!deliveryKnown && ', hors livraison'}.
        </p>
      )}
      {totals.pointsEarned > 0 && (
        <p className="text-xs text-ink-muted">
          Vous gagnerez {totals.pointsEarned} points de fidélité après livraison et paiement.
        </p>
      )}
    </dl>
  );
}
