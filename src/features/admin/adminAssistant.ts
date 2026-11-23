import { formatPrice } from '@/utils/formatPrice';
import { normalizeText } from '@/utils/text';
import type { AdminOrder, AdminProduct, SiteStat } from './admin.types';
import { formatPercent } from './chart.utils';
import {
  marginAfterDelivery,
  orderMetrics,
  ordersInPeriod,
  stockAlerts,
  topProducts,
  type AlertLevel,
} from './dashboard.utils';
import { URGENCY_ORDER } from './assistantRules';

/**
 * Assistant de l'administration (cahier des charges, 17). Les chiffres sont calculés ici à partir
 * des données ; l'assistant ne fait que les interpréter et les expliquer. Moteur à règles local,
 * sans coût, conçu pour être remplacé par un modèle d'IA côté serveur sans changer l'interface.
 */
export interface AssistantContext {
  orders: AdminOrder[];
  products: AdminProduct[];
  stats: SiteStat[];
  /** Fin de la période observée (début du jour qui suit la dernière activité). */
  end: Date;
}

const DAY = 86_400_000;
const range = (end: Date, days: number, offsetDays = 0) => ({
  start: new Date(end.getTime() - (days + offsetDays) * DAY),
  end: new Date(end.getTime() - offsetDays * DAY),
});
const visitorsIn = (stats: SiteStat[], start: Date, end: Date) =>
  stats
    .filter((s) => {
      const t = new Date(`${s.date}T12:00:00`).getTime();
      return t >= start.getTime() && t < end.getTime();
    })
    .reduce((n, s) => n + s.visitors, 0);
const change = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);
const signed = (p: number) => `${p >= 0 ? '+' : '−'}${formatPercent(Math.abs(p), 0)}`;

// ---------------------------------------------------------------- Résumé quotidien

export interface SummaryLine {
  label: string;
  value: string;
  change: number | null;
}

export interface DailySummary {
  day: Date;
  lines: SummaryLine[];
  highlights: string[];
  insufficient: boolean;
}

/** Résumé de la veille, comparé au même jour de la semaine précédente (17.3). */
export function dailySummary(ctx: AssistantContext): DailySummary {
  const yesterday = range(ctx.end, 1);
  const lastWeek = range(ctx.end, 1, 7);
  const a = orderMetrics(ordersInPeriod(ctx.orders, yesterday.start, yesterday.end));
  const b = orderMetrics(ordersInPeriod(ctx.orders, lastWeek.start, lastWeek.end));
  const va = visitorsIn(ctx.stats, yesterday.start, yesterday.end);
  const vb = visitorsIn(ctx.stats, lastWeek.start, lastWeek.end);
  const lines: SummaryLine[] = [
    { label: 'Chiffre d’affaires', value: formatPrice(a.revenue), change: change(a.revenue, b.revenue) },
    { label: 'Commandes', value: String(a.count), change: change(a.count, b.count) },
    { label: 'Panier moyen', value: formatPrice(a.avgBasket), change: change(a.avgBasket, b.avgBasket) },
    { label: 'Visiteurs', value: va.toLocaleString('fr-FR'), change: change(va, vb) },
  ];
  const highlights: string[] = [];
  const revenueChange = change(a.revenue, b.revenue);
  if (revenueChange !== null && Math.abs(revenueChange) >= 20)
    highlights.push(
      `Le chiffre d’affaires est ${revenueChange > 0 ? 'en hausse' : 'en baisse'} de ${formatPercent(Math.abs(revenueChange), 0)} par rapport au même jour la semaine dernière.`,
    );
  if (a.cancelled > 0) highlights.push(`${a.cancelled} commande${a.cancelled > 1 ? 's annulées' : ' annulée'} hier.`);
  const best = topProducts(ordersInPeriod(ctx.orders, yesterday.start, yesterday.end), 1)[0];
  if (best) highlights.push(`Meilleure vente : ${best.name} (${formatPrice(best.revenue)}).`);
  return { day: yesterday.start, lines, highlights, insufficient: a.count === 0 && va === 0 };
}

// ---------------------------------------------------------------- Anomalies

export interface Finding {
  id: string;
  level: AlertLevel;
  title: string;
  /** Données justificatives, affichées avec la recommandation (17.4). */
  evidence: string;
  advice: string;
  to: string;
}

export function anomalies(ctx: AssistantContext): Finding[] {
  const now = ctx.end.getTime();
  const out: Finding[] = [];
  const week = range(ctx.end, 7);
  const before = range(ctx.end, 28, 7);
  const recent = ordersInPeriod(ctx.orders, week.start, week.end);
  const older = ordersInPeriod(ctx.orders, before.start, before.end);
  const cancelRate = (list: AdminOrder[]) =>
    list.length ? list.filter((o) => o.status === 'cancelled').length / list.length : 0;

  // Annulations anormalement nombreuses
  const cancelled = recent.filter((o) => o.status === 'cancelled').length;
  if (cancelled >= 3 && cancelRate(recent) > Math.max(0.1, 2 * cancelRate(older)))
    out.push({
      id: 'cancellations',
      level: 'warning',
      title: 'Hausse des annulations',
      evidence: `${cancelled} annulations sur 7 jours (${formatPercent(cancelRate(recent) * 100, 0)} des commandes), contre ${formatPercent(cancelRate(older) * 100, 0)} les 4 semaines précédentes.`,
      advice: 'Regardez les motifs dans « Annulations et retours » : délai de livraison, rupture, erreur de prix ?',
      to: '/admin/retours',
    });

  // Ventes en baisse
  const r1 = orderMetrics(recent).revenue;
  const r0 = orderMetrics(ordersInPeriod(ctx.orders, range(ctx.end, 7, 7).start, week.start)).revenue;
  const drop = change(r1, r0);
  if (drop !== null && drop <= -30)
    out.push({
      id: 'revenue-drop',
      level: 'warning',
      title: 'Ventes en recul sur 7 jours',
      evidence: `${formatPrice(r1)} contre ${formatPrice(r0)} la semaine précédente (${signed(drop)}).`,
      advice: 'Vérifiez la fréquentation, les ruptures sur les meilleures ventes et les promotions terminées.',
      to: '/admin/statistiques',
    });

  // Meilleures ventes en rupture ou bientôt
  const best = topProducts(ordersInPeriod(ctx.orders, range(ctx.end, 30).start, ctx.end), 10);
  const alerts = stockAlerts(ctx.products);
  const atRisk = best.filter((p) => alerts.some((s) => s.product.id === p.id));
  if (atRisk.length)
    out.push({
      id: 'bestsellers-stock',
      level: alerts.some((s) => atRisk.some((p) => p.id === s.product.id) && s.available <= 0) ? 'critical' : 'warning',
      title: 'Meilleures ventes à réapprovisionner',
      evidence: atRisk
        .slice(0, 3)
        .map((p) => {
          const left = alerts.filter((s) => s.product.id === p.id).reduce((n, s) => n + Math.max(0, s.available), 0);
          return `${p.name} : ${p.units} vendu${p.units > 1 ? 's' : ''} en 30 jours, ${left} disponible${left > 1 ? 's' : ''}`;
        })
        .join(' ; '),
      advice:
        'Commandez ces articles en priorité : une rupture sur une meilleure vente coûte des commandes chaque jour.',
      to: '/admin/stock',
    });

  // Paiements Mobile Money qui attendent depuis plus de 24 h
  const waiting = ctx.orders.filter(
    (o) =>
      o.paymentStatus === 'awaiting_verification' &&
      o.status !== 'cancelled' &&
      now - new Date(o.createdAt).getTime() > DAY,
  );
  if (waiting.length)
    out.push({
      id: 'payments',
      level: 'critical',
      title: 'Paiements à vérifier depuis plus de 24 h',
      evidence: `${waiting.length} commande${waiting.length > 1 ? 's' : ''} pour ${formatPrice(waiting.reduce((n, o) => n + o.totals.total, 0))}.`,
      advice: 'Ces commandes ne peuvent pas être préparées tant que le paiement n’est pas confirmé.',
      to: '/admin/paiements',
    });

  return out;
}

// ---------------------------------------------------------------- Propositions soumises à validation

export interface ProposedChange {
  productId: string;
  label: string;
  before: Partial<AdminProduct>;
  after: Partial<AdminProduct>;
}

/** Recommandation complète (17.4) : constat, données, période, limites, impact, urgence, risque, bénéfice. */
export interface Proposal {
  id: string;
  title: string;
  reason: string;
  evidence: string[];
  period: string;
  limits: string;
  impact: string;
  urgency: 'haute' | 'moyenne' | 'faible';
  risk: string;
  benefit: string;
  changes: ProposedChange[];
}

/** Modifications proposées (17.5) : rien n'est appliqué sans validation, et tout peut être annulé (17.8). */
export function proposals(ctx: AssistantContext): Proposal[] {
  const out: Proposal[] = [];
  const available = (p: AdminProduct) => p.variants.reduce((n, v) => n + Math.max(0, v.stock - v.reserved), 0);

  const hidden = ctx.products.filter((p) => p.status === 'published' && p.featured && available(p) === 0);
  if (hidden.length)
    out.push({
      id: 'unfeature-out-of-stock',
      title: 'Retirer de l’accueil les produits en rupture',
      reason: 'Un produit mis en avant mais indisponible déçoit le visiteur et occupe une place utile.',
      evidence: hidden.map((p) => `${p.name} : 0 disponible`),
      period: 'Stock disponible à l’instant',
      limits: 'Un réassort prévu sous peu rendrait le retrait inutile ; à remettre en avant dès le retour en stock.',
      impact: `${hidden.length} emplacement${hidden.length > 1 ? 's' : ''} de l’accueil libéré${hidden.length > 1 ? 's' : ''} pour des produits disponibles.`,
      urgency: 'haute',
      risk: 'Faible : la mise en avant se rétablit en un clic.',
      benefit: 'Moins de visiteurs déçus par un produit qu’ils ne peuvent pas acheter.',
      changes: hidden.map((p) => ({
        productId: p.id,
        label: p.name,
        before: { featured: true },
        after: { featured: false },
      })),
    });

  // Priorité : urgence d'abord (17.4)
  return out.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
}

// ---------------------------------------------------------------- Questions à la demande

export interface Answer {
  text: string;
  bullets?: string[];
  link?: { to: string; label: string };
}

export const SUGGESTED_QUESTIONS = [
  'Combien avons-nous vendu cette semaine ?',
  'Quelles sont les meilleures ventes ?',
  'Quels produits sont en rupture ?',
  'Où en sont les paiements à vérifier ?',
  'Quelle est notre marge ce mois-ci ?',
  'Quels quartiers commandent le plus ?',
];

export function answer(question: string, ctx: AssistantContext): Answer {
  // Espaces autour : permet de chercher un mot entier (« ca » pour chiffre d'affaires)
  const q = ` ${normalizeText(question)} `;
  const has = (...words: string[]) => words.some((w) => q.includes(w));
  const days = has('aujourd', 'hier') ? 1 : has('mois') ? 30 : 7;
  const label = days === 1 ? 'hier' : days === 30 ? 'sur 30 jours' : 'sur 7 jours';
  const { start, end } = range(ctx.end, days);
  const period = ordersInPeriod(ctx.orders, start, end);
  const m = orderMetrics(period);

  if (has('marge', 'rentab', 'benefice'))
    return {
      text: `Marge ${label} : ${formatPrice(m.grossMargin)} de marge brute et ${formatPrice(m.marginAfterDelivery)} après livraison, pour ${formatPrice(m.revenue)} de chiffre d’affaires.`,
      bullets: [
        `Taux de marge brute : ${m.revenue ? formatPercent((m.grossMargin / m.revenue) * 100, 0) : '-'}`,
        'La marge après livraison ne compte pas les charges fixes : ce n’est pas un bénéfice net.',
      ],
      link: { to: '/admin/statistiques', label: 'Voir les statistiques' },
    };
  if (has('meilleur', 'top', 'plus vendu', 'populaire'))
    return {
      text: `Meilleures ventes ${label} :`,
      bullets: topProducts(period, 5).map(
        (p) => `${p.name} : ${p.units} vendu${p.units > 1 ? 's' : ''}, ${formatPrice(p.revenue)}`,
      ),
      link: { to: '/admin/produits', label: 'Voir les produits' },
    };
  if (has('rupture', 'stock', 'reappro'))
    return {
      text: (() => {
        const s = stockAlerts(ctx.products);
        return `${s.filter((x) => x.available <= 0).length} variantes en rupture et ${s.filter((x) => x.available > 0).length} sous le seuil d’alerte.`;
      })(),
      bullets: stockAlerts(ctx.products)
        .slice(0, 5)
        .map((s) => `${s.product.name} (${s.variant.label}) : ${Math.max(0, s.available)} disponible`),
      link: { to: '/admin/stock', label: 'Gérer le stock' },
    };
  if (has('paiement', 'verifi', 'mobile money', 'airtel', 'moov', 'rembours'))
    return (() => {
      const toCheck = ctx.orders.filter((o) => o.paymentStatus === 'awaiting_verification' && o.status !== 'cancelled');
      const refunds = ctx.orders.filter((o) => o.paymentStatus === 'refund_due');
      return {
        text: `${toCheck.length} paiement${toCheck.length > 1 ? 's' : ''} Mobile Money à vérifier (${formatPrice(toCheck.reduce((n, o) => n + o.totals.total, 0))}) et ${refunds.length} remboursement${refunds.length > 1 ? 's' : ''} à effectuer.`,
        bullets: toCheck
          .slice(0, 5)
          .map((o) => `${o.number} : ${formatPrice(o.totals.total)}, ${o.customer.recipient}`),
        link: { to: '/admin/paiements', label: 'Ouvrir les paiements' },
      };
    })();
  if (has('annul', 'retour'))
    return {
      text: `${m.cancelled} commande${m.cancelled > 1 ? 's annulées' : ' annulée'} ${label} sur ${period.length}.`,
      link: { to: '/admin/retours', label: 'Voir les annulations et retours' },
    };
  if (has('quartier', 'zone', 'livraison', 'livr'))
    return (() => {
      const zones = new Map<string, { count: number; revenue: number; margin: number }>();
      period
        .filter((o) => o.status !== 'cancelled')
        .forEach((o) => {
          const z = zones.get(o.customer.zoneName) ?? { count: 0, revenue: 0, margin: 0 };
          zones.set(o.customer.zoneName, {
            count: z.count + 1,
            revenue: z.revenue + o.totals.total,
            margin: z.margin + marginAfterDelivery(o),
          });
        });
      return {
        text: `Quartiers qui commandent le plus ${label} :`,
        bullets: [...zones.entries()]
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(([name, z]) => `${name} : ${z.count} commande${z.count > 1 ? 's' : ''}, ${formatPrice(z.revenue)}`),
        link: { to: '/admin/livraisons', label: 'Voir les livraisons' },
      };
    })();
  if (has('vend', 'chiffre', ' ca ', 'commande', 'revenu'))
    return {
      text: `${label[0].toUpperCase()}${label.slice(1)} : ${m.count} commande${m.count > 1 ? 's' : ''} pour ${formatPrice(m.revenue)}, panier moyen ${formatPrice(m.avgBasket)}.`,
      bullets: m.cancelled
        ? [`${m.cancelled} annulation${m.cancelled > 1 ? 's' : ''} non comptée${m.cancelled > 1 ? 's' : ''}.`]
        : undefined,
      link: { to: '/admin/commandes', label: 'Voir les commandes' },
    };
  return {
    text: 'Je réponds aux questions sur les ventes, la marge, le stock, les paiements, les annulations et les quartiers, à partir des données de la boutique.',
    bullets: SUGGESTED_QUESTIONS.slice(0, 3),
  };
}
