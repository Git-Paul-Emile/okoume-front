import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { cn } from '@/utils/text';
import type { ReturnAcceptance } from '../adminCommerce.backend';

const PAYERS: Array<{ id: ReturnAcceptance['shippingPaidBy']; label: string }> = [
  { id: 'shop', label: 'La boutique' },
  { id: 'customer', label: 'Le client' },
];

/**
 * Accord sur un retour (14.2, 14.3) : la décision est motivée, et la prise en charge des frais de renvoi est
 * tranchée au cas par cas, avec son motif. Les deux motifs sont communiqués au client.
 */
export function ReturnAcceptDialog({
  orderNumber,
  loading,
  onClose,
  onConfirm,
}: {
  orderNumber: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (acceptance: ReturnAcceptance) => void;
}) {
  const [decisionReason, setDecisionReason] = useState('');
  const [shippingPaidBy, setShippingPaidBy] = useState<ReturnAcceptance['shippingPaidBy'] | null>(null);
  const [shippingReason, setShippingReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (decisionReason.trim().length < 5) next.decisionReason = 'Indiquez le motif de l’accord en quelques mots.';
    if (!shippingPaidBy) next.shippingPaidBy = 'Choisissez qui paie le renvoi du colis.';
    if (shippingReason.trim().length < 5) next.shippingReason = 'Indiquez pourquoi, en quelques mots.';
    setErrors(next);
    if (Object.keys(next).length || !shippingPaidBy) return;
    onConfirm({ decisionReason: decisionReason.trim(), shippingPaidBy, shippingReason: shippingReason.trim() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Accepter le retour de ${orderNumber}`}
      description="Le client reçoit la décision et sait qui prend en charge le renvoi du colis."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextAreaField
          label="Motif de l’accord"
          rows={2}
          value={decisionReason}
          onChange={(e) => setDecisionReason(e.target.value)}
          error={errors.decisionReason}
        />
        <fieldset>
          <legend className="label">Frais de renvoi payés par</legend>
          <div className="flex gap-2">
            {PAYERS.map((p) => (
              <label
                key={p.id}
                className={cn(
                  'flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium',
                  shippingPaidBy === p.id ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
                )}
              >
                <input
                  type="radio"
                  name="shippingPaidBy"
                  className="accent-forest"
                  checked={shippingPaidBy === p.id}
                  onChange={() => setShippingPaidBy(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
          {errors.shippingPaidBy && <p className="mt-1.5 text-sm font-medium text-danger">{errors.shippingPaidBy}</p>}
        </fieldset>
        <TextAreaField
          label="Motif de la prise en charge"
          rows={2}
          value={shippingReason}
          onChange={(e) => setShippingReason(e.target.value)}
          error={errors.shippingReason}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Accepter le retour
          </Button>
        </div>
      </form>
    </Modal>
  );
}
