import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { toast } from '@/stores/toastStore';
import { authBackend } from '../auth.backend';
import { loginSchema, registerSchema } from '../auth.schemas';
import { maskTarget } from '../verification';

/**
 * Mot de passe oublié sur l'API (19.1) : l'API envoie un code, puis vérifie code et nouveau mot de passe
 * ensemble. Elle répond de la même façon que le compte existe ou non, pour ne pas révéler les comptes.
 */
export function ServerPasswordReset() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [v, setV] = useState({ code: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const request = async (e?: FormEvent) => {
    e?.preventDefault();
    const r = loginSchema.shape.email.safeParse(identifier);
    if (!r.success) return setErrors({ identifier: r.error.issues[0].message });
    setErrors({});
    setBusy(true);
    try {
      await authBackend.requestPasswordReset(r.data);
      if (sent) toast.success('Nouveau code envoyé', { description: 'Le code précédent ne fonctionne plus.' });
      setSent(true);
    } catch (error) {
      setErrors({ identifier: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^\d{6}$/.test(v.code)) next.code = 'Le code contient 6 chiffres.';
    const password = registerSchema.shape.password.safeParse(v.password);
    if (!password.success) next.password = password.error.issues[0].message;
    else if (v.password !== v.confirm) next.confirm = 'Les deux mots de passe sont différents.';
    if (Object.keys(next).length) return setErrors(next);
    setErrors({});
    setBusy(true);
    try {
      await authBackend.confirmPasswordReset(identifier.trim(), v.code, v.password);
      toast.success('Mot de passe modifié', { description: 'Connectez-vous avec votre nouveau mot de passe.' });
      navigate('/connexion', { replace: true });
    } catch (error) {
      setErrors({ form: getErrorMessage(error), ...apiFieldErrors(error) });
    } finally {
      setBusy(false);
    }
  };

  if (!sent)
    return (
      <form onSubmit={request} noValidate className="mt-6 space-y-4">
        <p className="text-ink-soft">Nous vous envoyons un code par e-mail pour choisir un nouveau mot de passe.</p>
        <TextField
          label="E-mail ou téléphone"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Recevoir un code
        </Button>
      </form>
    );

  return (
    <form onSubmit={confirm} noValidate className="mt-6 space-y-4">
      <p className="text-sm text-ink-soft">
        Si un compte correspond à {identifier.includes('@') ? maskTarget(identifier.trim()) : 'ce numéro'}, un code à 6
        chiffres a été envoyé à son adresse e-mail. Il expire dans 10 minutes.
      </p>
      <TextField
        label="Code de vérification"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={v.code}
        onChange={(e) => setV((x) => ({ ...x, code: e.target.value.replace(/\D/g, '') }))}
        error={errors.code}
      />
      <TextField
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
        value={v.password}
        onChange={(e) => setV((x) => ({ ...x, password: e.target.value }))}
        error={errors.password}
      />
      <TextField
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        value={v.confirm}
        onChange={(e) => setV((x) => ({ ...x, confirm: e.target.value }))}
        error={errors.confirm}
      />
      {errors.form && (
        <p className="text-sm font-medium text-danger" role="alert">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Enregistrer le mot de passe
        </Button>
        <Button type="button" variant="outline" onClick={() => void request()} disabled={busy}>
          Renvoyer un code
        </Button>
        <Button type="button" variant="ghost" onClick={() => setSent(false)}>
          Retour
        </Button>
      </div>
    </form>
  );
}
