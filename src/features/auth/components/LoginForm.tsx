import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { fieldErrors } from '@/utils/zodErrors';
import { useLogin } from '../auth.queries';
import { loginSchema } from '../auth.schemas';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const login = useLogin();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = loginSchema.safeParse(values);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    login.mutate(r.data, { onSuccess });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField
        label="E-mail ou téléphone"
        type="text"
        autoComplete="username"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        onBlur={() => {
          const r = loginSchema.shape.email.safeParse(values.email);
          setErrors((x) => ({ ...x, email: r.success ? '' : r.error.issues[0].message }));
        }}
        error={errors.email}
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        error={errors.password}
      />
      <p className="-mt-2 text-right text-sm">
        <Link to="/mot-de-passe-oublie" className="font-semibold text-forest hover:underline">
          Mot de passe oublié ?
        </Link>
      </p>
      {login.isError && (
        <p className="text-sm font-medium text-danger" role="alert">
          {getErrorMessage(login.error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={login.isPending} loadingText="Connexion…">
        Se connecter
      </Button>
    </form>
  );
}
