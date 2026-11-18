import { useState, type FormEvent, type ReactNode } from 'react';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import type { ShopSettings } from '@/features/settings/settings.types';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminMutation, useAdminSettings } from '@/features/admin/admin.queries';
import { PageIntro } from '@/features/admin/components/Toolbar';

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  if (isLoading || !data) return <PageLoader />;
  return <SettingsForm settings={data} />;
}

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);

function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [mm, setMm] = useState(settings.mobileMoney);
  const [support, setSupport] = useState(settings.support);
  const [social, setSocial] = useState({ facebook: '', instagram: '', tiktok: '', ...settings.social });
  const [rules, setRules] = useState({
    maxDiscount: String(Math.round(settings.maxDiscountRate * 100)),
    returnDays: String(settings.returnWindowDays),
    earnPer: String(settings.loyalty.earnPer),
    pointValue: String(settings.loyalty.pointValue),
    minRedeem: String(settings.loyalty.minRedeem),
    reopenDays: String(settings.reopenWindowDays ?? 15),
    maxAddresses: String(settings.maxAddresses ?? 5),
    cashAlertHours: String(settings.cashPreparationAlertHours ?? 24),
    assistantBudget: String(settings.assistantMonthlyBudget ?? 0),
    escalationHours: String(settings.alertEscalationHours ?? 4),
    reviewAmount: String(settings.reviewAmount ?? 500000),
    referralReward: String(settings.referralReward ?? 300),
    argent: String(settings.tiers.find((t) => t.id === 'argent')?.threshold ?? 0),
    or: String(settings.tiers.find((t) => t.id === 'or')?.threshold ?? 0),
    welcomePercent: String(settings.welcomeCode?.enabled ? settings.welcomeCode.percent : 0),
    welcomeDays: String(settings.welcomeCode?.validDays ?? 30),
    birthdayPoints: String(settings.birthdayReward?.points ?? 200),
    birthdayPercent: String(settings.birthdayReward?.percent ?? 10),
  });
  const [error, setError] = useState('');
  // Valeur du point, délais de retour et de réouverture, nombre d'adresses sont fixés par le serveur, qui
  // calcule aussi le niveau de chaque client à la lecture (12.4) : rien à reclasser après un changement de seuils
  const save = useAdminMutation(
    (patch: Partial<ShopSettings>) => adminApi.updateSettings(patch),
    'Paramètres enregistrés',
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, int(v)])) as Record<
      keyof typeof rules,
      number
    >;
    if (Object.values(n).some((v) => Number.isNaN(v))) return setError('Les règles doivent être des nombres entiers.');
    if (!(n.argent > 0 && n.or > n.argent)) return setError('Seuils de fidélité : Or doit être supérieur à Argent.');
    if (n.welcomePercent < 0 || n.welcomePercent > 50) return setError('Code de bienvenue : entre 0 et 50 %.');
    if (n.maxDiscount < 0 || n.maxDiscount > 90)
      return setError('Le plafond de remise doit être compris entre 0 et 90 %.');
    if (Object.values(social).some((url) => url.trim() && !/^https:\/\/\S+$/.test(url.trim())))
      return setError('Les liens des réseaux sociaux doivent commencer par https://');
    if (mm.some((m) => !m.number.trim() || !m.beneficiary.trim()))
      return setError('Renseignez le numéro et le bénéficiaire de chaque compte Mobile Money.');
    setError('');
    save.mutate({
      mobileMoney: mm,
      support,
      social: Object.fromEntries(Object.entries(social).map(([k, v]) => [k, v.trim()])),
      maxDiscountRate: n.maxDiscount / 100,
      returnWindowDays: n.returnDays,
      loyalty: { earnPer: n.earnPer, pointValue: n.pointValue, minRedeem: n.minRedeem },
      reopenWindowDays: n.reopenDays,
      maxAddresses: Math.min(20, Math.max(1, n.maxAddresses)),
      cashPreparationAlertHours: Math.max(1, n.cashAlertHours),
      assistantMonthlyBudget: n.assistantBudget,
      alertEscalationHours: Math.max(1, n.escalationHours),
      reviewAmount: n.reviewAmount,
      referralReward: n.referralReward,
      tiers: settings.tiers.map((t) =>
        t.id === 'argent' ? { ...t, threshold: n.argent } : t.id === 'or' ? { ...t, threshold: n.or } : t,
      ),
      welcomeCode: { enabled: n.welcomePercent > 0, percent: n.welcomePercent, validDays: Math.max(1, n.welcomeDays) },
      birthdayReward: {
        enabled: n.birthdayPoints > 0 || n.birthdayPercent > 0,
        points: n.birthdayPoints,
        percent: n.birthdayPercent,
      },
    });
  };

  const setRule = (k: keyof typeof rules) => (e: { target: { value: string } }) =>
    setRules((r) => ({ ...r, [k]: e.target.value }));

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl">
      <PageIntro
        actions={
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        }
      >
        Ces réglages s’appliquent immédiatement à la boutique : vérifiez bien les numéros Mobile Money avant
        d’enregistrer.
        {' Les champs grisés sont fixés par la configuration du serveur.'}
      </PageIntro>

      <div className="space-y-5">
        <Panel
          title="Comptes Mobile Money"
          description="Affichés au client après sa commande, avec le montant exact et la référence."
        >
          {mm.map((m, i) => (
            <div key={m.method} className="space-y-4 border-b border-sage pb-5 last:border-0 last:pb-0">
              <p className="font-semibold">{m.label}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Numéro bénéficiaire"
                  value={m.number}
                  onChange={(e) => setMm((l) => l.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))}
                />
                <TextField
                  label="Nom du bénéficiaire"
                  value={m.beneficiary}
                  onChange={(e) => setMm((l) => l.map((x, j) => (j === i ? { ...x, beneficiary: e.target.value } : x)))}
                />
              </div>
              <TextAreaField
                label="Instructions"
                rows={2}
                value={m.instructions}
                onChange={(e) => setMm((l) => l.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)))}
              />
            </div>
          ))}
        </Panel>

        <Panel
          title="Contact et assistance"
          description="Affichés dans le pied de page, la page Contact et l’assistant."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Téléphone"
              value={support.phone}
              onChange={(e) => setSupport({ ...support, phone: e.target.value })}
            />
            <TextField
              label="WhatsApp (chiffres uniquement)"
              inputMode="numeric"
              value={support.whatsapp}
              onChange={(e) => setSupport({ ...support, whatsapp: e.target.value })}
            />
            <TextField
              label="E-mail"
              type="email"
              value={support.email}
              onChange={(e) => setSupport({ ...support, email: e.target.value })}
            />
            <TextField
              label="Horaires"
              value={support.hours}
              onChange={(e) => setSupport({ ...support, hours: e.target.value })}
            />
          </div>
          <TextField
            label="Adresse"
            value={support.address}
            onChange={(e) => setSupport({ ...support, address: e.target.value })}
          />
        </Panel>

        <Panel
          title="Réseaux sociaux"
          description="Liens affichés dans le pied de page. Laissez vide pour masquer un réseau."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {(['facebook', 'instagram', 'tiktok'] as const).map((k) => (
              <TextField
                key={k}
                label={{ facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' }[k]}
                type="url"
                placeholder="https://"
                optional
                value={social[k] ?? ''}
                onChange={(e) => setSocial((x) => ({ ...x, [k]: e.target.value }))}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Règles de vente">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Remise maximale (%)"
              inputMode="numeric"
              value={rules.maxDiscount}
              onChange={setRule('maxDiscount')}
              hint="Toutes remises cumulées."
            />
            <TextField
              label="Délai de retour (jours)"
              inputMode="numeric"
              value={rules.returnDays}
              onChange={setRule('returnDays')}
              disabled
            />
            <TextField
              label="Délai de réouverture (jours)"
              inputMode="numeric"
              value={rules.reopenDays}
              onChange={setRule('reopenDays')}
              disabled
              hint="Pour rouvrir une demande d’assistance ou un retour refusé."
            />
            <TextField
              label="Alerte commandes non préparées (heures)"
              inputMode="numeric"
              value={rules.cashAlertHours}
              onChange={setRule('cashAlertHours')}
              hint="Une alerte, jamais d’annulation automatique."
            />
            <TextField
              label="Adresses par client (maximum)"
              inputMode="numeric"
              value={rules.maxAddresses}
              onChange={setRule('maxAddresses')}
              disabled
              hint="Entre 1 et 20."
            />
            <TextField
              label="Assistant client : requêtes par mois"
              inputMode="numeric"
              value={rules.assistantBudget}
              onChange={setRule('assistantBudget')}
              hint="Au-delà, l’assistant est suspendu jusqu’au mois suivant. 0 pour ne pas plafonner."
            />
            <TextField
              label="Escalade des alertes critiques (heures)"
              inputMode="numeric"
              value={rules.escalationHours}
              onChange={setRule('escalationHours')}
              hint="Relance si une alerte critique n’est pas prise en charge."
            />
            <TextField
              label="Vérification des commandes à partir de (FCFA)"
              inputMode="numeric"
              value={rules.reviewAmount}
              onChange={setRule('reviewAmount')}
              hint="Au-delà, la commande attend une vérification avant la préparation, avec les autres signaux. 0 pour ne pas contrôler le montant."
            />
          </div>
        </Panel>

        <Panel title="Fidélité">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="1 point par tranche de (FCFA)"
              inputMode="numeric"
              value={rules.earnPer}
              onChange={setRule('earnPer')}
              disabled
            />
            <TextField
              label="Valeur d’un point (FCFA)"
              inputMode="numeric"
              value={rules.pointValue}
              onChange={setRule('pointValue')}
              disabled
            />
            <TextField
              label="Minimum pour utiliser ses points"
              inputMode="numeric"
              value={rules.minRedeem}
              onChange={setRule('minRedeem')}
              disabled
            />
            <TextField
              label="Parrainage : points du parrain"
              inputMode="numeric"
              value={rules.referralReward}
              onChange={setRule('referralReward')}
              hint="À la première commande livrée du filleul."
            />
            <TextField
              label="Niveau Argent à partir de (FCFA)"
              inputMode="numeric"
              value={rules.argent}
              onChange={setRule('argent')}
              hint="Achats livrés et payés, nets des remboursements."
            />
            <TextField
              label="Niveau Or à partir de (FCFA)"
              inputMode="numeric"
              value={rules.or}
              onChange={setRule('or')}
            />
            <TextField
              label="Code de bienvenue (%)"
              inputMode="numeric"
              value={rules.welcomePercent}
              onChange={setRule('welcomePercent')}
              hint="Après la première commande livrée et payée. 0 pour désactiver."
            />
            <TextField
              label="Validité du code de bienvenue (jours)"
              inputMode="numeric"
              value={rules.welcomeDays}
              onChange={setRule('welcomeDays')}
            />
            <TextField
              label="Anniversaire : points bonus"
              inputMode="numeric"
              value={rules.birthdayPoints}
              onChange={setRule('birthdayPoints')}
            />
            <TextField
              label="Anniversaire : code de réduction (%)"
              inputMode="numeric"
              value={rules.birthdayPercent}
              onChange={setRule('birthdayPercent')}
              hint="Le client choisit entre les deux. 0 et 0 désactive le cadeau."
            />
          </div>
        </Panel>

        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </form>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
