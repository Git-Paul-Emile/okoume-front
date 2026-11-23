import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useSettings } from '@/features/settings/settings.queries';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

type Method = 'airtel' | 'moov';
const METHODS: Array<{ id: Method; label: string }> = [
  { id: 'airtel', label: 'Airtel Money' },
  { id: 'moov', label: 'Moov Money' },
];

/**
 * Déclaration d'un paiement Mobile Money fait hors plateforme (abonnement ou mise en avant). Rien ne s'active
 * avant que l'équipe OKOZA n'ait vérifié la réception des fonds.
 */
export function MobileMoneyForm({
  amount,
  submitLabel,
  onSubmit,
}: {
  amount: number;
  submitLabel: string;
  onSubmit: (payment: { method: Method; reference: string; amount: number }) => Promise<unknown>;
}) {
  const { data: settings } = useSettings();
  const [method, setMethod] = useState<Method | null>(null);
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const account = settings?.mobileMoney.find((m) => m.method === method);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!method) next.method = 'Choisissez Airtel Money ou Moov Money.';
    if (reference.trim().length < 4) next.reference = 'Indiquez la référence reçue par SMS après le paiement.';
    setErrors(next);
    if (Object.keys(next).length || !method) return;
    setBusy(true);
    try {
      await onSubmit({ method, reference: reference.trim(), amount });
      setReference('');
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-3">
      <p className="text-sm text-ink-soft">
        Payez <strong>{formatPrice(amount)}</strong> par Mobile Money, puis indiquez la référence de la transaction.
        L’équipe OKOZA vérifie la réception avant d’activer.
      </p>
      <fieldset>
        <legend className="label">Paiement par</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <label
              key={m.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium',
                method === m.id ? 'border-forest text-forest' : 'border-sage-dark hover:border-forest',
              )}
            >
              <input
                type="radio"
                className="accent-forest"
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
              />
              {m.label}
            </label>
          ))}
        </div>
        {errors.method && <p className="mt-1.5 text-sm font-medium text-danger">{errors.method}</p>}
      </fieldset>
      {account && (
        <p className="rounded-md bg-ivory p-3 text-sm">
          Bénéficiaire : <strong>{account.beneficiary}</strong>, numéro{' '}
          <strong className="font-mono">{account.number}</strong>
        </p>
      )}
      <TextField
        label="Référence de la transaction"
        value={reference}
        onChange={(e) => setReference(e.target.value.toUpperCase())}
        error={errors.reference}
      />
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
