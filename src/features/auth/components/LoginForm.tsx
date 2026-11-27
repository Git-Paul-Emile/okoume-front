import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { fieldErrors } from '@/utils/zodErrors';
import type { DemoLoginRole } from '../demoAccounts';
import { useLogin } from '../auth.queries';
import { loginSchema } from '../auth.schemas';

export function LoginForm({
  onSuccess,
  demoRoles = [],
  onDemoRoleSelect,
}: {
  onSuccess: () => void;
  demoRoles?: DemoLoginRole[];
  onDemoRoleSelect?: (role: Extract<DemoLoginRole, { email: string }>) => void;
}) {
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
      {demoRoles.length > 0 && (
        <div className="space-y-2 rounded-md bg-ivory p-3">
          <p className="text-xs font-semibold text-ink-soft">Essayer un profil de démonstration</p>
          <div className="grid grid-cols-3 gap-2">
            {demoRoles.map((role) =>
              'href' in role ? (
                <Link
                  key={role.label}
                  to={role.href}
                  className="rounded-md border border-sage bg-white px-2 py-2 text-center text-xs font-semibold text-forest transition hover:border-forest"
                >
                  {role.label}
                </Link>
              ) : (
                <button
                  key={role.label}
                  type="button"
                  onClick={() => {
                    setValues({ email: role.email, password: role.password });
                    setErrors({});
                    login.reset();
                    onDemoRoleSelect?.(role);
                  }}
                  className="rounded-md border border-sage bg-white px-2 py-2 text-center text-xs font-semibold text-forest transition hover:border-forest"
                >
                  {role.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
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
