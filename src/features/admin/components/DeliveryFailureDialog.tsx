import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/utils/text';
import { DELIVERY_FAILURE_REASONS } from '../orders.actions';

const OTHER = 'Autre motif';

/** Déclaration d'une livraison échouée : motif puis décision, prise au cas par cas (9.6). */
export function DeliveryFailureDialog({
  orderNumber,
  loading,
  onClose,
  onConfirm,
}: {
  orderNumber: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string, decision: 'retry' | 'cancel') => void;
}) {
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [decision, setDecision] = useState<'retry' | 'cancel'>('retry');
  const final = reason === OTHER ? other.trim() : reason;

  const choice = (selected: boolean) =>
    cn(
      'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm',
      selected ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Échec de livraison : ${orderNumber}`}
      description="Le motif et la décision sont conservés dans l’historique de la commande."
      className="max-w-xl"
    >
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="label">Motif</legend>
          {[...DELIVERY_FAILURE_REASONS, OTHER].map((r) => (
            <label key={r} className={choice(reason === r)}>
              <input
                type="radio"
                name="failure-reason"
                className="accent-forest"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {r}
            </label>
          ))}
          {reason === OTHER && (
            <TextField label="Précisez" value={other} onChange={(e) => setOther(e.target.value)} autoFocus />
          )}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="label">Décision</legend>
          <label className={choice(decision === 'retry')}>
            <input
              type="radio"
              name="decision"
              className="accent-forest"
              checked={decision === 'retry'}
              onChange={() => setDecision('retry')}
            />
            <span>
              <span className="block font-semibold">Nouvelle tentative</span>
              <span className="block text-xs text-ink-muted">
                La commande revient « Prête à livrer » pour être confiée à nouveau.
              </span>
            </span>
          </label>
          <label className={choice(decision === 'cancel')}>
            <input
              type="radio"
              name="decision"
              className="accent-forest"
              checked={decision === 'cancel'}
              onChange={() => setDecision('cancel')}
            />
            <span>
              <span className="block font-semibold">Annuler la commande</span>
              <span className="block text-xs text-ink-muted">
                Le stock est libéré ; un paiement reçu passe en remboursement.
              </span>
            </span>
          </label>
        </fieldset>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant={decision === 'cancel' ? 'danger' : 'primary'}
          disabled={final.length < 3}
          loading={loading}
          onClick={() => onConfirm(final, decision)}
        >
          Enregistrer l’échec
        </Button>
      </div>
    </Modal>
  );
}
