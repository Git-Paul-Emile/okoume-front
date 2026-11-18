import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextField } from '@/components/ui/TextField';
import { fieldErrors } from '@/utils/zodErrors';
import { useVerifyRegistration } from '../auth.queries';
import { authBackend } from '../auth.backend';
import { registerSchema, type RegisterInput } from '../auth.schemas';
import { CodeStep } from './CodeStep';

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  acceptTerms: boolean;
};

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [v, setV] = useState<Values>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  // Inscription validée : l'adresse e-mail est confirmée par code avant la création du compte (19.1)
  const [pending, setPending] = useState<RegisterInput | null>(null);
  const verifyRegistration = useVerifyRegistration();

  const field = (key: keyof Values) => ({
    value: v[key] as string,
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [key]: e.target.value })),
    error: errors[key],
  });

  const blur = (key: 'email' | 'phone' | 'firstName' | 'lastName') => () => {
    const r = registerSchema.shape[key].safeParse(v[key]);
    setErrors((x) => ({ ...x, [key]: r.success ? '' : r.error.issues[0].message }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = registerSchema.safeParse(v);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setChecking(true);
    // L'API envoie le code ; elle répond de la même façon que l'adresse soit libre ou non
    authBackend
      .register(r.data)
      .then(() => setPending(r.data))
      .catch((error: unknown) => setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) }))
      .finally(() => setChecking(false));
  };

  if (pending)
    return (
      <div className="space-y-4">
        <h2 className="text-lg">Confirmez votre adresse e-mail</h2>
        <CodeStep
          target={pending.email}
          confirmLabel="Créer mon compte"
          onBack={() => setPending(null)}
          onVerified={onSuccess}
          server={{
            verify: (code) => verifyRegistration.mutateAsync({ email: pending.email, code }),
            resend: () => authBackend.resendVerification(pending.email),
          }}
        />
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Prénom" autoComplete="given-name" {...field('firstName')} onBlur={blur('firstName')} />
        <TextField label="Nom" autoComplete="family-name" {...field('lastName')} onBlur={blur('lastName')} />
      </div>
      <TextField label="Adresse e-mail" type="email" autoComplete="email" {...field('email')} onBlur={blur('email')} />
      <TextField
        label="Téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="077 12 34 56"
        {...field('phone')}
        onBlur={blur('phone')}
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
        {...field('password')}
      />
      <TextField
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        {...field('confirmPassword')}
      />
      <TextField
        label="Code de parrainage"
        optional
        {...field('referralCode')}
        hint="Votre parrain sera récompensé après votre première commande livrée et payée."
      />
      <Checkbox
        checked={v.acceptTerms}
        onChange={(e) => setV((x) => ({ ...x, acceptTerms: e.target.checked }))}
        error={errors.acceptTerms}
        label={
          <>
            J’accepte les{' '}
            <Link to="/legal/cgv" className="font-semibold text-forest underline">
              CGV
            </Link>{' '}
            et la{' '}
            <Link to="/legal/confidentialite" className="font-semibold text-forest underline">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      {errors.form && (
        <p className="text-sm font-medium text-danger" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={checking} loadingText="Vérification…">
        Continuer
      </Button>
    </form>
  );
}
