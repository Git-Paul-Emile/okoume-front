import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextField } from '@/components/ui/TextField';
import { fieldErrors } from '@/utils/zodErrors';
import { useRegister } from '../auth.queries';
import { registerSchema } from '../auth.schemas';

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState<Values>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const register = useRegister();

  const field = (key: keyof Values) => ({
    value: values[key] as string,
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })),
    error: errors[key],
  });

  const validateOnBlur = (key: 'email' | 'phone' | 'firstName' | 'lastName') => () => {
    const result = registerSchema.shape[key].safeParse(values[key]);
    setErrors((current) => ({ ...current, [key]: result.success ? '' : result.error.issues[0].message }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = registerSchema.safeParse(values);
    if (!result.success) return setErrors(fieldErrors(result.error));
    setErrors({});
    try {
      await register.mutateAsync(result.data);
      onSuccess();
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Prénom" autoComplete="given-name" {...field('firstName')} onBlur={validateOnBlur('firstName')} />
        <TextField label="Nom" autoComplete="family-name" {...field('lastName')} onBlur={validateOnBlur('lastName')} />
      </div>
      <TextField label="Adresse e-mail" type="email" autoComplete="email" {...field('email')} onBlur={validateOnBlur('email')} />
      <TextField
        label="Téléphone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="077 12 34 56"
        {...field('phone')}
        onBlur={validateOnBlur('phone')}
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
      <Checkbox
        checked={values.acceptTerms}
        onChange={(event) => setValues((current) => ({ ...current, acceptTerms: event.target.checked }))}
        error={errors.acceptTerms}
        label={
          <>
            J’accepte les{' '}
            <Link to="/legal/cgv" className="font-semibold text-forest underline">CGV</Link> et la{' '}
            <Link to="/legal/confidentialite" className="font-semibold text-forest underline">
              politique de confidentialité
            </Link>.
          </>
        }
      />
      {errors.form && <p className="text-sm font-medium text-danger" role="alert">{errors.form}</p>}
      <Button type="submit" size="lg" className="w-full" loading={register.isPending} loadingText="Création…">
        Créer mon compte
      </Button>
    </form>
  );
}
