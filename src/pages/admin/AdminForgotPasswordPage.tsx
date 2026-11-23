import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { passwordError } from '@/features/admin/adminSecurity';
import { AdminAuthShell } from '@/features/admin/components/AdminAuthShell';
import { staffBackend } from '@/features/admin/staff.backend';
import { toast } from '@/stores/toastStore';

/**
 * Mot de passe oublié de l'équipe : code reçu par e-mail et code de secours, pour garder deux facteurs. Sans code
 * de secours, l'administrateur principal envoie une nouvelle invitation.
 */
export default function AdminForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const acceptsAnyCode = import.meta.env.DEV || import.meta.env.VITE_SIMULATE_CONFIRMATIONS === 'true';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Saisissez votre adresse e-mail professionnelle.');
    void run(async () => {
      await staffBackend.requestPasswordReset(email);
      setStep('reset');
    });
  };

  const reset = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setError('Saisissez le code reçu par e-mail.');
    if (!acceptsAnyCode && !/^\d{6}$/.test(code.trim())) return setError('Le code reçu par e-mail contient 6 chiffres.');
    if (backupCode.trim().length < 8) return setError('Saisissez un de vos codes de secours.');
    const invalid = passwordError(password, confirm);
    if (invalid) return setError(invalid);
    void run(async () => {
      await staffBackend.confirmPasswordReset({ email, code: code.trim(), backupCode: backupCode.trim(), password });
      toast.success('Mot de passe changé', { description: 'Reconnectez-vous avec votre nouveau mot de passe.' });
      navigate('/admin/connexion', { replace: true });
    });
  };

  return (
    <AdminAuthShell>
      <div className="card w-full max-w-md p-8">
        <KeyRound className="size-8 text-forest" />
        <h1 className="mt-3 text-2xl">Mot de passe oublié</h1>
        {step === 'email' ? (
          <form onSubmit={requestCode} noValidate className="mt-5 space-y-4">
            <p className="text-sm text-ink-soft">
              Un code vous sera envoyé par e-mail. Un de vos codes de secours vous sera aussi demandé.
            </p>
            <TextField
              label="Adresse e-mail professionnelle"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Recevoir un code
            </Button>
          </form>
        ) : (
          <form onSubmit={reset} noValidate className="mt-5 space-y-4">
            <p className="text-sm text-ink-soft">
              Si cette adresse correspond à un membre actif, un code vient d’y être envoyé.
            </p>
            <TextField
              label="Code reçu par e-mail"
              inputMode={acceptsAnyCode ? undefined : 'numeric'}
              autoComplete="one-time-code"
              maxLength={acceptsAnyCode ? 100 : 6}
              value={code}
              onChange={(e) => setCode(acceptsAnyCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
            />
            <TextField label="Code de secours" value={backupCode} onChange={(e) => setBackupCode(e.target.value)} />
            <TextField
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="12 caractères au moins, avec au moins une lettre et un chiffre."
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Changer le mot de passe
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-ink-muted">
          <Link to="/admin/connexion" className="font-semibold text-forest hover:underline">
            Retour à la connexion
          </Link>
          . Sans code de secours, demandez une nouvelle invitation à l’administrateur principal.
        </p>
      </div>
    </AdminAuthShell>
  );
}
