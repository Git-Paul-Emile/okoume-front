import type { AdminOrder, AdminProduct } from './admin.types';

/**
 * Indicateurs complémentaires du tableau de bord (18.1) : consultations des produits, nouveautés,
 * clients actifs et réachat, retards et échecs de livraison, évolution des marges par produit.
 */
const DAY = 86_400_000;
const t = (iso: string) => new Date(iso).getTime();
const inRange = (iso: string, start: Date, end: Date) => t(iso) >= start.getTime() && t(iso) < end.getTime();
const valid = (o: AdminOrder) => o.status !== 'cancelled';

/** Consultation d'une fiche (« view ») ou clic sur une carte produit (« click »), sans donnée personnelle. */
export interface ProductViewEntry {
  id: string;
  productId: string;
  kind: 'view' | 'click';
  at: string;
}

export function productInterest(
  views: ProductViewEntry[],
  orders: AdminOrder[],
  products: AdminProduct[],
  start: Date,
  end: Date,
  limit = 10,
) {
  const rows = new Map<string, { views: number; clicks: number; units: number }>();
  const row = (id: string) => rows.get(id) ?? rows.set(id, { views: 0, clicks: 0, units: 0 }).get(id)!;
  views
    .filter((v) => inRange(v.at, start, end))
    .forEach((v) => (v.kind === 'view' ? row(v.productId).views++ : row(v.productId).clicks++));
  orders
    .filter((o) => valid(o) && inRange(o.createdAt, start, end))
    .forEach((o) => o.items.forEach((i) => rows.has(i.productId) && (row(i.productId).units += i.quantity)));
  const name = new Map(products.map((p) => [p.id, p.name]));
  return [...rows.entries()]
    .map(([id, r]) => ({
      id,
      name: name.get(id) ?? 'Produit supprimé',
      ...r,
      conversion: r.views ? r.units / r.views : 0,
    }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks)
    .slice(0, limit);
}

/** Produits ajoutés au catalogue sur la période, avec leurs premières ventes. */
export function newProducts(products: AdminProduct[], orders: AdminOrder[], start: Date, end: Date) {
  return products
    .filter((p) => p.createdAt && inRange(p.createdAt, start, end))
    .map((p) => {
      const sold = orders
        .filter(valid)
        .flatMap((o) => o.items)
        .filter((i) => i.productId === p.id);
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        status: p.status,
        units: sold.reduce((s, i) => s + i.quantity, 0),
        revenue: sold.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Clients les plus actifs sur la période ; identifiés par leur compte, ou leur téléphone pour les invités. */
export function activeCustomers(orders: AdminOrder[], start: Date, end: Date, limit = 10) {
  const map = new Map<string, { name: string; orders: number; revenue: number; last: string }>();
  orders
    .filter((o) => valid(o) && inRange(o.createdAt, start, end))
    .forEach((o) => {
      const key = o.userId ?? `tel:${o.customer.phone.replace(/\D/g, '').slice(-8)}`;
      const c = map.get(key) ?? { name: o.customer.recipient, orders: 0, revenue: 0, last: o.createdAt };
      c.orders += 1;
      c.revenue += o.totals.total;
      if (o.createdAt > c.last) c.last = o.createdAt;
      map.set(key, c);
    });
  return [...map.entries()]
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)
    .slice(0, limit);
}

/** Réachat : part des clients avec au moins deux commandes, et délai moyen entre deux commandes. */
export function repeatPurchase(orders: AdminOrder[]) {
  const byCustomer = new Map<string, number[]>();
  orders.filter(valid).forEach((o) => {
    const key = o.userId ?? `tel:${o.customer.phone.replace(/\D/g, '').slice(-8)}`;
    byCustomer.set(key, [...(byCustomer.get(key) ?? []), t(o.createdAt)]);
  });
  const lists = [...byCustomer.values()].map((l) => l.sort((a, b) => a - b));
  const repeat = lists.filter((l) => l.length >= 2);
  const gaps = repeat.flatMap((l) => l.slice(1).map((x, i) => x - l[i]));
  return {
    customers: lists.length,
    repeatRate: lists.length ? repeat.length / lists.length : 0,
    averageGapDays: gaps.length ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length / DAY) : null,
    ordersPerCustomer: lists.length ? lists.reduce((s, l) => s + l.length, 0) / lists.length : 0,
  };
}

const statusAt = (o: AdminOrder, status: string) => o.history.find((h) => h.status === status)?.at;

/**
 * Retards de livraison : commande remise au livreur depuis plus de `hours` heures sans être livrée,
 * ou livrée plus de `hours` heures après son départ. Échecs : livraisons échouées consignées.
 */
export function deliveryIssues(orders: AdminOrder[], start: Date, end: Date, now: number, hours = 48) {
  const limit = hours * 3_600_000;
  const late: Array<{ id: string; number: string; zone: string; since: string; delivered: boolean }> = [];
  const failures: Array<{ number: string; at: string; reason: string; decision: string }> = [];
  for (const o of orders) {
    const left = statusAt(o, 'courier_assigned') ?? statusAt(o, 'shipping');
    if (left && inRange(left, start, end)) {
      const delivered = statusAt(o, 'delivered');
      const duration = (delivered ? t(delivered) : now) - t(left);
      if (o.status !== 'cancelled' && duration > limit)
        late.push({ id: o.id, number: o.number, zone: o.customer.zoneName, since: left, delivered: !!delivered });
    }
    (o.deliveryFailures ?? [])
      .filter((f) => inRange(f.at, start, end))
      .forEach((f) => failures.push({ number: o.number, at: f.at, reason: f.reason, decision: f.decision }));
  }
  const reasons = new Map<string, number>();
  failures.forEach((f) => reasons.set(f.reason, (reasons.get(f.reason) ?? 0) + 1));
  return {
    late: late.sort((a, b) => a.since.localeCompare(b.since)),
    failures,
    failureReasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Marge brute par produit et variante, comparée à la période précédente (même durée). */
export function marginByProduct(orders: AdminOrder[], start: Date, end: Date, prevStart: Date, limit = 15) {
  const acc = (from: Date, to: Date) => {
    const map = new Map<string, { name: string; revenue: number; margin: number; units: number }>();
    orders
      .filter((o) => valid(o) && inRange(o.createdAt, from, to))
      .forEach((o) =>
        o.items.forEach((i) => {
          const key = `${i.productId}:${i.variantId}`;
          const m = map.get(key) ?? { name: `${i.name} · ${i.variantLabel}`, revenue: 0, margin: 0, units: 0 };
          m.revenue += i.unitPrice * i.quantity;
          // Coût inconnu : marge nulle plutôt que surestimée
          m.margin += (i.unitPrice - (i.unitCost ?? i.unitPrice)) * i.quantity;
          m.units += i.quantity;
          map.set(key, m);
        }),
      );
    return map;
  };
  const now = acc(start, end);
  const before = acc(prevStart, start);
  return [...now.entries()]
    .map(([key, m]) => {
      const p = before.get(key);
      const rate = m.revenue ? m.margin / m.revenue : 0;
      const prevRate = p?.revenue ? p.margin / p.revenue : null;
      return { key, ...m, rate, prevRate, change: prevRate === null ? null : (rate - prevRate) * 100 };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, limit);
}
