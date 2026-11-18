import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextField } from '@/components/ui/TextField';
import { paymentMethodLabel } from '@/features/orders/orders.constants';
import type { PaymentMethod } from '@/features/orders/orders.types';
import { formatPrice } from '@/utils/formatPrice';
import type { AdminOrder } from '../admin.types';
import {
  paidAmount,
  paymentError,
  receivedAt,
  refundableAmount,
  refundError,
  remainingAmount,
  type PaymentInput,
  type RefundInput,
} from '../payments.rules';

/** Date et heure locales au format attendu par un champ datetime-local. */
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function Actions({
  onClose,
  loading,
  label,
  onConfirm,
}: {
  onClose: () => void;
  loading: boolean;
  label: string;
  onConfirm: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>
        Annuler
      </Button>
      <Button loading={loading} onClick={onConfirm}>
        {label}
      </Button>
    </div>
  );
}

const ErrorText = ({ text }: { text: string }) =>
  text ? (
    <p className="text-sm font-medium text-danger" role="alert">
      {text}
    </p>
  ) : null;

/** Enregistrement d'un encaissement (8.4, 8.5) : montant, date, référence et observations. */
export function RecordPaymentDialog({
  order,
  loading,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: PaymentInput) => void;
}) {
  const cash = order.paymentMethod === 'cash';
  const [v, setV] = useState({
    amount: String(remainingAmount(order) || order.totals.total),
    at: localNow(),
    // Référence déclarée par le client : à vérifier, pas à recopier sans contrôle
    reference: order.paymentDeclaration?.reference ?? '',
  });
  const [error, setError] = useState('');
  const submit = () => {
    const input = {
      amount: Number(v.amount),
      at: receivedAt(v.at, order.createdAt),
      reference: v.reference,
    };
    const e = paymentError(order, input);
    if (e) return setError(e);
    onConfirm(input);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={cash ? 'Confirmer l’encaissement' : 'Enregistrer le paiement reçu'}
      description={`Total ${formatPrice(order.totals.total)} · déjà reçu ${formatPrice(paidAmount(order))}. Saisissez le total exact : un paiement partiel est refusé.`}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Montant reçu (FCFA)"
            inputMode="numeric"
            value={v.amount}
            onChange={(e) => setV({ ...v, amount: e.target.value })}
          />
          <TextField
            label="Date de réception"
            type="datetime-local"
            value={v.at}
            onChange={(e) => setV({ ...v, at: e.target.value })}
          />
        </div>
        <TextField
          label={
            cash
              ? 'Référence (reçu, livreur)'
              : `Référence de la transaction ${paymentMethodLabel[order.paymentMethod]}`
          }
          optional={cash}
          value={v.reference}
          onChange={(e) => setV({ ...v, reference: e.target.value })}
        />
        <ErrorText text={error} />
        <Actions onClose={onClose} loading={loading} label="Enregistrer" onConfirm={submit} />
      </div>
    </Modal>
  );
}

/** Confirmation d'un remboursement effectué hors plateforme (14.4), avec sa référence. */
export function RefundDialog({
  order,
  loading,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: RefundInput) => void;
}) {
  const [v, setV] = useState({
    amount: String(refundableAmount(order)),
    method: order.paymentMethod,
    reference: '',
    noReferenceReason: '',
    clientAgreed: false,
  });
  const [error, setError] = useState('');
  const submit = () => {
    const input = { ...v, amount: Number(v.amount) };
    const e = refundError(order, input);
    if (e) return setError(e);
    onConfirm(input);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Confirmer le remboursement"
      description="À confirmer seulement une fois l’opération réellement effectuée. Pour un retour, le montant proposé correspond aux articles retournés ; la livraison est examinée à part."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Montant remboursé (FCFA)"
            inputMode="numeric"
            value={v.amount}
            onChange={(e) => setV({ ...v, amount: e.target.value })}
          />
          <SelectField
            label="Moyen"
            value={v.method}
            onChange={(e) => setV({ ...v, method: e.target.value as PaymentMethod })}
          >
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
                {m === order.paymentMethod ? ' (paiement initial)' : ''}
              </option>
            ))}
          </SelectField>
        </div>
        {v.method !== order.paymentMethod && (
          <Checkbox
            label="Le client a donné son accord pour ce moyen"
            checked={v.clientAgreed}
            onChange={(e) => setV({ ...v, clientAgreed: e.target.checked })}
          />
        )}
        <TextField
          label="Référence du remboursement"
          value={v.reference}
          onChange={(e) => setV({ ...v, reference: e.target.value })}
        />
        {v.reference.trim().length < 3 && (
          <TextField
            label="Exception : pourquoi aucune référence"
            optional
            value={v.noReferenceReason}
            onChange={(e) => setV({ ...v, noReferenceReason: e.target.value })}
          />
        )}
        <ErrorText text={error} />
        <Actions onClose={onClose} loading={loading} label="Confirmer le remboursement" onConfirm={submit} />
      </div>
    </Modal>
  );
}
