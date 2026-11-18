import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { authBackend } from '../auth.backend';
import { userKey } from '../auth.queries';
import { gabonPhone } from '../auth.schemas';
import type { User } from '../auth.types';
import { CodeStep } from './CodeStep';

type ContactType = 'email' | 'phone';

/**
 * Coordonnées de connexion (19.1). Changement en deux temps, vérifié par l'API : mot de passe, puis code.
 * Une nouvelle adresse reçoit son code ; pour un numéro, le code part à l'adresse du compte (pas de SMS).
 */
export function ContactSettings({ user }: { user: User }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<'view' | 'form' | 'code'>('view');
  const [type, setType] = useState<ContactType>('email');
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep('view');
    setValue('');
    setPassword('');
    setError('');
  };

  const request = async () => authBackend.requestContactChange({ type, value: value.trim(), password });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return setError('Saisissez une adresse e-mail valide.');
    if (type === 'phone' && !gabonPhone.safeParse(v).success) return setError('Saisissez un numéro gabonais valide.');
    if (!password) return setError('Saisissez votre mot de passe actuel.');
    setBusy(true);
    try {
      await request();
      setError('');
      setStep('code');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg">Coordonnées de connexion</h2>
      <div>
        <p className="text-xs text-ink-muted">Adresse e-mail</p>
        <p className="font-medium">{user.email}</p>
        {user.emailVerifiedAt && <p className="text-xs text-forest">Adresse vérifiée</p>}
      </div>
      <div>
        <p className="text-xs text-ink-muted">Téléphone</p>
        <p className="font-medium">{user.phone || 'Non renseigné'}</p>
      </div>
      <p className="text-xs text-ink-muted">Vous pouvez vous connecter avec l’une ou l’autre.</p>

      {step === 'view' && (
        <Button variant="outline" size="sm" onClick={() => setStep('form')}>
          Modifier mes coordonnées
        </Button>
      )}

      {step === 'form' && (
        <form onSubmit={submit} noValidate className="space-y-4 border-t border-sage pt-4">
          <SelectField label="À modifier" value={type} onChange={(e) => setType(e.target.value as ContactType)}>
            <option value="email">Adresse e-mail</option>
            <option value="phone">Téléphone</option>
          </SelectField>
          <TextField
            label={type === 'email' ? 'Nouvelle adresse e-mail' : 'Nouveau numéro'}
            type={type === 'email' ? 'email' : 'tel'}
            autoComplete={type === 'email' ? 'email' : 'tel'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            hint={
              type === 'email'
                ? 'Un code vous sera envoyé à cette nouvelle adresse.'
                : `Un code vous sera envoyé à ${user.email}.`
            }
          />
          <TextField
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              Recevoir un code
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {step === 'code' && (
        <div className="border-t border-sage pt-4">
          <CodeStep
            target={type === 'email' ? value.trim() : user.email}
            confirmLabel="Confirmer le changement"
            onBack={() => setStep('form')}
            onVerified={() => {
              toast.success('Coordonnées mises à jour');
              void qc.invalidateQueries({ queryKey: userKey(user.id) });
              reset();
            }}
            server={{ verify: (code) => authBackend.confirmContactChange(code), resend: request }}
          />
        </div>
      )}
    </div>
  );
}
