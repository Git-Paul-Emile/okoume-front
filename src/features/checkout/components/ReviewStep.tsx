import { AlertTriangle, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/TextField';
import type { DeliveryZone } from '@/features/delivery/delivery.types';
import { paymentMethodLabel } from '@/features/orders/orders.constants';
import type { PaymentMethod } from '@/features/orders/orders.types';
import { stockConflictMessages } from '../checkout.api';
import type { DeliveryInput } from '../checkout.schemas';

interface Props {
  delivery: DeliveryInput;
  zone: DeliveryZone;
  payment: PaymentMethod;
  submitting: boolean;
  error: unknown;
  onEdit: (step: number) => void;
  onConfirm: () => void;
}

export function ReviewStep({ delivery, zone, payment, submitting, error, onEdit, onConfirm }: Props) {
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const conflicts = stockConflictMessages(error);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-sage p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base">Livraison</h3>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
          >
            <Pencil className="size-3.5" /> Modifier
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {delivery.recipient} · {delivery.phone}
          <br />
          {delivery.email}
          <br />
          {zone.name} ({zone.city}), {delivery.landmark}
          {delivery.instructions && (
            <>
              <br />« {delivery.instructions} »
            </>
          )}
        </p>
      </section>
      <section className="rounded-lg border border-sage p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base">Paiement</h3>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
          >
            <Pencil className="size-3.5" /> Modifier
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{paymentMethodLabel[payment]}</p>
      </section>

      <Checkbox
        checked={accepted}
        onChange={(e) => {
          setAccepted(e.target.checked);
          setTermsError('');
        }}
        error={termsError}
        label={
          <>
            J’ai lu et j’accepte les{' '}
            <Link to="/legal/cgv" target="_blank" className="font-semibold text-forest underline">
              conditions générales de vente
            </Link>{' '}
            et la{' '}
            <Link to="/legal/confidentialite" target="_blank" className="font-semibold text-forest underline">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />

      {error !== null && error !== undefined && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" />{' '}
            {conflicts
              ? 'Certains articles ne sont plus disponibles en quantité suffisante'
              : 'La commande n’a pas pu être confirmée'}
          </p>
          {conflicts ? (
            <ul className="mt-2 list-disc pl-5">
              {conflicts.map((message) => (
                <li key={message}>{message}</li>
              ))}
              <li className="list-none pt-2">
                <Link to="/panier" className="font-semibold underline">
                  Modifier mon panier
                </Link>
              </li>
            </ul>
          ) : (
            <p className="mt-1">
              {getErrorMessage(error)} Vous pouvez réessayer sans risque : si la commande a déjà été enregistrée, elle
              ne sera pas créée une seconde fois.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" size="lg" onClick={() => onEdit(1)} disabled={submitting}>
          Retour
        </Button>
        <Button
          size="lg"
          className="sm:min-w-64"
          loading={submitting}
          loadingText="Confirmation en cours…"
          onClick={() =>
            accepted
              ? onConfirm()
              : setTermsError('Acceptez les conditions générales de vente pour confirmer la commande.')
          }
        >
          Confirmer la commande
        </Button>
      </div>
    </div>
  );
}
