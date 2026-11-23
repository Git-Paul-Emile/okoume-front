import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { maskTarget } from '../verification';

/** Vérification par l'API : le code est envoyé par e-mail et contrôlé par le serveur (essais, expiration). */
export interface ServerCode {
  verify: (code: string) => Promise<unknown>;
  resend: () => Promise<unknown>;
}

/** Saisie d'un code reçu par e-mail ou SMS ; l'API envoie et vérifie le code. */
export function CodeStep({
  target,
  onVerified,
  onBack,
  confirmLabel = 'Valider',
  loading,
  server,
}: {
  target: string;
  onVerified: () => void;
  onBack: () => void;
  confirmLabel?: string;
  loading?: boolean;
  server: ServerCode;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const acceptsAnyCode = import.meta.env.DEV || import.meta.env.VITE_SIMULATE_CONFIRMATIONS === 'true';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!code.trim()) return setError('Saisissez le code reçu.');
    if (!acceptsAnyCode && !/^\d{6}$/.test(code)) return setError('Le code contient 6 chiffres.');
    setBusy('verify');
    try {
      await server.verify(code);
      setError('');
      onVerified();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    setCode('');
    setError('');
    setBusy('resend');
    try {
      await server.resend();
      toast.success('Nouveau code envoyé', { description: 'Le code précédent ne fonctionne plus.' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-ink-soft">
        Saisissez le code envoyé {target.includes('@') ? 'à' : 'par SMS au'} {maskTarget(target)}. Il expire dans 10
        minutes.
      </p>
      <TextField
        label="Code de vérification"
        inputMode={acceptsAnyCode ? undefined : 'numeric'}
        autoComplete="one-time-code"
        maxLength={acceptsAnyCode ? 100 : 6}
        value={code}
        onChange={(e) => setCode(acceptsAnyCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
        error={error || undefined}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={loading || busy === 'verify'}>
          {confirmLabel}
        </Button>
        <Button type="button" variant="outline" onClick={resend} loading={busy === 'resend'}>
          Renvoyer un code
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Retour
        </Button>
      </div>
    </form>
  );
}
