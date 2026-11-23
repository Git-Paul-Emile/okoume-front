import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { adminTeamBackend } from '../adminTeam.backend';
import { passwordError } from '../adminSecurity';
import { AdminAuthShell } from './AdminAuthShell';
import { BackupCodesList } from './BackupCodesList';

type Step = 'password' | 'code' | 'codes';

/**
 * Invitation sur l'API (19.2) : mot de passe choisi, code reçu par e-mail, puis codes de secours remis une seule
 * fois par le serveur. Le mot de passe n'est envoyé qu'avec le code, en une seule requête.
 */
export function ServerInvite({ token }: { token: string }) {
  const [step, setStep] = useState<Step>('password');
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const acceptsAnyCode = import.meta.env.DEV || import.meta.env.VITE_SIMULATE_CONFIRMATIONS === 'true';
  const start = useMutation({
    mutationFn: () => adminTeamBackend.startInvitation(token),
    onSuccess: () => setStep('code'),
    onError: (e) => setError(getErrorMessage(e)),
  });
  const accept = useMutation({
    mutationFn: () => adminTeamBackend.acceptInvitation(token, code.trim(), pw.password),
    onSuccess: () => setStep('codes'),
    onError: (e) => setError(getErrorMessage(e)),
  });

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    const err = passwordError(pw.password, pw.confirm);
    if (err) return setError(err);
    setError('');
    start.mutate();
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setError('Saisissez le code reçu par e-mail.');
    if (!acceptsAnyCode && !/^\d{6}$/.test(code.trim())) return setError('Saisissez les 6 chiffres reçus par e-mail.');
    setError('');
    accept.mutate();
  };

  return (
    <AdminAuthShell>
      <h1 className="text-2xl">Bienvenue{start.data ? `, ${start.data.firstName}` : ''}</h1>
      <p className="mt-1.5 text-ink-soft">
        Étape {step === 'password' ? 1 : step === 'code' ? 2 : 3} sur 3 : configurez votre accès au back-office.
      </p>
      <div className="mt-6">
        {step === 'password' && (
          <form onSubmit={submitPassword} noValidate className="space-y-4">
            <TextField
              label="Mot de passe"
              type="password"
              autoComplete="new-password"
              hint="12 caractères minimum, avec au moins une lettre et un chiffre."
              value={pw.password}
              onChange={(e) => setPw((v) => ({ ...v, password: e.target.value }))}
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw((v) => ({ ...v, confirm: e.target.value }))}
              error={error || undefined}
            />
            <Button type="submit" size="lg" className="w-full" loading={start.isPending}>
              Continuer
            </Button>
          </form>
        )}
        {step === 'code' && (
          <form onSubmit={submitCode} noValidate className="space-y-4">
            <p className="text-sm text-ink-soft">
              Un code à 6 chiffres vient d’être envoyé à {start.data?.email}. Il est valable 10 minutes.
            </p>
            <TextField
              label="Code reçu"
              inputMode={acceptsAnyCode ? undefined : 'numeric'}
              autoComplete="one-time-code"
              maxLength={acceptsAnyCode ? 100 : 6}
              value={code}
              onChange={(e) => setCode(acceptsAnyCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
              error={error || undefined}
            />
            <Button type="submit" size="lg" className="w-full" loading={accept.isPending}>
              Activer mon accès
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('password')}>
              Retour
            </Button>
          </form>
        )}
        {step === 'codes' && accept.data && (
          <div className="space-y-4">
            <h2 className="text-lg">Vos codes de secours</h2>
            <BackupCodesList codes={accept.data.backupCodes} />
            <ButtonLink to="/admin/connexion" size="lg" className="w-full">
              J’ai noté mes codes, me connecter
            </ButtonLink>
          </div>
        )}
      </div>
    </AdminAuthShell>
  );
}
