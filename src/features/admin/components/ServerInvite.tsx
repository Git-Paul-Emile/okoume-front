import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/ApiError';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { passwordError } from '../adminSecurity';
import { adminTeamBackend } from '../adminTeam.backend';
import { AdminAuthShell } from './AdminAuthShell';

export function ServerInvite({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const accept = useMutation({
    mutationFn: () => adminTeamBackend.acceptInvitation(token, password),
    onError: (cause) => setError(getErrorMessage(cause)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = passwordError(password, confirm);
    if (invalid) return setError(invalid);
    setError('');
    accept.mutate();
  };

  return (
    <AdminAuthShell>
      <h1 className="text-2xl">Activer votre compte</h1>
      <p className="mt-1.5 text-ink-soft">Choisissez le mot de passe de votre accès au back-office.</p>
      <div className="mt-6">
        {accept.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-forest">Votre compte est activé.</p>
            <ButtonLink to="/admin/connexion" size="lg" className="w-full">Se connecter</ButtonLink>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <TextField
              label="Mot de passe"
              type="password"
              autoComplete="new-password"
              hint="12 caractères minimum, avec au moins une lettre et un chiffre."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextField
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              error={error || undefined}
            />
            <Button type="submit" size="lg" className="w-full" loading={accept.isPending}>Activer mon compte</Button>
          </form>
        )}
      </div>
    </AdminAuthShell>
  );
}
