import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';

/** Saisie d'un montant en FCFA avec un motif obligatoire (frais, coûts). */
export function AmountReasonDialog({
  title,
  description,
  amountLabel,
  initial,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
  withReason = true,
}: {
  title: string;
  description?: string;
  amountLabel: string;
  initial: number;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (amount: number, reason: string) => void;
  /** false : montant seul, quand l'API ne conserve pas de motif pour cette action */
  withReason?: boolean;
}) {
  const [amount, setAmount] = useState(String(initial));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const n = Number(amount);
    if (amount.trim() === '' || !Number.isInteger(n) || n < 0)
      return setError('Indiquez un montant en FCFA, sans décimales.');
    if (withReason && reason.trim().length < 5) return setError('Indiquez le motif.');
    onConfirm(n, reason.trim());
  };
  return (
    <Modal open onClose={onClose} title={title} description={description}>
      <div className="space-y-4">
        <TextField label={amountLabel} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {withReason && <TextField label="Motif" value={reason} onChange={(e) => setReason(e.target.value)} />}
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
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
