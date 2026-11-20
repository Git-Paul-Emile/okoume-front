import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { apiFieldErrors } from '@/api/backend';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/ui/TextField';
import { useAdminAuthStore } from '@/stores/adminAuthStore';
import { toast } from '@/stores/toastStore';
import { formatPrice } from '@/utils/formatPrice';
import { useAdminMutation } from '../admin.queries';
import { adminMarketplaceBackend, type MarketplaceSettings, type StaffAccessPlan } from '../adminMarketplace.backend';
import { can } from '../permissions';

const int = (v: string) => {
  const n = Number(v.trim());
  return v.trim() !== '' && Number.isInteger(n) ? n : null;
};

/** Champs numériques d'un formulaire : texte saisi, converti à l'envoi. */
type Draft<T> = { [K in keyof T]: T[K] extends number | null ? string : T[K] };

function AccessPlanDialog({ plan, onClose }: { plan: StaffAccessPlan | null; onClose: () => void }) {
  const [v, setV] = useState<Draft<Omit<StaffAccessPlan, 'id'>>>({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    kind: plan?.kind ?? 'paid',
    price: String(plan?.price ?? ''),
    periodDays: plan?.periodDays !== null && plan?.periodDays !== undefined ? String(plan.periodDays) : '30',
    trialDays: String(plan?.trialDays ?? 0),
    active: plan?.active ?? true,
    position: String(plan?.position ?? 0),
  });
  const [error, setError] = useState('');
  const save = useAdminMutation(
    (p: Omit<StaffAccessPlan, 'id'>) => adminMarketplaceBackend.saveAccessPlan(p, plan?.id ?? null),
    (p) => `Offre ${p.name} enregistrée`,
  );
  const free = v.kind === 'free';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = free ? 0 : int(v.price);
    const periodDays = free ? null : int(v.periodDays);
    const trialDays = free ? 0 : int(v.trialDays);
    const position = int(v.position);
    if (v.name.trim().length < 2) return setError('Nom de l’offre trop court.');
    if (price === null || trialDays === null || position === null || (!free && (periodDays === null || price <= 0)))
      return setError('Prix, durée, essai et ordre : nombres entiers ; une offre payante a un prix et une durée.');
    save.mutate(
      {
        name: v.name.trim(),
        description: v.description.trim(),
        kind: v.kind,
        price,
        periodDays,
        trialDays,
        active: v.active,
        position,
      },
      { onSuccess: onClose, onError: (err) => setError(getErrorMessage(err)) },
    );
  };

  return (
    <Modal open onClose={onClose} title={plan ? `Modifier ${plan.name}` : 'Nouvelle offre d’accès'}>
      <form onSubmit={submit} noValidate className="space-y-3">
        <TextField label="Nom" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <TextAreaField
          label="Description"
          optional
          rows={2}
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
        <SelectField
          label="Type"
          value={v.kind}
          onChange={(e) => setV({ ...v, kind: e.target.value === 'free' ? 'free' : 'paid' })}
        >
          <option value="paid">Payante</option>
          <option value="free">Gratuite</option>
        </SelectField>
        {!free && (
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Prix (FCFA)"
              inputMode="numeric"
              value={v.price}
              onChange={(e) => setV({ ...v, price: e.target.value })}
            />
            <TextField
              label="Durée (jours)"
              inputMode="numeric"
              value={v.periodDays}
              onChange={(e) => setV({ ...v, periodDays: e.target.value })}
            />
            <TextField
              label="Essai (jours)"
              inputMode="numeric"
              value={v.trialDays}
              onChange={(e) => setV({ ...v, trialDays: e.target.value })}
            />
          </div>
        )}
        <TextField
          label="Ordre d’affichage"
          inputMode="numeric"
          value={v.position}
          onChange={(e) => setV({ ...v, position: e.target.value })}
        />
        <Checkbox
          label="Proposée aux vendeurs"
          checked={v.active}
          onChange={(e) => setV({ ...v, active: e.target.checked })}
        />
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const SETTINGS_FIELDS: Array<{ key: keyof MarketplaceSettings; label: string; hint: string }> = [
  { key: 'graceDays', label: 'Délai de grâce (jours)', hint: 'Produits encore visibles après l’échéance de l’offre.' },
  {
    key: 'reminderDays',
    label: 'Rappel avant échéance (jours)',
    hint: 'Le vendeur est prévenu ce nombre de jours avant.',
  },
  {
    key: 'aiReviewMonthlyLimit',
    label: 'Vérifications automatiques par mois',
    hint: 'Au-delà, les produits vont en vérification humaine.',
  },
  {
    key: 'commissionRate',
    label: 'Commission sur les ventes des vendeurs (%)',
    hint: 'Retenue sur ce qu’un livreur Okoumé encaisse pour un vendeur, hors frais de livraison.',
  },
];

function SettingsForm({ settings, editable }: { settings: MarketplaceSettings; editable: boolean }) {
  const [v, setV] = useState<Record<keyof MarketplaceSettings, string>>({
    graceDays: String(settings.graceDays),
    reminderDays: String(settings.reminderDays),
    aiReviewMonthlyLimit: String(settings.aiReviewMonthlyLimit),
    commissionRate: String(settings.commissionRate),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAdminMutation(adminMarketplaceBackend.updateSettings, 'Réglages de la place de marché enregistrés');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const patch: Partial<MarketplaceSettings> = {};
    const next: Record<string, string> = {};
    for (const { key } of SETTINGS_FIELDS) {
      const n = int(v[key]);
      if (n === null || n < 0) next[key] = 'Nombre entier.';
      else if (n !== settings[key]) patch[key] = n;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!Object.keys(patch).length) return toast.info('Aucune modification');
    save.mutate(patch, { onError: (err) => setErrors(apiFieldErrors(err)) });
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-3 p-5">
      <h2 className="text-lg">Réglages</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            hint={f.hint}
            inputMode="numeric"
            disabled={!editable}
            value={v[f.key]}
            onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
            error={errors[f.key]}
          />
        ))}
      </div>
      {editable && (
        <Button type="submit" loading={save.isPending}>
          Enregistrer
        </Button>
      )}
    </form>
  );
}

/** Offres d'accès des boutiques et réglages des vendeurs. */
export function OffersTab() {
  const admin = useAdminAuthStore((s) => s.admin);
  const editable = can(admin, 'vendeurs:modifier');
  const plans = useQuery({
    queryKey: ['admin', 'marketplace', 'access-plans'],
    queryFn: ({ signal }) => adminMarketplaceBackend.accessPlans(signal),
  });
  const settings = useQuery({
    queryKey: ['admin', 'marketplace', 'settings'],
    queryFn: ({ signal }) => adminMarketplaceBackend.settings(signal),
  });
  const [accessDialog, setAccessDialog] = useState<StaffAccessPlan | 'new' | null>(null);

  if (plans.isLoading || settings.isLoading) return <PageLoader />;
  if (!plans.data || !settings.data) return <ErrorState error={plans.error ?? settings.error} />;

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">Offres d’accès des boutiques</h2>
          {editable && (
            <Button size="sm" onClick={() => setAccessDialog('new')}>
              Nouvelle offre
            </Button>
          )}
        </div>
        <ul className="divide-y divide-sage text-sm">
          {plans.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>{p.name}</strong> :{' '}
                {p.kind === 'free' ? 'gratuite' : `${formatPrice(p.price)} pour ${p.periodDays ?? 0} jours`}
                {p.trialDays > 0 && `, ${p.trialDays} jours d’essai`}
              </span>
              <span className="flex items-center gap-2">
                {!p.active && <Badge>Retirée</Badge>}
                {editable && (
                  <Button size="sm" variant="ghost" onClick={() => setAccessDialog(p)}>
                    Modifier
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <SettingsForm settings={settings.data} editable={editable} />

      {accessDialog && (
        <AccessPlanDialog plan={accessDialog === 'new' ? null : accessDialog} onClose={() => setAccessDialog(null)} />
      )}
    </div>
  );
}
