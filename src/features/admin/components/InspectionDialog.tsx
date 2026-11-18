import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import type { AdminOrder } from '../admin.types';
import type { InspectionLine } from '../orders.actions';

/** Inspection d'un retour reçu (14.3) : quantités revendables et non revendables pour chaque article. */
export function InspectionDialog({
  order,
  loading,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  loading: boolean;
  onClose: () => void;
  onConfirm: (lines: InspectionLine[], note: string) => void;
}) {
  const items = order.returnRequest?.items ?? [];
  const [lines, setLines] = useState<InspectionLine[]>(() =>
    items.map((i) => ({ variantId: i.variantId, resaleable: i.quantity, unsellable: 0 })),
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const name = (variantId: string) => {
    const i = order.items.find((x) => x.variantId === variantId);
    return i ? `${i.name} · ${i.variantLabel}` : variantId;
  };
  const setUnsellable = (variantId: string, value: string) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.variantId !== variantId) return l;
        const total = l.resaleable + l.unsellable;
        const n = Math.min(total, Math.max(0, Math.floor(Number(value) || 0)));
        return { ...l, unsellable: n, resaleable: total - n };
      }),
    );

  const submit = () => {
    if (lines.some((l) => l.unsellable > 0) && note.trim().length < 5)
      return setError('Décrivez l’état des articles non revendables.');
    onConfirm(lines, note);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Inspection du colis retourné"
      description="Les articles revendables reviendront en stock après validation par le stock. Les non revendables vont dans un stock séparé, hors vente."
      className="max-w-xl"
    >
      <div className="space-y-4">
        <ul className="divide-y divide-sage text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_9rem]">
              <span>
                <span className="block font-medium">{name(l.variantId)}</span>
                <span className="block text-xs text-ink-muted">
                  {l.resaleable + l.unsellable} reçu(s) · {l.resaleable} revendable(s)
                </span>
              </span>
              <TextField
                label="Non revendables"
                inputMode="numeric"
                value={String(l.unsellable)}
                onChange={(e) => setUnsellable(l.variantId, e.target.value)}
              />
            </li>
          ))}
        </ul>
        <TextField label="Constat d’inspection" optional value={note} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={loading} onClick={submit}>
            Valider l’inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
