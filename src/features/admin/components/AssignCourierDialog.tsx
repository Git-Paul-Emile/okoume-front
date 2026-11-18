import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/text';
import { useCouriers } from '../admin.queries';
import type { AdminOrder, Courier } from '../admin.types';
import { courierEmail } from '../courier.utils';

/** Affectation d'un livreur du répertoire : ceux qui couvrent le quartier de la commande sont proposés d'abord. */
export function AssignCourierDialog({
  order,
  loading,
  onClose,
  onAssign,
}: {
  order: AdminOrder;
  loading: boolean;
  onClose: () => void;
  onAssign: (courier: Courier) => void;
}) {
  const { data: couriers = [] } = useCouriers();
  const available = couriers.filter((c) => c.active);
  const covering = available.filter((c) => c.zoneIds.includes(order.customer.zoneId));
  const others = available.filter((c) => !c.zoneIds.includes(order.customer.zoneId));
  const [picked, setPicked] = useState('');
  // Par défaut, le premier livreur qui couvre le quartier (la liste peut arriver après l'ouverture)
  const selected = picked || covering[0]?.id || '';
  const courier = available.find((c) => c.id === selected) ?? null;
  const email = courier ? courierEmail(order, courier) : null;

  const option = (c: Courier) => (
    <label
      key={c.id}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm',
        selected === c.id ? 'border-forest' : 'border-sage-dark hover:border-forest',
      )}
    >
      <input
        type="radio"
        name="courier"
        className="accent-forest"
        checked={selected === c.id}
        onChange={() => setPicked(c.id)}
      />
      <span className="flex-1">
        <span className="block font-semibold">
          {c.firstName} {c.lastName}
        </span>
        <span className="block text-xs text-ink-muted">
          {c.vehicle} · {c.phone}
        </span>
      </span>
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Livreur pour ${order.number}`}
      description={`Livraison à ${order.customer.zoneName}.`}
      className="max-w-xl"
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        {available.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Aucun livreur disponible.{' '}
            <Link to="/admin/livreurs" className="font-semibold text-forest hover:underline">
              Gérer les livreurs
            </Link>
          </p>
        ) : (
          <>
            {covering.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="label">Couvrent ce quartier</legend>
                {covering.map(option)}
              </fieldset>
            )}
            {others.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="label">Autres livreurs disponibles</legend>
                {others.map(option)}
              </fieldset>
            )}
          </>
        )}
        {email && courier && (
          <div className="rounded-lg border border-sage bg-ivory/60 p-4 text-sm">
            <p className="font-semibold">E-mail envoyé à {courier.email}</p>
            <p className="mt-1 text-ink-soft">Objet : {email.subject}</p>
            <pre className="mt-2 font-sans text-sm whitespace-pre-wrap text-ink-soft">{email.body}</pre>
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button disabled={!courier} loading={loading} onClick={() => courier && onAssign(courier)}>
          Affecter et envoyer
        </Button>
      </div>
    </Modal>
  );
}
