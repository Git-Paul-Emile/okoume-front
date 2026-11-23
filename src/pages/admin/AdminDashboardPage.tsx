import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import {
  useAdminOrders,
  useAdminProducts,
  useAdminSettings,
  useSiteStats,
} from '@/features/admin/admin.queries';
import type { Period } from '@/features/admin/admin.types';
import { formatInt, formatPercent } from '@/features/admin/chart.utils';
import { anomalies, dailySummary } from '@/features/admin/adminAssistant';
import { ActionQueue } from '@/features/admin/components/ActionQueue';
import { DailySummaryBanner } from '@/features/admin/components/DailySummaryBanner';
import { DashboardCard } from '@/features/admin/components/DashboardCard';
import { ExportDialog } from '@/features/admin/components/ExportDialog';
import { FunnelChart } from '@/features/admin/components/FunnelChart';
import { KpiCard } from '@/features/admin/components/KpiCard';
import { LatestOrders } from '@/features/admin/components/LatestOrders';
import { PaymentDonut } from '@/features/admin/components/PaymentDonut';
import { RevenueChart } from '@/features/admin/components/RevenueChart';
import { TopProducts } from '@/features/admin/components/TopProducts';
import { VisitorsChart } from '@/features/admin/components/VisitorsChart';
import {
  actionItems,
  buckets,
  dashboardKpis,
  delta,
  funnel,
  ordersInPeriod,
  ordersTable,
  paymentSplit,
  periodLabel,
  periodRange,
  referenceEnd,
  revenueSeries,
  topProducts,
  trafficBuckets,
  trafficSeries,
} from '@/features/admin/dashboard.utils';
import { canExport } from '@/features/admin/admin.navigation';
import { stagger } from '@/lib/motion';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

const PERIODS: Period[] = ['7d', '30d', '90d', '6m'];

export default function AdminDashboardPage() {
  const admin = useAdminAuthStore((s) => s.admin);
  const [period, setPeriod] = useState<Period>('30d');
  const [exportOpen, setExportOpen] = useState(false);
  const orders = useAdminOrders();
  const products = useAdminProducts();
  const stats = useSiteStats();
  const settings = useAdminSettings();

  const view = useMemo(() => {
    if (!orders.data || !stats.data) return null;
    const end = referenceEnd(orders.data, stats.data);
    const { start } = periodRange(period, end);
    const inPeriod = ordersInPeriod(orders.data, start, end);
    const list = buckets(period, end);
    return {
      end,
      inPeriod,
      kpis: dashboardKpis(orders.data, stats.data, period, end),
      revenue: revenueSeries(orders.data, list),
      traffic: trafficSeries(stats.data, trafficBuckets(period, end)),
      payments: paymentSplit(inPeriod),
      funnel: funnel(stats.data, orders.data, start, end),
      top: topProducts(inPeriod),
      latest: orders.data.slice(0, 6),
      actions: actionItems(
        orders.data,
        products.data ?? [],
        end.getTime(),
        settings.data?.cashPreparationAlertHours ?? 24,
      ),
      summary: dailySummary({
        orders: orders.data,
        products: products.data ?? [],
        stats: stats.data,
        end,
      }),
      findings: anomalies({
        orders: orders.data,
        products: products.data ?? [],
        stats: stats.data,
        end,
      }).length,
    };
  }, [orders.data, stats.data, products.data, settings.data, period]);

  if (orders.isError || stats.isError)
    return (
      <ErrorState
        error={orders.error ?? stats.error}
        title="Impossible de charger le tableau de bord"
        onRetry={() => {
          orders.refetch();
          stats.refetch();
        }}
      />
    );
  if (!view) return <PageLoader label="Chargement des indicateurs…" />;

  const { kpis } = view;
  const compare = `vs ${periodLabel[period]} précédents`;
  const lastDay = new Date(view.end.getTime() - 1);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">Bonjour {admin?.firstName}</h2>
          <p className="mt-1 text-ink-soft">
            Activité des {periodLabel[period]} jusqu’au {formatDate(lastDay.toISOString())}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Période" className="flex rounded-md border border-sage-dark bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'relative h-8 rounded-sm px-3 text-sm font-semibold transition-colors',
                  period === p ? 'text-white' : 'text-ink-soft hover:text-ink',
                )}
              >
                {period === p && (
                  <motion.span layoutId="period-active" className="absolute inset-0 rounded-sm bg-forest" />
                )}
                <span className="relative">{periodLabel[p]}</span>
              </button>
            ))}
          </div>
          {canExport(admin) && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={() => setExportOpen(true)}
              className="h-10"
            >
              Exporter
            </Button>
          )}
        </div>
      </div>

      <DailySummaryBanner summary={view.summary} findings={view.findings} />

      <motion.div
        key={period}
        variants={stagger(0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <KpiCard
          label="Chiffre d’affaires"
          value={formatPrice(kpis.current.revenue)}
          change={delta(kpis.current.revenue, kpis.previous.revenue)}
          hint={compare}
        />
        <KpiCard
          label="Commandes"
          value={formatInt(kpis.current.count)}
          change={delta(kpis.current.count, kpis.previous.count)}
          hint={`Panier moyen ${formatPrice(kpis.current.avgBasket)}`}
        />
        <KpiCard
          label="Marge après livraison"
          value={formatPrice(kpis.current.marginAfterDelivery)}
          change={delta(kpis.current.marginAfterDelivery, kpis.previous.marginAfterDelivery)}
          hint={`Marge brute ${formatPrice(kpis.current.grossMargin)}`}
        />
        <KpiCard
          label="Visiteurs"
          value={formatInt(kpis.visitors)}
          change={delta(kpis.visitors, kpis.prevVisitors)}
          hint={`Conversion ${formatPercent(kpis.conversion, 2)}`}
        />
      </motion.div>

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <DashboardCard
          className="xl:col-span-2"
          title="Chiffre d’affaires et marge"
          description="Hors commandes annulées. La marge déduit le coût d’achat et les remises ; ce n’est pas un bénéfice net."
        >
          <RevenueChart key={period} data={view.revenue} />
        </DashboardCard>
        <DashboardCard
          title="Dernières commandes"
          description={`${formatInt(orders.data!.length)} commandes au total`}
          action={
            <Link to="/admin/commandes" className="text-sm font-semibold text-forest hover:underline">
              Tout voir
            </Link>
          }
        >
          <LatestOrders orders={view.latest} />
        </DashboardCard>
      </motion.div>

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <DashboardCard title="Moyens de paiement" description="Part du chiffre d’affaires de la période">
          <PaymentDonut key={period} data={view.payments} />
        </DashboardCard>
        <DashboardCard id="a-traiter" title="À traiter" description="Alertes classées par niveau d’urgence">
          <ActionQueue items={view.actions} />
        </DashboardCard>
        <DashboardCard
          className="md:col-span-2 xl:col-span-1"
          title="Tunnel d’achat"
          description="Du premier visiteur à la commande validée"
        >
          <FunnelChart key={period} data={view.funnel} />
        </DashboardCard>
      </motion.div>

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <DashboardCard
          className="xl:col-span-2"
          title="Visiteurs"
          description="Mesure d’audience pas encore collectée par l’API"
        >
          <VisitorsChart key={period} data={view.traffic} />
        </DashboardCard>
        <DashboardCard title="Meilleures ventes" description="Classées par chiffre d’affaires sur la période">
          <TopProducts key={period} data={view.top} />
        </DashboardCard>
      </motion.div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exporter les commandes"
        description={`${view.inPeriod.length} commandes sur les ${periodLabel[period]}. Les données clients sont personnelles : exportez uniquement ce qui est nécessaire.`}
        filename="commandes"
        count={view.inPeriod.length}
        table={() => ordersTable(view.inPeriod)}
      />
    </div>
  );
}
