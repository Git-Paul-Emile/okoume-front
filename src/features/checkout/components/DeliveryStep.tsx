import { MapPin } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/TextField';
import type { User } from '@/features/auth/auth.types';
import { ZoneRequestForm } from '@/features/delivery/components/ZoneRequestForm';
import type { DeliveryZone } from '@/features/delivery/delivery.types';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';
import { fieldErrors } from '@/utils/zodErrors';
import { deliverySchema, type DeliveryInput } from '../checkout.schemas';

interface Props {
  value: Partial<DeliveryInput>;
  zones: DeliveryZone[];
  user: User | null;
  onChange: (value: Partial<DeliveryInput>) => void;
  onNext: (value: DeliveryInput) => void;
}

export function DeliveryStep({ value, zones, user, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const zone = zones.find((z) => z.id === value.zoneId);

  const set = (key: keyof DeliveryInput) => (e: { target: { value: string } }) => {
    onChange({ ...value, [key]: e.target.value });
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };

  // Validation d'un champ isolé à la perte de focus
  const blur = (key: keyof DeliveryInput) => () => {
    const shape = deliverySchema.shape[key];
    const r = shape.safeParse(value[key] ?? '');
    setErrors((x) => ({ ...x, [key]: r.success ? '' : r.error.issues[0].message }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = deliverySchema.safeParse(value);
    if (!r.success) {
      setErrors(fieldErrors(r.error));
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onNext(r.data);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {user && user.addresses.length > 0 && (
        <fieldset>
          <legend className="label">Mes adresses enregistrées</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {user.addresses.map((a) => {
              const selected = value.landmark === a.landmark && value.zoneId === a.zoneId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange({
                      ...value,
                      recipient: a.recipient,
                      phone: a.phone,
                      zoneId: a.zoneId,
                      landmark: a.landmark,
                      instructions: a.instructions,
                    });
                    setErrors({});
                  }}
                  className={cn(
                    'rounded-lg border p-3 text-left text-sm transition',
                    selected ? 'border-forest bg-forest-50 ring-1 ring-forest' : 'border-sage-dark hover:border-forest',
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <MapPin className="size-4 text-forest" /> {a.label}
                  </span>
                  <span className="mt-1 block text-ink-soft">
                    {a.recipient} · {zones.find((z) => z.id === a.zoneId)?.name}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">{a.landmark}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <TextField
        label="Nom du destinataire"
        autoComplete="name"
        value={value.recipient ?? ''}
        onChange={set('recipient')}
        onBlur={blur('recipient')}
        error={errors.recipient}
      />
      <TextField
        label="Téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="077 12 34 56"
        value={value.phone ?? ''}
        onChange={set('phone')}
        onBlur={blur('phone')}
        error={errors.phone}
        hint="Le livreur vous appellera sur ce numéro."
      />
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        value={value.email ?? ''}
        onChange={set('email')}
        onBlur={blur('email')}
        error={errors.email}
        hint="Pour recevoir le récapitulatif et les étapes de livraison."
      />
      <SelectField
        label="Quartier de livraison"
        value={value.zoneId ?? ''}
        onChange={set('zoneId')}
        error={errors.zoneId}
      >
        <option value="">Choisissez votre quartier</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name} ({z.city}) : {z.available ? formatPrice(z.fee) : 'à confirmer'}
          </option>
        ))}
      </SelectField>
      {!zone && <ZoneRequestForm defaultContact={user?.phone ?? ''} />}
      {zone && (
        <p
          className={cn(
            '-mt-2 rounded-md p-3 text-sm',
            zone.available ? 'bg-forest-50 text-forest' : 'bg-[#fbf1dc] text-warning',
          )}
          role="status"
        >
          {zone.available
            ? `Livraison ${formatPrice(zone.fee)} · délai indicatif ${zone.eta} · ${zone.days}. Ce délai n’est pas garanti tant que la disponibilité du livreur n’est pas confirmée.`
            : `${zone.name} n’est pas desservi habituellement. Votre commande sera enregistrée et nous vous confirmerons la disponibilité et le tarif avant tout engagement.`}
        </p>
      )}
      <TextField
        label="Repère précis"
        placeholder="Ex. : derrière la pharmacie, portail vert"
        value={value.landmark ?? ''}
        onChange={set('landmark')}
        onBlur={blur('landmark')}
        error={errors.landmark}
      />
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Continuer vers le paiement
      </Button>
    </form>
  );
}
