import { AlarmClock } from 'lucide-react';
import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextField';
import { useCountdown } from '@/hooks/useCountdown';
import { toast } from '@/stores/toastStore';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/utils/text';
import { paymentMethodLabel } from '../orders.constants';
import { useDisputeDelivery, useReopenReturn, useRequestPaymentChange } from '../orders.queries';
import type { Order, PaymentMethod } from '../orders.types';

/** Délai pour payer une commande Mobile Money (8.7) ; au-delà, la commande peut être annulée. */
export function PaymentDeadline({ order, hours }: { order: Order; hours: number }) {
  const deadline = new Date(new Date(order.createdAt).getTime() + hours * 3_600_000).toISOString();
  const left = useCountdown(deadline);
  return (
    <p
      className={cn(
        'mt-6 flex items-start gap-2 rounded-md p-3 text-sm',
        left.expired ? 'bg-danger/10 text-danger' : 'bg-[#fbf1dc] text-warning',
      )}
    >
      <AlarmClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {left.expired ? (
        <span>
          Délai de paiement dépassé depuis le {formatDateTime(deadline)}. Sans paiement reçu, la commande sera annulée
          et vous en serez informé. Un paiement arrivé après l’annulation vous sera remboursé.
        </span>
      ) : (
        <span>
          Payez par {paymentMethodLabel[order.paymentMethod]} avant le {formatDateTime(deadline)}, soit encore{' '}
          <strong>
            {left.days * 24 + left.hours} h {String(left.minutes).padStart(2, '0')} min
          </strong>
          . Passé ce délai, la commande sera annulée.
        </span>
      )}
    </p>
  );
}

const METHODS: PaymentMethod[] = ['cash', 'airtel', 'moov'];

/** Demande de changement de moyen de paiement (8.6), soumise à l'accord de la boutique. */
export function PaymentChangeDialog({
  order,
  onClose,
  onDone,
}: {
  order: Order;
  onClose: () => void;
  onDone: (o: Order) => void;
}) {
  const [to, setTo] = useState<PaymentMethod | null>(null);
  const change = useRequestPaymentChange();

  return (
    <Modal
      open
      onClose={onClose}
      title="Changer de moyen de paiement"
      description={`Actuellement : ${paymentMethodLabel[order.paymentMethod]}. Le changement s’applique tout de suite, tant que rien n’est encaissé.`}
    >
      <fieldset className="space-y-2">
        <legend className="label">Nouveau moyen</legend>
        {METHODS.filter((m) => m !== order.paymentMethod).map((m) => (
          <label
            key={m}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium',
              to === m ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
            )}
          >
            <input type="radio" name="payment" className="accent-forest" checked={to === m} onChange={() => setTo(m)} />
            {paymentMethodLabel[m]}
          </label>
        ))}
      </fieldset>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!to}
          loading={change.isPending}
          onClick={() =>
            change.mutate(
              { order, to: to! },
              {
                onSuccess: (o) => {
                  toast.success('Moyen de paiement changé', { description: paymentMethodLabel[o.paymentMethod] });
                  onDone(o);
                  onClose();
                },
                onError: (e) => toast.error(getErrorMessage(e)),
              },
            )
          }
        >
          Changer
        </Button>
      </div>
    </Modal>
  );
}

/** Message libre envoyé à l'équipe : contestation de livraison (9.6) ou réouverture d'un retour (14.6). */
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
          toast.success(copy.done, { description: 'Notre équipe vous répond dans votre espace « Assistance ».' });
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
