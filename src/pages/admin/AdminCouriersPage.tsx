import { Phone, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminOrders, useAdminZones, useCouriers } from '@/features/admin/admin.queries';
import type { Courier } from '@/features/admin/admin.types';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, StatRow } from '@/features/admin/components/Toolbar';
import { gabonPhone } from '@/features/auth/auth.schemas';
import { cn } from '@/utils/text';

const VEHICLES: Courier['vehicle'][] = ['Moto', 'Voiture', 'Vélo', 'À pied'];
const fullName = (c: Courier) => `${c.firstName} ${c.lastName}`;

/** Répertoire des livreurs (9.3) : contacts et quartiers couverts. Les livreurs n'ont pas de compte. */
export default function AdminCouriersPage() {
  const { data: couriers, isLoading } = useCouriers();
  const { data: zones = [] } = useAdminZones();
  const { data: orders = [] } = useAdminOrders();
  const [editing, setEditing] = useState<Courier | 'new' | null>(null);
  const toggle = useAdminMutation(
    (c: Courier) => adminApi.saveCourier({ ...c, active: !c.active }),
    (c) => (c.active ? `${fullName(c)} marqué indisponible` : `${fullName(c)} de nouveau disponible`),
  );

  if (isLoading || !couriers) return <PageLoader />;

  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const runs = (c: Courier, statuses: string[]) =>
    orders.filter((o) => (o.courierId === c.id || o.courier === fullName(c)) && statuses.includes(o.status)).length;
  const uncovered = zones.filter((z) => z.available && !couriers.some((c) => c.active && c.zoneIds.includes(z.id)));

  const columns: Column<Courier>[] = [
    {
      key: 'name',
      header: 'Livreur',
      cell: (c) => (
        <>
          <span className="block font-semibold">{fullName(c)}</span>
          <a
            href={`tel:${c.phone.replace(/\s/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-forest hover:underline"
          >
            <Phone className="size-3" aria-hidden="true" />
            {c.phone}
          </a>
        </>
      ),
    },
    { key: 'vehicle', header: 'Véhicule', cell: (c) => c.vehicle },
    {
      key: 'zones',
      header: 'Quartiers couverts',
      cell: (c) => (
        <span className="line-clamp-2 max-w-xs text-ink-soft">
          {c.zoneIds.length === zones.length
            ? 'Tous les quartiers'
            : c.zoneIds
                .map((id) => zoneName.get(id))
                .filter(Boolean)
                .join(', ') || 'Aucun'}
        </span>
      ),
    },
    { key: 'current', header: 'En cours', align: 'right', cell: (c) => runs(c, ['courier_assigned', 'shipping']) },
    { key: 'done', header: 'Livrées', align: 'right', cell: (c) => runs(c, ['delivered']) },
    {
      key: 'active',
      header: 'Disponible',
      align: 'center',
      cell: (c) => <Switch checked={c.active} onChange={() => toggle.mutate(c)} label={`${fullName(c)} disponible`} />,
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Ajouter un livreur
          </Button>
        }
      >
        Les livreurs sont contactés en dehors de la plateforme. Une fois affecté à une commande, le livreur reçoit par
        e-mail l’adresse, le repère et le montant à encaisser.
      </PageIntro>
      <StatRow
        items={[
          { label: 'Livreurs disponibles', value: couriers.filter((c) => c.active).length },
          {
            label: 'Courses en cours',
            value: orders.filter((o) => ['courier_assigned', 'shipping'].includes(o.status)).length,
          },
          { label: 'À affecter', value: orders.filter((o) => o.status === 'ready').length },
          { label: 'Quartiers sans livreur', value: uncovered.length },
        ]}
      />
      {uncovered.length > 0 && (
        <p className="mb-4 text-sm text-warning">
          Aucun livreur disponible pour : {uncovered.map((z) => z.name).join(', ')}.
        </p>
      )}
      <AdminTable caption="Livreurs" columns={columns} rows={couriers} rowKey={(c) => c.id} onRowClick={setEditing} />
      {editing && (
        <CourierDialog courier={editing === 'new' ? null : editing} zones={zones} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function CourierDialog({
  courier,
  zones,
  onClose,
}: {
  courier: Courier | null;
  zones: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [v, setV] = useState<Courier>(
    courier ?? {
      id: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      vehicle: 'Moto',
      zoneIds: [],
      active: true,
      notes: '',
    },
  );
  const [error, setError] = useState('');
  const set = (patch: Partial<Courier>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (c: Courier) => adminApi.saveCourier(c),
    (c) => `Livreur ${fullName(c)} enregistré`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.firstName.trim() || !v.lastName.trim()) return setError('Saisissez le prénom et le nom.');
    if (!gabonPhone.safeParse(v.phone).success) return setError('Numéro de téléphone gabonais invalide.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
      return setError('Adresse e-mail invalide : elle sert à envoyer les courses.');
    if (!v.zoneIds.length) return setError('Cochez au moins un quartier couvert.');
    save.mutate(
      { ...v, firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim().toLowerCase() },
      { onSuccess: onClose },
    );
  };

  const all = v.zoneIds.length === zones.length;

  return (
    <Modal open onClose={onClose} title={courier ? fullName(courier) : 'Ajouter un livreur'} className="max-w-2xl">
      <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={v.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          <TextField label="Nom" value={v.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          <TextField label="Téléphone" type="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
          <TextField label="E-mail" type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <SelectField
          label="Véhicule"
          containerClassName="sm:max-w-xs"
          value={v.vehicle}
          onChange={(e) => set({ vehicle: e.target.value as Courier['vehicle'] })}
        >
          {VEHICLES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </SelectField>
        <fieldset>
          <legend className="label flex w-full items-center justify-between">
            Quartiers couverts
            <button
              type="button"
              onClick={() => set({ zoneIds: all ? [] : zones.map((z) => z.id) })}
              className="text-sm font-semibold text-forest hover:underline"
            >
              {all ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {zones.map((z) => {
              const on = v.zoneIds.includes(z.id);
              return (
                <label
                  key={z.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                    on ? 'border-forest text-forest' : 'border-sage-dark',
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-forest"
                    checked={on}
                    onChange={() => set({ zoneIds: on ? v.zoneIds.filter((id) => id !== z.id) : [...v.zoneIds, z.id] })}
                  />
                  {z.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <TextAreaField
          label="Remarques"
          optional
          rows={2}
          value={v.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        {courier && !courier.active && <StateBadge tone="neutral">Indisponible</StateBadge>}
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
