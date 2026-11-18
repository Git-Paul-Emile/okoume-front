import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { CANCEL_REASONS, canCancelDirectly } from '../orders.constants';
import { useCancelOrder } from '../orders.queries';
import type { Order } from '../orders.types';

export function CancelOrderDialog({
  order,
  open,
  onClose,
  onDone,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  onDone?: (o: Order) => void;
}) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const cancel = useCancelOrder();
  const direct = canCancelDirectly(order.status);

  const submit = () => {
    if (!reason) return setError('Choisissez un motif d’annulation.');
    cancel.mutate(
      { order, request: { reason, comment } },
      {
        onSuccess: (o) => {
          toast.success(direct ? 'Commande annulée' : 'Demande d’annulation envoyée', {
            description: direct
              ? 'Aucun paiement ne vous sera demandé.'
              : 'La commande reste active jusqu’à la décision de notre équipe.',
          });
          onDone?.(o);
          onClose();
        },
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={direct ? 'Annuler la commande' : 'Demander l’annulation'}
      description={
        direct
          ? 'La préparation n’a pas commencé : l’annulation est immédiate.'
          : 'La préparation a commencé. Votre demande sera examinée par notre équipe ; vous serez informé de la décision.'
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Motif"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError('');
          }}
          error={error}
        >
          <option value="">Choisissez un motif</option>
          {CANCEL_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </SelectField>
        <TextAreaField
          label="Commentaire"
          optional
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Garder ma commande
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={submit}>
            {direct ? 'Confirmer l’annulation' : 'Envoyer la demande'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
