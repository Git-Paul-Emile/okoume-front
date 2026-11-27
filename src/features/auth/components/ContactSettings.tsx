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

type ContactType = 'email' | 'phone';

/** Coordonnées de contact modifiables directement depuis le compte connecté. */
export function ContactSettings({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<ContactType>('email');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditing(false);
    setValue('');
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contact = value.trim();
    if (type === 'email' && !/^\S+@\S+\.\S+$/.test(contact)) return setError('Saisissez une adresse e-mail valide.');
    if (type === 'phone' && !gabonPhone.safeParse(contact).success) return setError('Saisissez un numéro gabonais valide.');

    setBusy(true);
    setError('');
    try {
      await authBackend.updateContact({ type, value: contact });
      await queryClient.invalidateQueries({ queryKey: userKey(user.id) });
      toast.success('Coordonnées mises à jour');
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-lg">Coordonnées de contact</h2>
      <div>
        <p className="text-xs text-ink-muted">Adresse e-mail</p>
        <p className="font-medium">{user.email}</p>
      </div>
      <div>
        <p className="text-xs text-ink-muted">Téléphone</p>
        <p className="font-medium">{user.phone || 'Non renseigné'}</p>
      </div>

      {!editing ? (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Modifier mes coordonnées</Button>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 border-t border-sage pt-4">
          <SelectField label="À modifier" value={type} onChange={(event) => setType(event.target.value as ContactType)}>
            <option value="email">Adresse e-mail</option>
            <option value="phone">Téléphone</option>
          </SelectField>
          <TextField
            label={type === 'email' ? 'Adresse e-mail' : 'Téléphone'}
            type={type === 'email' ? 'email' : 'tel'}
            autoComplete={type === 'email' ? 'email' : 'tel'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>Enregistrer</Button>
            <Button type="button" variant="ghost" onClick={reset}>Annuler</Button>
          </div>
        </form>
      )}
    </div>
  );
}
