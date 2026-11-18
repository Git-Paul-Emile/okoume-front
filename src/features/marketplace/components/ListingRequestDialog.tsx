import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { gabonPhone } from '@/features/auth/auth.schemas';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';
import { formatPrice } from '@/utils/formatPrice';
import {
  handoverLabel,
  paymentLabel,
  type HandoverMode,
  type Listing,
  type MarketPaymentMethod,
  type PublicShop,
} from '../marketplace.backend';
import { useCreateListingRequest } from '../marketplace.queries';

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  label,
  error,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  label: (value: T) => string;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium',
              value === o ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
            )}
          >
            <input type="radio" className="accent-forest" checked={value === o} onChange={() => onChange(o)} />
            {label(o)}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

/**
 * Demande de commande sur une annonce (32.7). Le paiement et la remise se font hors plateforme, entre
 * acheteur et vendeur : les téléphones ne s'échangent qu'une fois la demande acceptée.
 */
export function ListingRequestDialog({
  listing,
  shop,
  defaultPhone,
  onClose,
}: {
  listing: Listing;
  shop: PublicShop;
  defaultPhone: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const create = useCreateListingRequest();
  const isProduct = listing.kind === 'product';
  const max = Math.max(1, listing.quantity ?? 1);
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState<MarketPaymentMethod | null>(
    shop.acceptedPaymentMethods.length === 1 ? (shop.acceptedPaymentMethods[0] ?? null) : null,
  );
  const [handover, setHandover] = useState<HandoverMode | null>(
    shop.handoverModes.length === 1 ? (shop.handoverModes[0] ?? null) : null,
  );
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!payment) next.payment = 'Choisissez le moyen de paiement.';
    if (!handover) next.handover = 'Choisissez le mode de remise.';
    const checkedPhone = gabonPhone.safeParse(phone);
    if (!checkedPhone.success) next.contactPhone = checkedPhone.error.issues[0]?.message ?? 'Numéro invalide.';
    setErrors(next);
    if (Object.keys(next).length || !payment || !handover) return;
    create.mutate(
      {
        listingSlug: listing.slug,
        quantity: isProduct ? quantity : null,
        paymentMethod: payment,
        handover,
        contactPhone: phone.trim(),
        message,
      },
      {
        onSuccess: (request) => {
          toast.success(`Demande ${request.number} envoyée`, {
            description: 'Le vendeur l’accepte ou la refuse ; vous êtes prévenu par e-mail.',
          });
          navigate('/compte/demandes');
        },
        onError: (err) => setErrors({ form: getErrorMessage(err), ...apiFieldErrors(err) }),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Demander à acheter"
      description={`${listing.title}, ${formatPrice(listing.price)}${isProduct ? ' l’unité' : ''}. Un prix convenu dans le tchat s’applique tant qu’il est valable.`}
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {isProduct && max > 1 && (
          <div>
            <p className="label">Quantité</p>
            <QuantityStepper min={1} max={max} value={quantity} onChange={setQuantity} label="Quantité demandée" />
          </div>
        )}
        <Choice
          legend="Paiement"
          options={shop.acceptedPaymentMethods}
          value={payment}
          onChange={setPayment}
          label={(m) => paymentLabel[m]}
          error={errors.payment}
        />
        <Choice
          legend="Remise"
          options={shop.handoverModes}
          value={handover}
          onChange={setHandover}
          label={(m) => handoverLabel[m]}
          error={errors.handover}
        />
        <TextField
          label="Votre téléphone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.contactPhone}
          hint="Communiqué au vendeur seulement s’il accepte votre demande."
        />
        <TextAreaField
          label="Message au vendeur"
          optional
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {errors.form && (
          <p className="text-sm font-medium text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <p className="text-xs text-ink-muted">
          Le paiement se fait directement avec le vendeur, à la remise. Okoumé n’encaisse rien pour cette annonce.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={create.isPending}>
            Envoyer la demande
          </Button>
        </div>
      </form>
    </Modal>
  );
}
