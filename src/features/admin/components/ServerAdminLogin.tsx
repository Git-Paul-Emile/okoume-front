import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { fieldErrors } from '@/utils/zodErrors';
import { writeActivity } from '../loginGuard';
import { staffBackend } from '../staff.backend';

const credentialsSchema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});

/** Connexion au back-office par adresse e-mail et mot de passe. */
export function ServerAdminLogin({ back }: { back: string }) {
  const navigate = useNavigate();
  const setAdmin = useAdminAuthStore((state) => state.setAdmin);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = credentialsSchema.safeParse(values);
    if (!result.success) return setErrors(fieldErrors(result.error));
    setErrors({});
    setBusy(true);
    try {
      const admin = await staffBackend.login(result.data.email, result.data.password);
      writeActivity(Date.now());
      setAdmin({ ...admin, loginAt: new Date().toISOString() });
      navigate(back, { replace: true });
    } catch (error) {
      setErrors({ form: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl">Connexion au back-office</h1>
      <p className="mt-1.5 text-ink-soft">Réservé à l’équipe de la boutique.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <TextField
          label="Adresse e-mail professionnelle"
          type="email"
          autoComplete="username"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          error={errors.email}
        />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
          error={errors.password}
        />
        {errors.form && <p className="text-sm font-medium text-danger" role="alert">{errors.form}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Se connecter</Button>
      </form>
      <p className="mt-4 text-sm text-ink-muted">Pour réinitialiser votre mot de passe, contactez l’administrateur principal.</p>
    </div>
  );
}
