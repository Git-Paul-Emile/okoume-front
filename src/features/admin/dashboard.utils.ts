import type { PaymentMethod } from '@/features/orders/orders.types';
import type { Ticket } from '@/features/support/support.types';
import type { AdminOrder, AdminProduct, Period, SiteStat } from './admin.types';
import { tableOf, tableToCsv } from './exporters';
import { isLate } from './support.rules';
import { gabonFormatter } from '@/utils/formatDate';

const DAY = 86_400_000;
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, '6m': 182 };

export const periodLabel: Record<Period, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '3 mois',
  '6m': '6 mois',
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const time = (iso: string) => new Date(iso).getTime();

/**
 * Fin de la période affichée : le lendemain de la dernière activité connue.
 * Les données de démonstration restent ainsi lisibles même si on ouvre le projet plus tard.
 */
export function referenceEnd(orders: AdminOrder[], stats: SiteStat[]) {
  const last = Math.max(0, ...orders.map((o) => time(o.createdAt)), ...stats.map((s) => time(`${s.date}T12:00:00`)));
  return new Date(startOfDay(new Date(last || Date.now())).getTime() + DAY);
}

export function periodRange(period: Period, end: Date) {
  const span = PERIOD_DAYS[period] * DAY;
  const start = new Date(end.getTime() - span);
  return { start, end, prevStart: new Date(start.getTime() - span) };
}

const inRange = (iso: string, start: Date, end: Date) => {
  const t = time(iso);
  return t >= start.getTime() && t < end.getTime();
};

/** Les commandes annulées ne comptent ni dans le chiffre d'affaires ni dans les marges. */
const counted = (o: AdminOrder) => o.status !== 'cancelled';

/** Marge brute : prix de vente moins coût d'achat, moins les remises financées par la boutique. */
export function grossMargin(o: AdminOrder) {
  // Coût inconnu : marge nulle plutôt qu'une marge surestimée
  const items = o.items.reduce((s, i) => s + (i.unitPrice - (i.unitCost ?? i.unitPrice)) * i.quantity, 0);
  return items - o.totals.codeDiscount - o.totals.pointsDiscount;
}

/** Marge après livraison : ajoute les frais facturés et retire le coût réel payé au livreur. Ce n'est pas un bénéfice net. */
export function marginAfterDelivery(o: AdminOrder) {
  const billed = o.totals.deliveryFee - o.totals.deliveryDiscount;
  return grossMargin(o) + billed - (o.deliveryCost ?? o.totals.deliveryFee);
}

export function orderMetrics(orders: AdminOrder[]) {
  const valid = orders.filter(counted);
  const revenue = valid.reduce((s, o) => s + o.totals.total, 0);
  return {
    revenue,
    count: valid.length,
    cancelled: orders.length - valid.length,
    avgBasket: valid.length ? revenue / valid.length : 0,
    grossMargin: valid.reduce((s, o) => s + grossMargin(o), 0),
    marginAfterDelivery: valid.reduce((s, o) => s + marginAfterDelivery(o), 0),
  };
}

/** Variation en pourcentage par rapport à la période précédente (null si rien à comparer). */
export const delta = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

export function dashboardKpis(orders: AdminOrder[], stats: SiteStat[], period: Period, end: Date) {
  const { start, prevStart } = periodRange(period, end);
  const current = orderMetrics(orders.filter((o) => inRange(o.createdAt, start, end)));
  const previous = orderMetrics(orders.filter((o) => inRange(o.createdAt, prevStart, start)));
  const visitors = (from: Date, to: Date) =>
    stats.filter((s) => inRange(`${s.date}T12:00:00`, from, to)).reduce((sum, s) => sum + s.visitors, 0);
  const v = visitors(start, end);
  const pv = visitors(prevStart, start);
  return {
    current,
    previous,
    visitors: v,
    prevVisitors: pv,
    conversion: v ? (current.count / v) * 100 : 0,
    prevConversion: pv ? (previous.count / pv) * 100 : 0,
  };
}

export interface Bucket {
  start: Date;
  end: Date;
  /** Étiquette courte de l'axe. */
  label: string;
  /** Intitulé complet de l'infobulle. */
  title: string;
}

const dayLabel = gabonFormatter({ day: 'numeric', month: 'short' });
const dayTitle = gabonFormatter({ weekday: 'long', day: 'numeric', month: 'long' });
const monthLabel = gabonFormatter({ month: 'short' });
const monthTitle = gabonFormatter({ month: 'long', year: 'numeric' });

/** Découpage de la période : par jour jusqu'à 30 jours, par semaine sur 3 mois, par mois sur 6 mois. */
export function buckets(period: Period, end: Date): Bucket[] {
  if (period === '6m') {
    const last = new Date(end.getTime() - 1);
    return Array.from({ length: 6 }, (_, i) => {
      const s = new Date(last.getFullYear(), last.getMonth() - 5 + i, 1);
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
      return { start: s, end: e < end ? e : end, label: monthLabel.format(s), title: monthTitle.format(s) };
    });
  }
  return fixedSteps(PERIOD_DAYS[period], period === '90d' ? 7 : 1, end);
}

/** Courbe de fréquentation : par jour jusqu'à 30 jours, puis par semaine. */
export const trafficBuckets = (period: Period, end: Date) =>
  fixedSteps(PERIOD_DAYS[period], period === '7d' || period === '30d' ? 1 : 7, end);

function fixedSteps(days: number, step: number, end: Date): Bucket[] {
  const count = Math.ceil(days / step);
  return Array.from({ length: count }, (_, i) => {
    const e = new Date(end.getTime() - (count - 1 - i) * step * DAY);
    const s = new Date(e.getTime() - step * DAY);
    return step === 1
      ? { start: s, end: e, label: dayLabel.format(s), title: dayTitle.format(s) }
      : { start: s, end: e, label: dayLabel.format(s), title: `Semaine du ${dayLabel.format(s)}` };
  });
}

export function revenueSeries(orders: AdminOrder[], list: Bucket[]) {
  return list.map((b) => {
    const m = orderMetrics(orders.filter((o) => inRange(o.createdAt, b.start, b.end)));
    return { ...b, revenue: m.revenue, margin: m.grossMargin, count: m.count };
  });
}

export function trafficSeries(stats: SiteStat[], list: Bucket[]) {
  return list.map((b) => {
    const days = stats.filter((s) => inRange(`${s.date}T12:00:00`, b.start, b.end));
    return {
      ...b,
      visitors: days.reduce((s, d) => s + d.visitors, 0),
      pwa: days.reduce((s, d) => s + d.pwaSessions, 0),
    };
  });
}

export const paymentOrder: PaymentMethod[] = ['cash', 'airtel', 'moov'];

export function paymentSplit(orders: AdminOrder[]) {
  const valid = orders.filter(counted);
  return paymentOrder.map((method) => {
    const list = valid.filter((o) => o.paymentMethod === method);
    return { method, count: list.length, revenue: list.reduce((s, o) => s + o.totals.total, 0) };
  });
}

/** Tunnel d'achat : visiteurs, fiches produit vues, ajouts au panier, commandes commencées puis validées. */
export function funnel(stats: SiteStat[], orders: AdminOrder[], start: Date, end: Date) {
  const days = stats.filter((s) => inRange(`${s.date}T12:00:00`, start, end));
  const sum = (key: 'visitors' | 'productViews' | 'addToCart' | 'checkouts') => days.reduce((s, d) => s + d[key], 0);
  const placed = orders.filter((o) => inRange(o.createdAt, start, end)).length;
  const visitors = sum('visitors');
  return {
    steps: [
      { label: 'Visiteurs', value: visitors },
      { label: 'Fiches produit vues', value: sum('productViews') },
      { label: 'Ajouts au panier', value: sum('addToCart') },
      { label: 'Commandes commencées', value: Math.max(sum('checkouts'), placed) },
      { label: 'Commandes validées', value: placed },
    ],
    // Paniers créés sans commande validée
    abandonment: sum('addToCart') ? Math.max(0, 1 - placed / sum('addToCart')) * 100 : 0,
  };
}

export function topProducts(orders: AdminOrder[], limit = 5) {
  const byId = new Map<string, { id: string; name: string; image: string; units: number; revenue: number }>();
  for (const o of orders.filter(counted)) {
    for (const i of o.items) {
      const row = byId.get(i.productId) ?? { id: i.productId, name: i.name, image: i.image, units: 0, revenue: 0 };
      row.units += i.quantity;
      row.revenue += i.unitPrice * i.quantity;
      byId.set(i.productId, row);
    }
  }
  return [...byId.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** Variantes en rupture ou sous le seuil d'alerte (stock disponible = stock moins réservé). */
export function stockAlerts(products: AdminProduct[]) {
  return products
    .filter((p) => p.status === 'published')
    .flatMap((p) =>
      p.variants
        .map((v) => ({ product: p, variant: v, available: v.stock - v.reserved }))
        .filter((r) => r.available <= r.variant.lowStockThreshold),
    )
    .sort((a, b) => a.available - b.available);
}

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface ActionItem {
  id: string;
  label: string;
  count: number;
  level: AlertLevel;
  to: string;
}

/** File de travail de l'équipe, avec les niveaux d'alerte du cahier des charges (17.6). */
export function actionItems(
  orders: AdminOrder[],
  products: AdminProduct[],
  tickets: Ticket[],
  now = Date.now(),
  waitHours = 24,
): ActionItem[] {
  const stock = stockAlerts(products);
  // Commandes non préparées depuis trop longtemps, quel que soit le moyen (tout se paie à la livraison) (6.4)
  const waiting = orders.filter((o) => o.status === 'confirmed' && now - time(o.createdAt) > waitHours * 3_600_000);
  const items: ActionItem[] = [
    {
      id: 'payments',
      label: 'Encaissements à confirmer (commandes livrées)',
      count: orders.filter((o) => o.status === 'delivered' && o.paymentStatus === 'awaiting_payment').length,
      level: 'critical',
      to: '/admin/paiements',
    },
    {
      id: 'review',
      label: 'Commandes suspectes à vérifier',
      count: orders.filter((o) => o.status !== 'cancelled' && o.review?.status === 'pending').length,
      level: 'critical',
      to: '/admin/commandes',
    },
    {
      id: 'out',
      label: 'Variantes en rupture de stock',
      count: stock.filter((s) => s.available <= 0).length,
      level: 'critical',
      to: '/admin/stock',
    },
    {
      id: 'late-support',
      label: 'Demandes d’assistance en retard',
      count: tickets.filter((t) => isLate(t, now)).length,
      level: 'critical',
      to: '/admin/assistance',
    },
    {
      id: 'claims',
      label: 'Réclamations ouvertes',
      count: tickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
      level: 'warning',
      to: '/admin/assistance',
    },
    {
      id: 'cancel',
      label: 'Demandes d’annulation à décider',
      count: orders.filter((o) => o.cancellationRequest?.status === 'pending').length,
      level: 'warning',
      to: '/admin/retours',
    },
    {
      id: 'payment-change',
      label: 'Changements de moyen de paiement',
      count: orders.filter((o) => o.paymentChangeRequest?.status === 'pending').length,
      level: 'warning',
      to: '/admin/paiements',
    },
    {
      id: 'returns',
      label: 'Demandes de retour à décider',
      count: orders.filter((o) => o.returnRequest?.status === 'pending').length,
      level: 'warning',
      to: '/admin/retours',
    },
    {
      id: 'waiting',
      label: `Commandes à préparer en attente depuis plus de ${waitHours} h`,
      count: waiting.length,
      level: 'warning',
      to: '/admin/commandes',
    },
    {
      id: 'prepare',
      label: 'Commandes à préparer',
      count: orders.filter((o) => o.status === 'confirmed').length,
      level: 'info',
      to: '/admin/commandes',
    },
    {
      id: 'low',
      label: 'Variantes sous le seuil d’alerte',
      count: stock.filter((s) => s.available > 0).length,
      level: 'info',
      to: '/admin/stock',
    },
  ];
  return items;
}

/** Commandes de la période, prêtes pour l'export (CSV, XLSX ou PDF). */
export const ordersTable = (orders: AdminOrder[]) =>
  tableOf(
    ['Numéro', 'Date', 'Client', 'Quartier', 'Statut', 'Paiement', 'Mode', 'Total', 'Marge brute'],
    orders.map((o) => [
      o.number,
      o.createdAt.slice(0, 10),
      o.customer.recipient,
      o.customer.zoneName,
      o.status,
      o.paymentStatus,
      o.paymentMethod,
      o.totals.total,
      o.status === 'cancelled' ? 0 : grossMargin(o),
    ]),
  );

export const ordersToCsv = (orders: AdminOrder[]) => tableToCsv(ordersTable(orders));

export const ordersInPeriod = (orders: AdminOrder[], start: Date, end: Date) =>
  orders.filter((o) => inRange(o.createdAt, start, end));
