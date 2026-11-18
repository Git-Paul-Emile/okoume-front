import { BarChart } from '@mui/x-charts/BarChart';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import {
  useAdminCategories,
  useAdminCustomers,
  useSearchLog,
  useProductViews,
  useAdminOrders,
  useAdminProducts,
  useSiteStats,
} from '@/features/admin/admin.queries';
import type { Period } from '@/features/admin/admin.types';
import { chartColor, compactNumber, formatPercent } from '@/features/admin/chart.utils';
import { AdminTable } from '@/features/admin/components/AdminTable';
import { axisStyle } from '@/features/admin/components/chartStyles';
import { DashboardCard } from '@/features/admin/components/DashboardCard';
import { ExportDialog } from '@/features/admin/components/ExportDialog';
import { PageIntro, Segmented, StatRow } from '@/features/admin/components/Toolbar';
import {
  buckets,
  grossMargin,
  marginAfterDelivery,
  orderMetrics,
  ordersInPeriod,
  ordersTable,
  periodLabel,
  periodRange,
  referenceEnd,
} from '@/features/admin/dashboard.utils';
import { canExport } from '@/features/admin/admin.navigation';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { tableOf, type ExportTable } from '@/features/admin/exporters';
import { formatPrice } from '@/utils/formatPrice';
import { topSearches } from '@/features/search/searchLog';
import { StatsInsights } from '@/features/admin/components/StatsInsights';

const HOUR = 3_600_000;
const hours = (from?: string, to?: string) =>
  from && to ? (new Date(to).getTime() - new Date(from).getTime()) / HOUR : null;
const avg = (list: Array<number | null>) => {
  const v = list.filter((x): x is number => x !== null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
};
const duration = (h: number) =>
  h < 48 ? `${Math.round(h)}\u00a0h` : `${(h / 24).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00a0j`;

type ExportKind = 'orders' | 'stock' | 'customers' | 'weekly' | null;

export default function AdminStatsPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const { data: stats = [] } = useSiteStats();
  const { data: products = [] } = useAdminProducts();
  const { data: categories = [] } = useAdminCategories();
  const { data: customers = [] } = useAdminCustomers();
  const { data: searches = [] } = useSearchLog();
  const { data: views = [] } = useProductViews();
  const [period, setPeriod] = useState<Period>('30d');
  const [exporting, setExporting] = useState<ExportKind>(null);
  const admin = useAdminAuthStore((s) => s.admin);

  if (isLoading || !orders) return <PageLoader />;

  const end = referenceEnd(orders, stats);
  const { start, prevStart } = periodRange(period, end);
  const list = ordersInPeriod(orders, start, end);
  const searchRows = topSearches(searches, start, end);
  const valid = list.filter((o) => o.status !== 'cancelled');
  const metrics = orderMetrics(list);
  const at = (o: (typeof list)[number], s: string) => o.history.find((h) => h.status === s)?.at;

  // Chiffre d'affaires par rayon (catégorie racine du produit)
  const rootOf = new Map(products.map((p) => [p.id, p.rootCategoryId]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const byRoot = new Map<string, number>();
  valid.forEach((o) =>
    o.items.forEach((i) => {
      const root = rootOf.get(i.productId) ?? 'autre';
      byRoot.set(root, (byRoot.get(root) ?? 0) + i.unitPrice * i.quantity);
    }),
  );
  const categoryRows = [...byRoot.entries()]
    .map(([id, revenue]) => ({ id, name: catName.get(id) ?? 'Autre', revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Activité par quartier
  const zones = new Map<string, { id: string; name: string; count: number; revenue: number; cost: number[] }>();
  valid.forEach((o) => {
    const z = zones.get(o.customer.zoneId) ?? {
      id: o.customer.zoneId,
      name: o.customer.zoneName,
      count: 0,
      revenue: 0,
      cost: [],
    };
    z.count += 1;
    z.revenue += o.totals.total;
    if (o.deliveryCost) z.cost.push(o.deliveryCost);
    zones.set(o.customer.zoneId, z);
  });
  const zoneRows = [...zones.values()].sort((a, b) => b.revenue - a.revenue);

  const exports: Record<
    Exclude<ExportKind, null>,
    { title: string; description: string; filename: string; rows: number; table: () => ExportTable }
  > = {
    orders: {
      title: 'Exporter les commandes',
      description: `${list.length} commandes sur les ${periodLabel[period]}, avec montants et marges.`,
      filename: 'commandes',
      rows: list.length,
      table: () => ordersTable(list),
    },
    stock: {
      title: 'Exporter le stock',
      description: 'Toutes les variantes avec stock, réservé, seuil et coût d’achat.',
      filename: 'stock',
      rows: products.reduce((s, p) => s + p.variants.length, 0),
      table: () =>
        tableOf(
          ['Référence', 'Produit', 'Variante', 'Stock', 'Réservé', 'Disponible', 'Seuil', 'Prix', 'Coût d’achat'],
          products.flatMap((p) =>
            p.variants.map((v) => [
              v.sku,
              p.name,
              v.label,
              v.stock,
              v.reserved,
              v.stock - v.reserved,
              v.lowStockThreshold,
              v.price,
              v.cost ?? '',
            ]),
          ),
        ),
    },
    customers: {
      title: 'Exporter les clients',
      description: `${customers.length} comptes clients. Données personnelles : le motif est obligatoire et l’export est journalisé.`,
      filename: 'clients',
      rows: customers.length,
      table: () =>
        tableOf(
          ['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Niveau', 'Points', 'Inscription'],
          customers.map((u) => [
            u.firstName,
            u.lastName,
            u.email,
            u.phone,
            u.tier,
            u.loyaltyPoints,
            u.createdAt.slice(0, 10),
          ]),
        ),
    },
    weekly: {
      title: 'Rapport hebdomadaire',
      description: 'Commandes, chiffre d’affaires et marges semaine par semaine sur les 3 derniers mois.',
      filename: 'rapport-hebdomadaire',
      rows: 13,
      table: () =>
        tableOf(
          ['Semaine', 'Commandes', 'Annulées', 'Chiffre d’affaires', 'Marge brute', 'Marge après livraison'],
          buckets('90d', end).map((b) => {
            const m = orderMetrics(ordersInPeriod(orders, b.start, b.end));
            return [b.title, m.count, m.cancelled, m.revenue, m.grossMargin, m.marginAfterDelivery];
          }),
        ),
    },
  };
  const current = exporting ? exports[exporting] : null;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageIntro
        actions={
          <Segmented
            label="Période"
            value={period}
            onChange={setPeriod}
            options={(['7d', '30d', '90d', '6m'] as Period[]).map((p) => ({ value: p, label: periodLabel[p] }))}
          />
        }
      >
        Indicateurs d’exploitation et de rentabilité des {periodLabel[period]}. La marge après livraison ne tient pas
        compte des charges fixes : ce n’est pas un bénéfice net. La mesure d’audience (visites, consultations,
        recherches) n’est pas encore collectée : ces indicateurs restent vides.
      </PageIntro>

      <StatRow
        items={[
          {
            label: 'Taux d’annulation',
            value: formatPercent(list.length ? (metrics.cancelled / list.length) * 100 : 0),
          },
          {
            label: 'Préparation (moyenne)',
            value: duration(avg(valid.map((o) => hours(o.createdAt, at(o, 'ready'))))),
          },
          {
            label: 'Livraison (moyenne)',
            value: duration(avg(valid.map((o) => hours(o.createdAt, at(o, 'delivered'))))),
          },
          {
            label: 'Taux de réclamation',
            value: formatPercent(
              valid.length ? (valid.filter((o) => o.status === 'claim').length / valid.length) * 100 : 0,
            ),
          },
        ]}
      />
      <StatRow
        items={[
          { label: 'Chiffre d’affaires', value: formatPrice(metrics.revenue) },
          {
            label: 'Coût des marchandises',
            value: formatPrice(
              valid.reduce((s, o) => s + o.items.reduce((x, i) => x + (i.unitCost ?? 0) * i.quantity, 0), 0),
            ),
          },
          { label: 'Marge brute', value: formatPrice(valid.reduce((s, o) => s + grossMargin(o), 0)) },
          { label: 'Marge après livraison', value: formatPrice(valid.reduce((s, o) => s + marginAfterDelivery(o), 0)) },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard title="Chiffre d’affaires par rayon" description="Hors frais de livraison et commandes annulées">
          <BarChart
            height={Math.max(220, categoryRows.length * 44)}
            layout="horizontal"
            hideLegend
            borderRadius={4}
            margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            dataset={categoryRows.map((c, i) => ({ i, revenue: c.revenue }))}
            yAxis={[
              {
                dataKey: 'i',
                scaleType: 'band',
                categoryGapRatio: 0.35,
                width: 130,
                disableTicks: true,
                disableLine: true,
                valueFormatter: (i: number) => categoryRows[i]?.name ?? '',
              },
            ]}
            xAxis={[{ valueFormatter: (v: number) => compactNumber(v), disableTicks: true }]}
            series={[
              {
                dataKey: 'revenue',
                label: 'Chiffre d’affaires',
                color: chartColor.primary,
                valueFormatter: (v) => formatPrice(v ?? 0),
              },
            ]}
            sx={axisStyle}
          />
        </DashboardCard>

        <DashboardCard title="Exports" description="Un motif est demandé pour chaque export (cahier des charges, 18.3)">
          <ul className="divide-y divide-sage">
            {(Object.keys(exports) as Array<Exclude<ExportKind, null>>).map((k) => (
              <li key={k} className="flex items-center justify-between gap-4 py-3.5">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {exports[k].title.replace('Exporter ', '').replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <span className="block text-sm text-ink-muted">{exports[k].description}</span>
                </span>
                {canExport(admin) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Download className="size-4" />}
                    onClick={() => setExporting(k)}
                  >
                    CSV
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">Administrateur principal</span>
                )}
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>

      <StatsInsights
        orders={orders}
        products={products}
        views={views}
        start={start}
        end={end}
        prevStart={prevStart}
        now={end.getTime()}
      />

      <h2 className="mt-8 mb-1 text-lg">Termes recherchés</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Recherches anonymes des visiteurs qui ont accepté la mesure d’audience. Les termes sans résultat signalent un
        produit à ajouter ou un mot à mieux référencer.
      </p>
      <AdminTable
        caption="Termes recherchés"
        rows={searchRows}
        rowKey={(s) => s.term}
        pageSize={15}
        empty="Aucune recherche sur la période."
        columns={[
          { key: 'term', header: 'Terme', cell: (s) => <span className="font-semibold">{s.term}</span> },
          { key: 'count', header: 'Recherches', align: 'right', cell: (s) => s.count },
          {
            key: 'results',
            header: 'Résultats',
            align: 'right',
            cell: (s) => (s.results === 0 ? <span className="font-semibold text-danger">Aucun</span> : s.results),
          },
        ]}
      />

      <h2 className="mt-8 mb-3 text-lg">Activité par quartier</h2>
      <AdminTable
        caption="Activité par quartier"
        rows={zoneRows}
        rowKey={(z) => z.id}
        pageSize={20}
        empty="Aucune commande sur la période."
        columns={[
          { key: 'name', header: 'Quartier', cell: (z) => <span className="font-semibold">{z.name}</span> },
          { key: 'count', header: 'Commandes', align: 'right', cell: (z) => z.count },
          { key: 'revenue', header: 'Chiffre d’affaires', align: 'right', cell: (z) => formatPrice(z.revenue) },
          {
            key: 'basket',
            header: 'Panier moyen',
            align: 'right',
            cell: (z) => formatPrice(z.revenue / z.count),
          },
          {
            key: 'cost',
            header: 'Coût livreur moyen',
            align: 'right',
            cell: (z) => (z.cost.length ? formatPrice(avg(z.cost)) : '-'),
          },
        ]}
      />

      {current && (
        <ExportDialog
          open
          onClose={() => setExporting(null)}
          title={current.title}
          description={current.description}
          filename={current.filename}
          count={current.rows}
          table={current.table}
        />
      )}
    </div>
  );
}
