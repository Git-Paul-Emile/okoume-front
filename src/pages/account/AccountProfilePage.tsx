import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCurrentUser, useUpdateUser } from '@/features/auth/auth.queries';
import { profileSchema } from '@/features/auth/auth.schemas';
import { ContactSettings } from '@/features/auth/components/ContactSettings';
import { NotificationPreferences } from '@/features/auth/components/NotificationPreferences';
import { toast } from '@/stores/toastStore';
import { fieldErrors } from '@/utils/zodErrors';

export default function AccountProfilePage() {
  const { user } = useCurrentUser();
  const update = useUpdateUser();
  const [v, setV] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!user) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = profileSchema.safeParse(v);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    update.mutate(
      r.data,
      {
        onSuccess: () => toast.success('Profil enregistré'),
        onError: () => toast.error('Le profil n’a pas pu être enregistré. Réessayez.'),
      },
    );
  };

  const field = (k: keyof typeof v) => ({
    value: v[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Profil et préférences</h1>
      <form onSubmit={submit} noValidate className="card space-y-4 p-6">
        <h2 className="text-lg">Informations personnelles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" autoComplete="given-name" {...field('firstName')} />
          <TextField label="Nom" autoComplete="family-name" {...field('lastName')} />
        </div>
        <Button type="submit" loading={update.isPending}>
          Enregistrer
        </Button>
      </form>

      <ContactSettings user={user} />

      <NotificationPreferences user={user} />

    </div>
  );
}
