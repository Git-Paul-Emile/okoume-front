import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextAreaField, TextField } from '@/components/ui/TextField';
import { gabonPhone } from '@/features/auth/auth.schemas';
import { PAYMENT_METHODS, paymentLabel, type ShopFields } from '@/features/seller/seller.backend';

const toggle = <T,>(list: T[], value: T, on: boolean) => (on ? [...list, value] : list.filter((v) => v !== value));

/** Fiche de la boutique (32.2) : nom, présentation, lieu, téléphone, paiements et remises acceptés. */
export function ShopForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ShopFields;
  submitLabel: string;
  onSubmit: (fields: ShopFields) => Promise<unknown>;
}) {
  const [v, setV] = useState<ShopFields>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ShopFields>) => setV((x) => ({ ...x, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (v.name.trim().length < 3) next.name = 'Nom de boutique trop court (3 caractères au moins).';
    if (v.city.trim().length < 2) next.city = 'Indiquez la ville.';
    if (v.district.trim().length < 2) next.district = 'Indiquez le quartier.';
    const phone = gabonPhone.safeParse(v.phone);
    if (!phone.success) next.phone = phone.error.issues[0]?.message ?? 'Numéro invalide.';
    if (!v.acceptedPaymentMethods.length) next.acceptedPaymentMethods = 'Indiquez au moins un moyen de paiement.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await onSubmit({
        ...v,
        name: v.name.trim(),
        description: v.description.trim(),
        city: v.city.trim(),
        district: v.district.trim(),
        phone: v.phone.trim(),
      });
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
      <TextField
        label="Nom de la boutique"
        value={v.name}
        onChange={(e) => set({ name: e.target.value })}
        error={errors.name}
      />
      <TextAreaField
        label="Présentation"
        optional
        rows={3}
        maxLength={2000}
        value={v.description}
        onChange={(e) => set({ description: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Ville" value={v.city} onChange={(e) => set({ city: e.target.value })} error={errors.city} />
        <TextField
          label="Quartier"
          value={v.district}
          onChange={(e) => set({ district: e.target.value })}
          error={errors.district}
        />
      </div>
      <TextField
        label="Téléphone de la boutique"
        type="tel"
        value={v.phone}
        onChange={(e) => set({ phone: e.target.value })}
        error={errors.phone}
        hint="Communiqué à l’acheteur seulement après acceptation de sa demande."
      />
      <fieldset>
        <legend className="label">Paiements acceptés (réglés directement avec l’acheteur)</legend>
        <div className="flex flex-wrap gap-4">
          {PAYMENT_METHODS.map((m) => (
            <Checkbox
              key={m}
              label={paymentLabel[m]}
              checked={v.acceptedPaymentMethods.includes(m)}
              onChange={(e) => set({ acceptedPaymentMethods: toggle(v.acceptedPaymentMethods, m, e.target.checked) })}
            />
          ))}
        </div>
        {errors.acceptedPaymentMethods && (
          <p className="mt-1.5 text-sm font-medium text-danger">{errors.acceptedPaymentMethods}</p>
        )}
      </fieldset>
      {errors.form && (
        <p className="text-sm font-medium text-danger" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
