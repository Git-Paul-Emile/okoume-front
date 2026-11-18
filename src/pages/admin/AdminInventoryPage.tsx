import { useState } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminProducts } from '@/features/admin/admin.queries';
import type { AdminProduct, AdminVariant } from '@/features/admin/admin.types';
import { matches } from '@/features/admin/admin.utils';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

interface Row {
  id: string;
  product: AdminProduct;
  variant: AdminVariant;
}

type Filter = 'all' | 'todo' | 'gaps';

/**
 * Inventaire physique (7.5) : on saisit les quantités réellement comptées, l'écart avec le stock
 * théorique s'affiche, et la correction n'est appliquée qu'après une confirmation explicite.
 */
export default function AdminInventoryPage() {
  const { data: products, isLoading } = useAdminProducts();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [today] = useState(() => new Date().toISOString());
  const apply = useAdminMutation(
    async (list: Array<{ row: Row; counted: number }>) => {
      // Une variante après l'autre : le serveur trace chaque mouvement et son auteur
      for (const { row, counted } of list)
        await adminApi.adjustStock(row.variant.id, counted, `Inventaire du ${formatDate(today)}`, 'inventaire');
    },
    (list) => `Inventaire validé : ${list.length} correction${list.length > 1 ? 's' : ''} de stock`,
  );

  if (isLoading || !products) return <PageLoader />;

  const all: Row[] = products
    .filter((p) => p.status !== 'archived')
    .flatMap((p) => p.variants.map((v) => ({ id: v.id, product: p, variant: v })));
  const counted = (r: Row) => (/^\d+$/.test(counts[r.id] ?? '') ? Number(counts[r.id]) : null);
  const gap = (r: Row) => {
    const c = counted(r);
    return c === null ? null : c - r.variant.stock;
  };
  const gaps = all.filter((r) => (gap(r) ?? 0) !== 0);
  const done = all.filter((r) => counted(r) !== null);
  const value = gaps.reduce((s, r) => s + (gap(r) ?? 0) * (r.variant.cost ?? 0), 0);
  const tooLow = gaps.filter((r) => (counted(r) ?? 0) < r.variant.reserved);

  const inFilter = (r: Row) =>
    filter === 'todo' ? counted(r) === null : filter === 'gaps' ? (gap(r) ?? 0) !== 0 : true;
  const rows = all.filter((r) => inFilter(r) && matches(query, r.product.name, r.variant.sku, r.variant.label));

  const columns: Column<Row>[] = [
    {
      key: 'item',
      header: 'Article',
      cell: (r) => (
        <>
          <span className="block max-w-[280px] truncate font-semibold">{r.product.name}</span>
          <span className="block text-xs text-ink-muted">
            {r.variant.label} · {r.variant.sku}
          </span>
        </>
      ),
    },
    {
      key: 'theory',
      header: 'Stock théorique',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.variant.stock}</span>,
    },
    {
      key: 'reserved',
      header: 'Réservé',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.variant.reserved}</span>,
    },
    {
      key: 'counted',
      header: 'Quantité comptée',
      align: 'right',
      cell: (r) => (
        <input
          aria-label={`Quantité comptée : ${r.product.name}, ${r.variant.label}`}
          inputMode="numeric"
          className="input ml-auto h-9 w-24 text-right"
          value={counts[r.id] ?? ''}
          onChange={(e) => setCounts((c) => ({ ...c, [r.id]: e.target.value.replace(/\D/g, '') }))}
        />
      ),
    },
    {
      key: 'gap',
      header: 'Écart',
      align: 'right',
      cell: (r) => {
        const g = gap(r);
        if (g === null) return <span className="text-ink-muted">-</span>;
        return (
          <span
            className={cn('font-bold tabular-nums', g < 0 ? 'text-danger' : g > 0 ? 'text-forest' : 'text-ink-muted')}
          >
            {g > 0 ? `+${g}` : g}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          <Button disabled={!gaps.length} onClick={() => setConfirming(true)}>
            Valider les corrections{gaps.length ? ` (${gaps.length})` : ''}
          </Button>
        }
      >
        Comptez les articles en rayon et saisissez les quantités. Rien n’est modifié tant que vous n’avez pas validé ;
        chaque correction est ensuite tracée dans les mouvements de stock.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Variantes comptées', value: `${done.length} / ${all.length}` },
          { label: 'Écarts constatés', value: gaps.length },
          { label: 'Unités en plus ou en moins', value: gaps.reduce((s, r) => s + (gap(r) ?? 0), 0) },
          { label: 'Valeur de l’écart (achat)', value: formatPrice(value) },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Filtre"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout', count: all.length },
            { value: 'todo', label: 'À compter', count: all.length - done.length },
            { value: 'gaps', label: 'Écarts', count: gaps.length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Produit, référence" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Inventaire"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pageSize={25}
        empty="Rien à afficher dans cette liste."
      />

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          title="Valider l’inventaire"
          description="Le stock de ces variantes sera remplacé par la quantité comptée."
          className="max-w-xl"
        >
          <ul className="max-h-[45vh] divide-y divide-sage overflow-y-auto text-sm">
            {gaps.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.product.name}</span>
                  <span className="block text-xs text-ink-muted">{r.variant.label}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {r.variant.stock} → <strong>{counted(r)}</strong>
                </span>
              </li>
            ))}
          </ul>
          {tooLow.length > 0 && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {tooLow.length} variante{tooLow.length > 1 ? 's' : ''} : la quantité comptée est inférieure aux unités
              réservées par des commandes en cours. Vérifiez avant de valider.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button
              loading={apply.isPending}
              disabled={tooLow.length > 0}
              onClick={() =>
                apply.mutate(
                  gaps.map((row) => ({ row, counted: counted(row)! })),
                  {
                    onSuccess: () => {
                      setConfirming(false);
                      setCounts({});
                    },
                  },
                )
              }
            >
              Appliquer {gaps.length} correction{gaps.length > 1 ? 's' : ''}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
