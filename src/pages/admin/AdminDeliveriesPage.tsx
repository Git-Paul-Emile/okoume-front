import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import type { DeliveryZone, ZoneRequest } from '@/features/delivery/delivery.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminOrders, useAdminZones, useZoneRequests } from '@/features/admin/admin.queries';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import type { AdminOrder } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { OrderDrawer } from '@/features/admin/components/OrderDrawer';
import { OrderStatusBadge } from '@/features/admin/components/StatusBadges';
import { Switch } from '@/components/ui/Switch';
import { PageIntro, StatRow } from '@/features/admin/components/Toolbar';
import { useSelection } from '@/features/admin/useSelection';
import { formatDateTime } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

const ACTIVE = ['ready', 'courier_assigned', 'shipping'];

export default function AdminDeliveriesPage() {
  const { data: orders, isLoading } = useAdminOrders();
  const { data: zones } = useAdminZones();
  const { selected, open, close } = useSelection(orders);
  const [editing, setEditing] = useState<DeliveryZone | 'new' | null>(null);
  const [fromRequest, setFromRequest] = useState<ZoneRequest[]>([]);
  const [declining, setDeclining] = useState<ZoneRequest[] | null>(null);
  const { data: requests = [] } = useZoneRequests();
  const decline = useAdminMutation(
    async ({ list, note }: { list: ZoneRequest[]; note: string }) => {
      for (const r of list) await adminApi.decideZoneRequest(r.id, 'declined', note);
    },
    (v) => `Demande de ${v.list[0].neighbourhood} refusée (${v.note})`,
  );
  const toggle = useAdminMutation(
    (z: DeliveryZone) => adminApi.updateDeliveryZone(z.id, { available: !z.available }),
    (z) => (z.available ? `${z.name} : livraison suspendue` : `${z.name} : livraison rouverte`),
  );

  if (isLoading || !orders || !zones) return <PageLoader />;

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const delivered = orders.filter((o) => o.status === 'delivered' && o.deliveryCost);
  const billed = delivered.reduce((s, o) => s + o.totals.deliveryFee - o.totals.deliveryDiscount, 0);
  const cost = delivered.reduce((s, o) => s + (o.deliveryCost ?? 0), 0);

  const runs: Column<AdminOrder>[] = [
    {
      key: 'number',
      header: 'Commande',
      cell: (o) => (
        <>
          <span className="block font-semibold">{o.number}</span>
          <span className="block text-xs text-ink-muted">{formatDateTime(o.createdAt)}</span>
        </>
      ),
    },
    {
      key: 'address',
      header: 'Adresse',
      cell: (o) => (
        <>
          <span className="block font-medium">{o.customer.zoneName}</span>
          <span className="line-clamp-1 block max-w-xs text-xs text-ink-muted">{o.customer.landmark}</span>
        </>
      ),
    },
    { key: 'phone', header: 'Téléphone', cell: (o) => <span className="whitespace-nowrap">{o.customer.phone}</span> },
    { key: 'courier', header: 'Livreur', cell: (o) => o.courier ?? <span className="text-ink-muted">À assigner</span> },
    {
      key: 'cash',
      header: 'À encaisser',
      align: 'right',
      cell: (o) => (o.paymentStatus === 'paid' ? 'Payé' : formatPrice(o.totals.total)),
    },
    { key: 'status', header: 'Statut', cell: (o) => <OrderStatusBadge status={o.status} /> },
  ];

  const zoneColumns: Column<DeliveryZone>[] = [
    {
      key: 'name',
      header: 'Quartier',
      cell: (z) => (
        <>
          <span className="block font-semibold">{z.name}</span>
          <span className="block text-xs text-ink-muted">{z.city}</span>
        </>
      ),
    },
    { key: 'fee', header: 'Frais client', align: 'right', cell: (z) => formatPrice(z.fee) },
    {
      key: 'cost',
      header: 'Coût habituel',
      align: 'right',
      cell: (z) =>
        z.courierCost !== undefined ? (
          <span className={z.courierCost > z.fee ? 'font-semibold text-danger' : undefined}>
            {formatPrice(z.courierCost)}
          </span>
        ) : (
          <span className="text-ink-muted">-</span>
        ),
    },
    { key: 'eta', header: 'Délai', cell: (z) => z.eta },
    { key: 'days', header: 'Jours et horaires', cell: (z) => <span className="text-ink-soft">{z.days}</span> },
    {
      key: 'available',
      header: 'Desservi',
      align: 'center',
      cell: (z) => <Switch checked={z.available} onChange={() => toggle.mutate(z)} label={`Livraison à ${z.name}`} />,
    },
  ];

  return (
    <>
      <PageIntro>
        Courses à organiser et tarifs par quartier. Les frais s’appliquent dès la prochaine commande.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Livreur à assigner', value: orders.filter((o) => o.status === 'ready').length },
          {
            label: 'En cours de livraison',
            value: orders.filter((o) => o.status !== 'ready' && ACTIVE.includes(o.status)).length,
          },
          { label: 'Frais facturés (livrées)', value: formatPrice(billed) },
          { label: 'Coût réel des livreurs', value: formatPrice(cost) },
        ]}
      />

      <h2 className="mb-3 text-lg">Courses en cours</h2>
      <AdminTable
        caption="Courses en cours"
        columns={runs}
        rows={active}
        rowKey={(o) => o.id}
        onRowClick={open}
        empty="Aucune course en cours."
      />

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Quartiers desservis</h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Ajouter un quartier
        </Button>
      </div>
      <AdminTable
        caption="Quartiers et tarifs de livraison"
        columns={zoneColumns}
        rows={zones}
        rowKey={(z) => z.id}
        onRowClick={setEditing}
        pageSize={20}
      />

      <ZoneRequests
        requests={requests}
        onAdd={(list) => {
          setFromRequest(list);
          setEditing('new');
        }}
        onDecline={setDeclining}
      />

      <OrderDrawer order={selected} onClose={close} />
      {editing && (
        <ZoneDialog
          zone={editing === 'new' ? null : editing}
          zones={zones}
          requests={editing === 'new' ? fromRequest : []}
          onClose={() => {
            setEditing(null);
            setFromRequest([]);
          }}
        />
      )}
      <ReasonDialog
        open={!!declining}
        onClose={() => setDeclining(null)}
        title={`Refuser la livraison à ${declining?.[0]?.neighbourhood ?? ''}`}
        description="Le motif est conservé ; prévenez les clients concernés avec leurs coordonnées."
        confirmLabel="Refuser"
        danger
        loading={decline.isPending}
        onConfirm={(note) =>
          declining && decline.mutate({ list: declining, note }, { onSuccess: () => setDeclining(null) })
        }
      />
    </>
  );
}

/** Demandes de quartiers non desservis, regroupées par quartier (9.1). */
function ZoneRequests({
  requests,
  onAdd,
  onDecline,
}: {
  requests: ZoneRequest[];
  onAdd: (list: ZoneRequest[]) => void;
  onDecline: (list: ZoneRequest[]) => void;
}) {
  const open = requests.filter((r) => r.status === 'new');
  const groups = new Map<string, ZoneRequest[]>();
  open.forEach((r) => {
    const key = `${r.neighbourhood.trim().toLowerCase()}|${r.city.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length);

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-lg">Quartiers demandés par les clients</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Clients dont le quartier n’est pas dans la liste. Ajoutez la zone ou refusez avec un motif.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucune demande en attente.</p>
      ) : (
        <ul className="divide-y divide-sage rounded-xl border border-sage bg-white text-sm">
          {sorted.map((list) => (
            <li key={list[0].id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">
                  {list[0].neighbourhood} ({list[0].city}) · {list.length} demande{list.length > 1 ? 's' : ''}
                </span>
                <span className="block text-xs text-ink-muted">
                  {list.map((r) => `${r.contact}, le ${formatDateTime(r.createdAt)}`).join(' · ')}
                </span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" onClick={() => onAdd(list)}>
                  Ajouter la zone
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDecline(list)}>
                  Refuser
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ZoneDialog({
  zone,
  zones,
  requests,
  onClose,
}: {
  zone: DeliveryZone | null;
  zones: DeliveryZone[];
  requests: ZoneRequest[];
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: zone?.name ?? requests[0]?.neighbourhood ?? '',
    city: zone?.city ?? requests[0]?.city ?? 'Libreville',
    fee: String(zone?.fee ?? ''),
    courierCost: String(zone?.courierCost ?? ''),
    eta: zone?.eta ?? '24 à 48 h',
    days: zone?.days ?? 'Du lundi au samedi, de 9 h à 18 h',
  });
  const [error, setError] = useState('');
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const save = useAdminMutation(
    async (patch: Partial<DeliveryZone>) => {
      if (zone) return adminApi.updateDeliveryZone(zone.id, patch);
      const created = await adminApi.createDeliveryZone({ available: true, ...patch } as Omit<DeliveryZone, 'id'>);
      for (const r of requests) await adminApi.decideZoneRequest(r.id, 'added', `Zone ${created.name} ouverte`);
      return created;
    },
    zone ? `Tarif de ${zone.name} enregistré` : `Quartier ${values.name.trim()} ajouté`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const fee = Number(values.fee);
    const courierCost = values.courierCost.trim() === '' ? undefined : Number(values.courierCost);
    const name = values.name.trim();
    if (name.length < 2) return setError('Indiquez le nom du quartier.');
    if (zones.some((z) => z.id !== zone?.id && z.name.toLowerCase() === name.toLowerCase()))
      return setError('Ce quartier existe déjà.');
    if (values.fee.trim() === '' || !Number.isInteger(fee) || fee < 0)
      return setError('Frais client : un montant en FCFA, sans décimales.');
    if (courierCost !== undefined && (!Number.isInteger(courierCost) || courierCost < 0))
      return setError('Coût habituel : un montant en FCFA, sans décimales.');
    setError('');
    save.mutate(
      { name, city: values.city.trim(), fee, courierCost, eta: values.eta.trim(), days: values.days.trim() },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open onClose={onClose} title={zone ? `Livraison : ${zone.name}` : 'Ajouter un quartier'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {requests.length > 0 && (
          <p className="text-sm text-ink-soft">
            {requests.length} client{requests.length > 1 ? 's ont' : ' a'} demandé ce quartier : leurs demandes seront
            marquées traitées.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Quartier" value={values.name} onChange={set('name')} disabled={!!zone} />
          <TextField label="Ville" value={values.city} onChange={set('city')} disabled={!!zone} />
          <TextField label="Frais client (FCFA)" inputMode="numeric" value={values.fee} onChange={set('fee')} />
          <TextField
            label="Coût habituel d’une course (FCFA)"
            inputMode="numeric"
            optional
            value={values.courierCost}
            onChange={set('courierCost')}
          />
        </div>
        <TextField label="Délai annoncé" value={values.eta} onChange={set('eta')} />
        <TextField label="Jours et horaires" value={values.days} onChange={set('days')} />
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
            {zone ? 'Enregistrer' : 'Ajouter le quartier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
