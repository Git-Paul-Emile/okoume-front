import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import type { AdminOrder, AdminProduct } from '../admin.types';
import { formatPercent } from '../chart.utils';
import {
  activeCustomers,
  deliveryIssues,
  marginByProduct,
  newProducts,
  productInterest,
  repeatPurchase,
  type ProductViewEntry,
} from '../stats.rules';
import { AdminTable } from './AdminTable';
import { StatRow } from './Toolbar';

/** Indicateurs du cahier des charges (18.1) : catalogue, clients, livraisons et marges par produit. */
export function StatsInsights({
  orders,
  products,
  views,
  start,
  end,
  prevStart,
  now,
}: {
  orders: AdminOrder[];
  products: AdminProduct[];
  views: ProductViewEntry[];
  start: Date;
  end: Date;
  prevStart: Date;
  now: number;
}) {
  const interest = productInterest(views, orders, products, start, end);
  const fresh = newProducts(products, orders, start, end);
  const customers = activeCustomers(orders, start, end);
  const repeat = repeatPurchase(orders.filter((o) => new Date(o.createdAt) < end));
  const delivery = deliveryIssues(orders, start, end, now);
  const margins = marginByProduct(orders, start, end, prevStart);

  return (
    <>
      <h2 className="mt-8 mb-1 text-lg">Produits les plus consultés</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Fiches ouvertes et clics depuis les listes, mesurés avec le consentement des visiteurs.
      </p>
      <AdminTable
        caption="Produits les plus consultés"
        rows={interest}
        rowKey={(r) => r.id}
        empty="Aucune consultation mesurée sur la période."
        columns={[
          { key: 'name', header: 'Produit', cell: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'views', header: 'Consultations', align: 'right', cell: (r) => r.views },
          { key: 'clicks', header: 'Clics', align: 'right', cell: (r) => r.clicks },
          { key: 'units', header: 'Vendus', align: 'right', cell: (r) => r.units },
          {
            key: 'conv',
            header: 'Ventes pour 100 vues',
            align: 'right',
            cell: (r) => (r.views ? formatPercent(r.conversion * 100, 1) : '-'),
          },
        ]}
      />

      <h2 className="mt-8 mb-3 text-lg">Nouveaux produits</h2>
      <AdminTable
        caption="Nouveaux produits"
        rows={fresh}
        rowKey={(r) => r.id}
        empty="Aucun produit ajouté sur la période."
        columns={[
          { key: 'name', header: 'Produit', cell: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'at', header: 'Ajouté le', cell: (r) => formatDate(r.createdAt) },
          { key: 'units', header: 'Vendus', align: 'right', cell: (r) => r.units },
          { key: 'revenue', header: 'Chiffre d’affaires', align: 'right', cell: (r) => formatPrice(r.revenue) },
        ]}
      />

      <h2 className="mt-8 mb-3 text-lg">Clients et réachat</h2>
      <StatRow
        items={[
          { label: 'Clients ayant commandé', value: repeat.customers },
          { label: 'Clients revenus commander', value: formatPercent(repeat.repeatRate * 100, 0) },
          { label: 'Commandes par client', value: repeat.ordersPerCustomer.toFixed(1).replace('.', ',') },
          {
            label: 'Délai moyen entre deux commandes',
            value: repeat.averageGapDays === null ? '-' : `${repeat.averageGapDays} jours`,
          },
        ]}
      />
      <AdminTable
        caption="Clients les plus actifs"
        rows={customers}
        rowKey={(r) => r.key}
        empty="Aucune commande sur la période."
        columns={[
          { key: 'name', header: 'Client', cell: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'orders', header: 'Commandes', align: 'right', cell: (r) => r.orders },
          { key: 'revenue', header: 'Montant', align: 'right', cell: (r) => formatPrice(r.revenue) },
          { key: 'last', header: 'Dernière commande', cell: (r) => formatDate(r.last) },
        ]}
      />

      <h2 className="mt-8 mb-1 text-lg">Retards et échecs de livraison</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Retard : plus de 48 h entre la remise au livreur et la livraison. {delivery.failures.length} échec(s) de
        livraison sur la période
        {delivery.failureReasons.length > 0 &&
          ` : ${delivery.failureReasons.map(([reason, n]) => `${reason} (${n})`).join(', ')}`}
        .
      </p>
      <AdminTable
        caption="Livraisons en retard"
        rows={delivery.late}
        rowKey={(r) => r.id}
        empty="Aucune livraison en retard sur la période."
        columns={[
          { key: 'number', header: 'Commande', cell: (r) => <span className="font-semibold">{r.number}</span> },
          { key: 'zone', header: 'Quartier', cell: (r) => r.zone },
          { key: 'since', header: 'Remise au livreur', cell: (r) => formatDateTime(r.since) },
          {
            key: 'state',
            header: 'État',
            cell: (r) =>
              r.delivered ? 'Livrée en retard' : <span className="font-semibold text-danger">Toujours en cours</span>,
          },
        ]}
      />

      <h2 className="mt-8 mb-1 text-lg">Marge par produit</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Marge brute par variante (prix de vente moins coût d’achat), comparée à la période précédente de même durée.
      </p>
      <AdminTable
        caption="Marge par produit"
        rows={margins}
        rowKey={(r) => r.key}
        empty="Aucune vente sur la période."
        columns={[
          { key: 'name', header: 'Produit et variante', cell: (r) => <span className="font-semibold">{r.name}</span> },
          { key: 'units', header: 'Vendus', align: 'right', cell: (r) => r.units },
          { key: 'margin', header: 'Marge brute', align: 'right', cell: (r) => formatPrice(r.margin) },
          { key: 'rate', header: 'Taux', align: 'right', cell: (r) => formatPercent(r.rate * 100, 0) },
          {
            key: 'change',
            header: 'Évolution du taux',
            align: 'right',
            cell: (r) =>
              r.change === null ? (
                <span className="text-ink-muted">Nouveau</span>
              ) : (
                <span className={r.change >= 0 ? 'text-forest' : 'text-danger'}>
                  {r.change >= 0 ? '+' : '-'}
                  {Math.abs(r.change).toFixed(1).replace('.', ',')} pt
                </span>
              ),
          },
        ]}
      />
    </>
  );
}
