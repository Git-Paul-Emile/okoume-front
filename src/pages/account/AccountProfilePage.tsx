import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCurrentUser, useUpdateUser } from '@/features/auth/auth.queries';
import { profileSchema } from '@/features/auth/auth.schemas';
import { ContactSettings } from '@/features/auth/components/ContactSettings';
import { NotificationPreferences } from '@/features/auth/components/NotificationPreferences';
import { PrivacySection } from '@/features/privacy/components/PrivacySection';
import { toast } from '@/stores/toastStore';
import { fieldErrors } from '@/utils/zodErrors';

export default function AccountProfilePage() {
  const { user } = useCurrentUser();
  const update = useUpdateUser();
  const [v, setV] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    birthday: user?.birthday ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!user) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Le téléphone se change à part, avec vérification par code
    const r = profileSchema.safeParse({ ...v, phone: user.phone });
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    const { phone: _phone, ...profile } = r.data;
    void _phone;
    update.mutate(
      { ...profile, birthday: profile.birthday || null },
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
        <TextField
          label="Date de naissance"
          type="date"
          optional
          {...field('birthday')}
          hint="Pour recevoir une attention le jour de votre anniversaire."
        />
        <Button type="submit" loading={update.isPending}>
          Enregistrer
        </Button>
      </form>

      <ContactSettings user={user} />

      <NotificationPreferences user={user} />

      <PrivacySection />
    </div>
  );
}
