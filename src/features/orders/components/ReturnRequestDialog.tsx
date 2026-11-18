import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { SelectField, TextAreaField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { RETURN_REASONS } from '../orders.constants';
import { useRequestReturn } from '../orders.queries';
import type { Order } from '../orders.types';
import { ReturnPhotos } from './ReturnPhotos';

export function ReturnRequestDialog({
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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useRequestReturn();
  const needsProof = ['Produit endommagé', 'Produit défectueux', 'Non conforme à la description'].includes(reason);

  const submit = () => {
    const items = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));
    const next: Record<string, string> = {};
    if (!items.length) next.items = 'Sélectionnez au moins un article et sa quantité.';
    if (!reason) next.reason = 'Choisissez le motif du retour.';
    if (needsProof && comment.trim().length < 10)
      next.comment = 'Décrivez le problème constaté (10 caractères minimum).';
    if (needsProof && !photos.length) next.photos = 'Ajoutez au moins une photo du produit pour ce motif.';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate(
      { order, request: { items, reason, comment, evidenceUrls: photos } },
      {
        onSuccess: (o) => {
          toast.success('Demande de retour envoyée', {
            description: 'Vous serez informé de la décision et des étapes suivantes.',
          });
          onDone?.(o);
          onClose();
        },
        onError: (e) => setErrors({ form: getErrorMessage(e) }),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Demander un retour"
      description="Le remboursement intervient après réception et vérification du produit."
      className="max-w-xl"
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="label">Articles concernés</legend>
          <ul className="divide-y divide-sage rounded-md border border-sage">
            {order.items.map((i) => (
              <li key={i.variantId} className="flex items-center gap-3 p-3">
                <img src={i.image} alt="" className="size-12 rounded-md bg-white object-contain" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="text-xs text-ink-muted">
                    {i.variantLabel} · commandé : {i.quantity}
                  </span>
                </span>
                <QuantityStepper
                  size="sm"
                  min={0}
                  max={i.quantity}
                  value={quantities[i.variantId] ?? 0}
                  onChange={(q) => setQuantities((x) => ({ ...x, [i.variantId]: q }))}
                  label={`Quantité à retourner pour ${i.name}`}
                />
              </li>
            ))}
          </ul>
          {errors.items && <p className="mt-1.5 text-sm font-medium text-danger">{errors.items}</p>}
        </fieldset>
        <SelectField label="Motif" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason}>
          <option value="">Choisissez un motif</option>
          {RETURN_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </SelectField>
        <TextAreaField
          label="Description du problème"
          optional={!needsProof}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          error={errors.comment}
        />
        <ReturnPhotos order={order} value={photos} onChange={setPhotos} required={needsProof} error={errors.photos} />
        {errors.form && <p className="text-sm font-medium text-danger">{errors.form}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Envoyer la demande
          </Button>
        </div>
      </div>
    </Modal>
  );
}
