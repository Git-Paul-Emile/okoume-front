import { useState, type FormEvent, type ReactNode } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import type { ShopSettings } from '@/features/settings/settings.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminSettings } from '@/features/admin/admin.queries';
import { PageIntro } from '@/features/admin/components/Toolbar';

type Support = ShopSettings['support'];
type Legal = NonNullable<ShopSettings['legal']>;

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  if (isLoading || !data) return <PageLoader />;
  return <SettingsForm settings={data} />;
}

function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [mobileMoney, setMobileMoney] = useState(settings.mobileMoney);
  const [expiryHours, setExpiryHours] = useState(String(settings.mobileMoneyExpiryHours));
  const [support, setSupport] = useState(settings.support);
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '', ...settings.social });
  const [legal, setLegal] = useState<Legal>(settings.legal ?? { companyName: '', nif: '', rccm: '', vatNote: '' });
  const [error, setError] = useState('');
  const save = useAdminMutation((patch: Partial<ShopSettings>) => adminApi.updateSettings(patch), 'Paramètres enregistrés');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const hours = Number(expiryHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168)
      return setError('La durée de validité doit être comprise entre 1 et 168 heures.');
    if (mobileMoney.some((account) => !account.number.trim() || !account.beneficiary.trim()))
      return setError('Renseignez le numéro et le bénéficiaire de chaque compte Mobile Money.');
    if (Object.values(social).some((url) => url.trim() && !/^https:\/\/\S+$/.test(url.trim())))
      return setError('Les liens des réseaux sociaux doivent commencer par https://');
    setError('');
    save.mutate({
      mobileMoney,
      mobileMoneyExpiryHours: hours,
      support,
      social: Object.fromEntries(Object.entries(social).map(([key, value]) => [key, value.trim()])),
      legal,
    });
  };

  const setSupportField = (key: keyof Support, value: string) => setSupport((current) => ({ ...current, [key]: value }));
  const setLegalField = (key: keyof Legal, value: string) => setLegal((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl space-y-5">
      <PageIntro
        actions={
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        }
      >
        Coordonnées de paiement et de contact affichées aux clients.
      </PageIntro>

      <Panel title="Comptes Mobile Money">
        {mobileMoney.map((account, index) => (
          <div key={account.method} className="space-y-4 border-b border-sage pb-5 last:border-0 last:pb-0">
            <p className="font-semibold">{account.label}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Numéro bénéficiaire"
                value={account.number}
                onChange={(event) =>
                  setMobileMoney((items) => items.map((item, i) => (i === index ? { ...item, number: event.target.value } : item)))
                }
              />
              <TextField
                label="Nom du bénéficiaire"
                value={account.beneficiary}
                onChange={(event) =>
                  setMobileMoney((items) =>
                    items.map((item, i) => (i === index ? { ...item, beneficiary: event.target.value } : item)),
                  )
                }
              />
            </div>
            <TextAreaField
              label="Instructions"
              rows={2}
              value={account.instructions}
              onChange={(event) =>
                setMobileMoney((items) =>
                  items.map((item, i) => (i === index ? { ...item, instructions: event.target.value } : item)),
                )
              }
            />
          </div>
        ))}
        <TextField
          label="Validité des instructions (heures)"
          inputMode="numeric"
          value={expiryHours}
          onChange={(event) => setExpiryHours(event.target.value)}
        />
      </Panel>

      <Panel title="Contact client">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Téléphone" value={support.phone} onChange={(event) => setSupportField('phone', event.target.value)} />
          <TextField
            label="WhatsApp"
            inputMode="numeric"
            value={support.whatsapp}
            onChange={(event) => setSupportField('whatsapp', event.target.value)}
          />
          <TextField label="E-mail" type="email" value={support.email} onChange={(event) => setSupportField('email', event.target.value)} />
          <TextField label="Horaires" value={support.hours} onChange={(event) => setSupportField('hours', event.target.value)} />
        </div>
        <TextField label="Adresse" value={support.address} onChange={(event) => setSupportField('address', event.target.value)} />
      </Panel>

      <Panel title="Réseaux sociaux">
        <div className="grid gap-4 sm:grid-cols-3">
          {(['facebook', 'instagram', 'tiktok'] as const).map((key) => (
            <TextField
              key={key}
              label={{ facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' }[key]}
              type="url"
              placeholder="https://"
              optional
              value={social[key] ?? ''}
              onChange={(event) => setSocial((current) => ({ ...current, [key]: event.target.value }))}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Informations légales">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Raison sociale" value={legal.companyName} onChange={(event) => setLegalField('companyName', event.target.value)} />
          <TextField label="NIF" value={legal.nif} onChange={(event) => setLegalField('nif', event.target.value)} />
          <TextField label="RCCM" value={legal.rccm} onChange={(event) => setLegalField('rccm', event.target.value)} />
        </div>
        <TextAreaField label="Mention TVA" rows={2} value={legal.vatNote} onChange={(event) => setLegalField('vatNote', event.target.value)} />
      </Panel>

      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" loading={save.isPending}>Enregistrer</Button>
      </div>
    </form>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-base">{title}</h2>
      {children}
    </section>
  );
}
