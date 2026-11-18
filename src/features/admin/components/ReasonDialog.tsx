import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label?: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

/** Confirmation d'une action sensible avec un motif obligatoire (refus, annulation, export…). */
export function ReasonDialog({
  open,
  onClose,
  title,
  description,
  label = 'Motif',
  confirmLabel,
  danger,
  loading,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    setReason('');
    setError('');
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) return setError('Indiquez le motif en quelques mots.');
    onConfirm(reason.trim());
    setReason('');
    setError('');
  };

  return (
    <Modal open={open} onClose={close} title={title} description={description}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextAreaField
          label={label}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
