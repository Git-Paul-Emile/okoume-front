import { BarChart } from '@mui/x-charts/BarChart';
import { formatPrice } from '@/utils/formatPrice';
import { chartColor } from '../chart.utils';
import type { topProducts } from '../dashboard.utils';
import { axisStyle } from './chartStyles';

const short = (name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name);

/** Meilleures ventes de la période, classées par chiffre d'affaires : barres horizontales MUI X. */
export function TopProducts({ data }: { data: ReturnType<typeof topProducts> }) {
  if (!data.length) return <p className="text-sm text-ink-muted">Aucune vente sur la période.</p>;
  return (
    <div className="flex flex-1 flex-col">
      <BarChart
        height={260}
        layout="horizontal"
        hideLegend
        borderRadius={4}
        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        dataset={data.map((p, i) => ({ i, revenue: p.revenue }))}
        yAxis={[
          {
            dataKey: 'i',
            scaleType: 'band',
            categoryGapRatio: 0.35,
            width: 128,
            disableTicks: true,
            disableLine: true,
            valueFormatter: (i: number, ctx) => (ctx.location === 'tick' ? short(data[i].name) : data[i].name),
          },
        ]}
        xAxis={[{ position: 'none' }]}
        series={[
          {
            dataKey: 'revenue',
            label: 'Chiffre d’affaires',
            color: chartColor.primary,
            valueFormatter: (v, { dataIndex }) => {
              const units = data[dataIndex].units;
              return `${formatPrice(v ?? 0)} · ${units} vendu${units > 1 ? 's' : ''}`;
            },
          },
        ]}
        sx={axisStyle}
      />

      <div className="sr-only">
        <table>
          <caption>Meilleures ventes</caption>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Chiffre d’affaires</th>
              <th>Unités vendues</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{formatPrice(p.revenue)}</td>
                <td>{p.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
