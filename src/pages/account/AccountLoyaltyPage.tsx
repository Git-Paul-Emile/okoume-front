import { motion } from 'motion/react';
import { Copy, Gift, Coins, Trophy } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/auth.queries';
import { BirthdayReward } from '@/features/loyalty/components/BirthdayReward';
import { useLoyaltyMovements } from '@/features/loyalty/loyalty.queries';
import { tierProgress } from '@/features/loyalty/loyalty.utils';
import { useMyPromoCodes } from '@/features/promotions/promotions.queries';
import { useSettings } from '@/features/settings/settings.queries';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { cn } from '@/utils/text';

export default function AccountLoyaltyPage() {
  const { user } = useCurrentUser();
  const { data: settings } = useSettings();
  const { data: movements } = useLoyaltyMovements();
  const { data: myCodes = [] } = useMyPromoCodes();
  if (!user || !settings) return null;

  const { current, next, progress, remaining } = tierProgress(settings.tiers, user.totalSpent);
  const value = user.loyaltyPoints * settings.loyalty.pointValue;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Fidélité et parrainage</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-forest p-6 text-white">
          <p className="flex items-center gap-2 text-sm text-white/80">
            <Coins className="size-4" /> Solde de points
          </p>
          <p className="mt-2 text-4xl font-extrabold">{user.loyaltyPoints}</p>
          <p className="mt-1 text-sm text-white/80">
            {user.loyaltyPoints < 0
              ? 'Solde négatif après le remboursement d’une commande'
              : `soit ${formatPrice(value)} de réduction possible`}
          </p>
          <p className="mt-4 text-xs text-white/70">
            {user.loyaltyPoints < 0
              ? 'Vos points ne sont pas utilisables tant que le solde reste négatif ; vos prochains achats le compensent.'
              : user.loyaltyPoints >= settings.loyalty.minRedeem
                ? 'Utilisables dès maintenant dans votre panier.'
                : `Utilisables à partir de ${settings.loyalty.minRedeem} points.`}{' '}
            Les points n’expirent pas.
          </p>
        </div>
        <div className="card p-6">
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Trophy className="size-4 text-gold" /> Niveau actuel
          </p>
          <p className="mt-2 text-3xl font-extrabold">{current.name}</p>
          {next ? (
            <>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sage">
                <motion.div
                  className="h-full rounded-full bg-mure"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                Encore {formatPrice(remaining)} d’achats livrés et payés pour atteindre le niveau {next.name}.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Vous avez atteint le niveau le plus élevé.</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg">Les niveaux</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {settings.tiers.map((t) => (
            <div
              key={t.id}
              className={cn(
                'rounded-lg border p-4',
                t.id === current.id ? 'border-forest bg-forest-50' : 'border-sage',
              )}
            >
              <p className="font-bold">{t.name}</p>
              <p className="text-xs text-ink-muted">
                {t.threshold ? `dès ${formatPrice(t.threshold)} d’achats` : 'dès la première commande'}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {t.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-muted">
          1 point par tranche de {formatPrice(settings.loyalty.earnPer)} dépensés sur les produits (après réductions,
          hors livraison), crédité après livraison et paiement. 1 point = {formatPrice(settings.loyalty.pointValue)}.
        </p>
      </div>

      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className="grid shrink-0 place-items-center text-mure">
          <Gift className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg">Parrainez vos proches</h2>
          <p className="text-sm text-ink-soft">
            Vous êtes récompensé lorsque la première commande de votre filleul est livrée et payée.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(user.referralCode).then(() => toast.success('Code de parrainage copié'))
          }
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-mure px-4 py-2.5 font-mono font-bold text-mure hover:bg-mure-50"
        >
          {user.referralCode} <Copy className="size-4" />
        </button>
      </div>

      <BirthdayReward user={user} settings={settings} />

      {myCodes.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-3 text-lg">Mes codes personnels</h2>
          <ul className="divide-y divide-sage text-sm">
            {myCodes.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-mono font-semibold">{c.code}</span>
                  <span className="block text-ink-soft">{c.label}</span>
                  <span className="block text-xs text-ink-muted">
                    Valable jusqu’au {formatDate(c.endsAt)}, une fois
                  </span>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(c.code);
                    toast.success('Code copié');
                  }}
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Copier
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-3 text-lg">Historique des points</h2>
        {movements?.length ? (
          <ul className="divide-y divide-sage">
            {movements
              .filter((m) => m.status !== 'rejected')
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="block font-medium">{m.label}</span>
                    <span className="text-xs text-ink-muted">
                      {formatDate(m.createdAt)}
                      {m.status === 'pending' && ' · en cours de vérification'}
                    </span>
                  </span>
                  <span className={cn('font-bold tabular-nums', m.points >= 0 ? 'text-forest' : 'text-mure')}>
                    {m.points > 0 ? '+' : ''}
                    {m.points}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Aucun mouvement pour le moment.</p>
        )}
      </div>
    </div>
  );
}
