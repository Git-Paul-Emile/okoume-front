import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminProducts, useStockMovements } from '@/features/admin/admin.queries';
import type { AdminProduct, AdminVariant, StockMovementType } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, SearchInput, Segmented, StatRow, Toolbar } from '@/features/admin/components/Toolbar';
import { matches } from '@/features/admin/admin.utils';
import { canWriteOff } from '@/features/admin/orders.actions';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

type Filter = 'alert' | 'out' | 'all';
interface Row {
  id: string;
  product: AdminProduct;
  variant: AdminVariant;
  available: number;
}

const movementLabel: Record<StockMovementType, string> = {
  reception: 'Réception',
  ajustement: 'Ajustement ou inventaire',
  commande: 'Sortie commande',
  annulation: 'Retour annulation',
  retour: 'Retour client',
  non_vendable: 'Non revendable (stock séparé)',
  mise_au_rebut: 'Sortie définitive',
};

export default function AdminStockPage() {
  const { data: products, isLoading } = useAdminProducts();
  const { data: movements = [] } = useStockMovements();
  const [filter, setFilter] = useState<Filter>('alert');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);

  if (isLoading || !products) return <PageLoader />;

  const all: Row[] = products
    .filter((p) => p.status === 'published')
    .flatMap((p) => p.variants.map((v) => ({ id: v.id, product: p, variant: v, available: v.stock - v.reserved })))
    .sort((a, b) => a.available - b.available);
  const inFilter = (r: Row, f: Filter) =>
    f === 'all' || (f === 'out' ? r.available <= 0 : r.available <= r.variant.lowStockThreshold);
  const rows = all.filter((r) => inFilter(r, filter) && matches(query, r.product.name, r.variant.sku, r.variant.label));
  const value = all.reduce((s, r) => s + r.variant.stock * (r.variant.cost ?? 0), 0);

  const columns: Column<Row>[] = [
    {
      key: 'product',
      header: 'Article',
      cell: (r) => (
        <span className="flex items-center gap-3">
          <img
            src={r.variant.image ?? r.product.thumbnail}
            alt=""
            className="size-10 shrink-0 rounded-md border border-sage bg-white object-contain p-0.5"
          />
          <span className="min-w-0">
            <span className="block max-w-[260px] truncate font-semibold">{r.product.name}</span>
            <span className="block text-xs text-ink-muted">
              {r.variant.label} · {r.variant.sku}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'En stock',
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
      key: 'available',
      header: 'Disponible',
      align: 'right',
      cell: (r) => <span className="font-bold tabular-nums">{Math.max(0, r.available)}</span>,
    },
    {
      key: 'threshold',
      header: 'Seuil',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.variant.lowStockThreshold}</span>,
    },
    {
      key: 'state',
      header: 'État',
      cell: (r) =>
        r.available <= 0 ? (
          <StateBadge tone="danger">Rupture</StateBadge>
        ) : r.available <= r.variant.lowStockThreshold ? (
          <StateBadge tone="warning">Stock faible</StateBadge>
        ) : (
          <StateBadge tone="forest">Disponible</StateBadge>
        ),
    },
  ];

  return (
    <>
      <PageIntro>
        Le stock disponible tient compte des quantités réservées par les commandes en cours. Chaque ajustement est tracé
        avec son motif.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Variantes en rupture', value: all.filter((r) => inFilter(r, 'out')).length },
          { label: 'Sous le seuil d’alerte', value: all.filter((r) => r.available > 0 && inFilter(r, 'alert')).length },
          { label: 'Unités réservées', value: all.reduce((s, r) => s + r.variant.reserved, 0) },
          { label: 'Valeur du stock (achat)', value: formatPrice(value) },
        ]}
      />
      <Toolbar>
        <Segmented
          label="Filtre"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alert', label: 'À réapprovisionner', count: all.filter((r) => inFilter(r, 'alert')).length },
            { value: 'out', label: 'Ruptures', count: all.filter((r) => inFilter(r, 'out')).length },
            { value: 'all', label: 'Tout le stock', count: all.length },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Produit, référence" />
      </Toolbar>
      <AdminTable
        key={filter + query}
        caption="Stock par variante"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={setEditing}
        empty="Aucune variante dans cette liste."
      />

      <h2 className="mt-8 mb-3 text-lg">Derniers mouvements</h2>
      <AdminTable
        caption="Mouvements de stock"
        rows={movements}
        rowKey={(m) => m.id}
        pageSize={10}
        empty="Aucun mouvement pour l’instant."
        columns={[
          { key: 'at', header: 'Date', cell: (m) => <span className="whitespace-nowrap">{formatDateTime(m.at)}</span> },
          { key: 'label', header: 'Article', cell: (m) => m.label },
          { key: 'type', header: 'Type', cell: (m) => movementLabel[m.type ?? 'ajustement'] },
          {
            key: 'qty',
            header: 'Avant → après',
            align: 'right',
            cell: (m) =>
              m.before !== undefined ? (
                <span className="whitespace-nowrap tabular-nums">
                  {m.before} → {m.after}
                </span>
              ) : (
                '-'
              ),
          },
          {
            key: 'delta',
            header: 'Quantité',
            align: 'right',
            cell: (m) => (
              <span className={m.delta < 0 ? 'font-semibold text-danger' : 'font-semibold text-forest'}>
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
            ),
          },
          { key: 'reason', header: 'Motif', cell: (m) => m.reason },
          { key: 'by', header: 'Par', cell: (m) => m.by },
        ]}
      />
      <UnsellableStock products={products} />
      {editing && <AdjustDialog key={editing.id} row={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Stock non revendable issu des retours (14.3) : hors vente, sortie définitive par l'administrateur principal. */
function UnsellableStock({ products }: { products: AdminProduct[] }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const [target, setTarget] = useState<{ product: AdminProduct; variant: AdminVariant } | null>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const writeOff = useAdminMutation(
    ({ product, variant, n }: { product: AdminProduct; variant: AdminVariant; n: number }) =>
      adminApi.writeOffUnsellable(product, variant.id, n, reason.trim()),
    (v) => `Sortie définitive : ${v.n} × ${v.product.name} · ${v.variant.label} (${reason.trim()})`,
  );
  const rows = products.flatMap((p) =>
    p.variants.filter((v) => (v.unsellable ?? 0) > 0).map((v) => ({ product: p, variant: v })),
  );
  if (!rows.length) return null;

  const submit = () => {
    if (!target) return;
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0 || n > (target.variant.unsellable ?? 0))
      return setError(`Quantité entre 1 et ${target.variant.unsellable}.`);
    if (reason.trim().length < 5)
      return setError('Indiquez le motif de la sortie (destruction, don, retour fournisseur…).');
    writeOff.mutate({ ...target, n }, { onSuccess: () => setTarget(null) });
  };

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-lg">Stock non revendable</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Articles retournés jugés non revendables : jamais proposés à la vente. La sortie définitive est décidée par
        l’administrateur principal.
      </p>
      <ul className="divide-y divide-sage rounded-xl border border-sage bg-white text-sm">
        {rows.map(({ product, variant }) => (
          <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block font-semibold">
                {product.name} · {variant.label}
              </span>
              <span className="block text-xs text-ink-muted">
                {variant.unsellable} article(s) · valeur de référence{' '}
                {formatPrice((variant.cost ?? 0) * (variant.unsellable ?? 0))}
              </span>
            </span>
            {canWriteOff(admin) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTarget({ product, variant });
                  setQty(String(variant.unsellable));
                  setReason('');
                  setError('');
                }}
              >
                Sortir définitivement
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Sortie définitive du stock"
        description={
          target
            ? `${target.product.name} · ${target.variant.label} : ${target.variant.unsellable} non revendable(s).`
            : ''
        }
      >
        <div className="space-y-4">
          <TextField label="Quantité" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          <TextAreaField label="Motif" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {target && (
            <p className="text-sm text-ink-soft">
              Valeur de référence : {formatPrice((target.variant.cost ?? 0) * (Number(qty) || 0))}
            </p>
          )}
          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Annuler
            </Button>
            <Button variant="danger" loading={writeOff.isPending} onClick={submit}>
              Sortir du stock
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function AdjustDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const [quantity, setQuantity] = useState(String(row.variant.stock));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = useAdminMutation(
    (v: { quantity: number; reason: string }) => adminApi.adjustStock(row.variant.id, v.quantity, v.reason),
    'Stock mis à jour',
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    if (!Number.isInteger(q) || q < row.variant.reserved)
      return setError(`Quantité entière, au moins égale aux ${row.variant.reserved} unités réservées.`);
    if (reason.trim().length < 3) return setError('Indiquez le motif : réception, inventaire, casse…');
    save.mutate({ quantity: q, reason: reason.trim() }, { onSuccess: onClose });
  };

  return (
    <Modal open onClose={onClose} title="Ajuster le stock" description={`${row.product.name} · ${row.variant.label}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField
          label="Quantité en stock"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          hint={`Actuellement ${row.variant.stock}, dont ${row.variant.reserved} réservées.`}
        />
        <TextAreaField label="Motif" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
