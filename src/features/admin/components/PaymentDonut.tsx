import { PieChart } from '@mui/x-charts/PieChart';
import { useState } from 'react';
import { paymentMethodLabel } from '@/features/orders/orders.constants';
import { formatPrice } from '@/utils/formatPrice';
import { formatInt, formatPercent, paymentColor } from '../chart.utils';
import type { paymentSplit } from '../dashboard.utils';

type Row = ReturnType<typeof paymentSplit>[number];

const SIZE = 184;

/** Répartition du chiffre d'affaires par moyen de paiement (espèces, Airtel Money, Moov Money). */
export function PaymentDonut({ data }: { data: Row[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const orders = data.reduce((s, d) => s + d.count, 0);
  const rows = data.map((d) => ({ ...d, share: total ? (d.revenue / total) * 100 : 0 }));
  const focus = active !== null ? rows[active] : null;

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative">
        <PieChart
          width={SIZE}
          height={SIZE}
          hideLegend
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          highlightedItem={active !== null ? { seriesId: 'payments', dataIndex: active } : null}
          onHighlightChange={(item) => setActive(item?.dataIndex ?? null)}
          series={[
            {
              id: 'payments',
              data: rows.map((r, i) => ({
                id: i,
                value: r.revenue,
                label: paymentMethodLabel[r.method],
                color: paymentColor[r.method],
              })),
              innerRadius: 58,
              outerRadius: 86,
              paddingAngle: 1.5,
              cornerRadius: 4,
              highlightScope: { fade: 'global', highlight: 'item' },
              faded: { additionalRadius: -4, color: '#cfdad3' },
              valueFormatter: (item) => formatPrice(item.value),
            },
          ]}
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="max-w-[100px]">
            <p className="text-2xl font-extrabold text-ink tabular-nums">
              {focus ? formatPercent(focus.share, 0) : formatInt(orders)}
            </p>
            <p className="text-xs text-ink-muted">{focus ? paymentMethodLabel[focus.method] : 'commandes'}</p>
          </div>
        </div>
      </div>

      <ul className="mt-5 w-full space-y-2.5 text-sm">
        {rows.map((r, i) => (
          <li
            key={r.method}
            className="flex items-center gap-2.5"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ background: paymentColor[r.method] }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">{paymentMethodLabel[r.method]}</span>
            <span className="ml-auto text-ink-muted tabular-nums">{formatPercent(r.share, 0)}</span>
            <span className="w-[110px] text-right font-semibold text-ink tabular-nums">{formatPrice(r.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
