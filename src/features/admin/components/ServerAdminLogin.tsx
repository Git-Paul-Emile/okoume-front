import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { loginSchema } from '@/features/auth/auth.schemas';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { fieldErrors } from '@/utils/zodErrors';
import { maskEmail, writeActivity } from '../loginGuard';
import { staffBackend } from '../staff.backend';

/**
 * Connexion de l'équipe sur l'API (19.2) : mot de passe, puis code reçu par e-mail ou code de secours.
 * Essais, blocage et expiration sont gérés par l'API ; l'écran affiche ses réponses.
 */
export function ServerAdminLogin({ back }: { back: string }) {
  const navigate = useNavigate();
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, onError: (message: string) => void) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const start = (e?: FormEvent) => {
    e?.preventDefault();
    const r = loginSchema.safeParse(values);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    void run(
      async () => {
        setChallengeId(await staffBackend.startLogin(r.data.email, r.data.password));
        setCode('');
      },
      (message) => setErrors({ form: message }),
    );
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    const proof = backup ? { backupCode: code.trim() } : { code };
    void run(
      async () => {
        const { admin, backupCodesLeft } = await staffBackend.completeLogin(challengeId, proof);
        // Repart de zéro : une activité ancienne d'une session précédente fermerait aussitôt la nouvelle
        writeActivity(Date.now());
        setAdmin({ ...admin, loginAt: new Date().toISOString() });
        if (backup)
          toast.info('Code de secours utilisé', {
            description: `Il ne fonctionnera plus. Codes restants : ${backupCodesLeft ?? 0}.`,
          });
        navigate(back, { replace: true });
      },
      (message) => setErrors({ code: message }),
    );
  };

  if (challengeId)
    return (
      <div>
        <ShieldCheck className="size-8 text-forest" aria-hidden="true" />
        <h1 className="mt-3 text-2xl">Vérification en deux étapes</h1>
        <p className="mt-1.5 text-ink-soft">
          {backup
            ? 'Saisissez un de vos codes de secours. Chaque code ne fonctionne qu’une fois.'
            : `Saisissez le code à 6 chiffres envoyé à ${maskEmail(values.email.trim())}. Il expire dans 10 minutes.`}
        </p>
        <form onSubmit={verify} noValidate className="mt-5 space-y-4">
          {backup ? (
            <TextField
              label="Code de secours"
              placeholder="XXXX-XXXX"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              error={errors.code}
              autoFocus
            />
          ) : (
            <TextField
              label="Code de vérification"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              error={errors.code}
              autoFocus
            />
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={backup ? code.replace(/[^A-Z0-9]/g, '').length !== 8 : code.length !== 6}
          >
            Valider
          </Button>
        </form>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-forest hover:underline"
          onClick={() => {
            setBackup((b) => !b);
            setCode('');
            setErrors({});
          }}
        >
          {backup ? 'Utiliser le code reçu' : 'Pas accès au code ? Utiliser un code de secours'}
        </button>
        <div className="mt-4 flex justify-between text-sm">
          <button
            type="button"
            onClick={() => start()}
            disabled={busy}
            className="font-semibold text-forest hover:underline"
          >
            Renvoyer un code
          </button>
          <button
            type="button"
            onClick={() => {
              setChallengeId(null);
              setValues((v) => ({ ...v, password: '' }));
              setErrors({});
            }}
            className="text-ink-muted hover:underline"
          >
            Changer de compte
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl">Connexion au back-office</h1>
      <p className="mt-1.5 text-ink-soft">Réservé à l’équipe de la boutique.</p>
      <form onSubmit={start} noValidate className="mt-6 space-y-4">
        <TextField
          label="Adresse e-mail professionnelle"
          type="email"
          autoComplete="username"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
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
        {errors.form && (
          <p className="text-sm font-medium text-danger" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Continuer
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink-muted">
        <Link to="/admin/mot-de-passe-oublie" className="font-semibold text-forest hover:underline">
          Mot de passe oublié ?
        </Link>{' '}
        Sans code de secours, demandez une nouvelle invitation à l’administrateur principal.
      </p>
    </div>
  );
}
