import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { formatDateTime } from '@/utils/formatDate';
import { paymentMethodLabel } from '../orders.constants';
import { useDeclarePayment } from '../orders.queries';
import type { Order } from '../orders.types';

/**
 * Paiement Mobile Money envoyé par le client (8.4) : il indique la référence reçue par SMS, la commande passe
 * « à vérifier » et l'équipe compare avant d'enregistrer le paiement. Sans compte, le code de suivi sert de preuve.
 */
export function PaymentDeclaration({
  order,
  trackingCode,
  onDeclared,
}: {
  order: Order;
  trackingCode?: string;
  onDeclared: (order: Order) => void;
}) {
  const declare = useDeclarePayment();
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  if (order.paymentStatus === 'awaiting_verification')
    return (
      <p className="mt-6 flex items-start gap-2 rounded-md bg-forest-50 p-3 text-sm text-forest" role="status">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>
          Paiement déclaré
          {order.paymentDeclaration &&
            ` le ${formatDateTime(order.paymentDeclaration.at)} (réf. ${order.paymentDeclaration.reference})`}{' '}
          : notre équipe le vérifie, puis la préparation commence.
        </span>
      </p>
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (reference.trim().length < 4)
      return setError('Indiquez la référence de la transaction (4 caractères au moins).');
    setError('');
    declare.mutate(
      { order, reference: reference.trim(), ...(trackingCode ? { trackingCode } : {}) },
      { onSuccess: onDeclared, onError: (err) => setError(getErrorMessage(err)) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 rounded-md border border-sage-dark p-4">
      <p className="text-sm font-semibold">Vous avez envoyé le paiement {paymentMethodLabel[order.paymentMethod]} ?</p>
      <p className="mt-1 text-sm text-ink-soft">
        Indiquez la référence de la transaction reçue par SMS : nous la comparons avant de lancer la préparation.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextField
          label="Référence de la transaction"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={error}
          autoComplete="off"
          className="sm:flex-1"
        />
        <Button type="submit" loading={declare.isPending} className="sm:mt-7">
          J’ai payé
        </Button>
      </div>
    </form>
  );
}
