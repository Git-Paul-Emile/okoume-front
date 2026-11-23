import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { useDisputeDelivery, useReopenReturn } from '../orders.queries';
import type { Order } from '../orders.types';

/** Motif transmis avec une réclamation de livraison ou une demande de réouverture d'un retour. */
export function OrderMessageDialog({
  order,
  kind,
  onClose,
  onDone,
}: {
  order: Order;
  kind: 'dispute' | 'reopen';
  onClose: () => void;
  onDone: (o: Order) => void;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dispute = useDisputeDelivery();
  const reopen = useReopenReturn();
  const mutation = kind === 'dispute' ? dispute : reopen;
  const copy =
    kind === 'dispute'
      ? {
          title: 'Je n’ai pas reçu ma commande',
          description:
            'Une réclamation prioritaire est ouverte. Le statut « Livrée » reste affiché pendant l’enquête auprès du livreur.',
          label: 'Que s’est-il passé ?',
          done: 'Réclamation ouverte',
        }
      : {
          title: 'Demander la réouverture du retour',
          description: 'Votre dossier initial est conservé. Expliquez ce qui justifie un nouvel examen.',
          label: 'Votre message',
          done: 'Demande de réouverture envoyée',
        };

  const submit = () => {
    if (message.trim().length < 10) return setError('Décrivez la situation en quelques mots (10 caractères minimum).');
    mutation.mutate(
      { order, message: message.trim() },
      {
        onSuccess: (o) => {
          toast.success(copy.done, { description: 'La demande est jointe au dossier de commande.' });
          onDone(o);
          onClose();
        },
        onError: (e) => setError(getErrorMessage(e)),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title={copy.title} description={copy.description}>
      <TextAreaField
        label={copy.label}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={error}
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button loading={mutation.isPending} onClick={submit}>
          Envoyer
        </Button>
      </div>
    </Modal>
  );
}
