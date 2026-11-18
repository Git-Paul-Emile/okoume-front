import { Cake } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useUpdateUser } from '@/features/auth/auth.queries';
import type { User } from '@/features/auth/auth.types';
import type { ShopSettings } from '@/features/settings/settings.types';
import { toast } from '@/stores/toastStore';
import { cn } from '@/utils/text';
import { gabonFormatter } from '@/utils/formatDate';

const dayMonth = gabonFormatter({ day: 'numeric', month: 'long' });

/** Cadeau d'anniversaire (12.5) : le client choisit entre des points bonus et un code de réduction. */
export function BirthdayReward({ user, settings }: { user: User; settings: ShopSettings }) {
  const reward = settings.birthdayReward;
  const update = useUpdateUser();
  const [today] = useState(() => new Date());
  if (!reward?.enabled) return null;

  const options = [
    { id: 'points' as const, title: `${reward.points} points bonus`, detail: 'Crédités sur votre solde le jour J.' },
    { id: 'code' as const, title: `Code de ${reward.percent} %`, detail: 'Valable 30 jours sur une commande.' },
  ];
  const choice = user.birthdayRewardChoice ?? 'points';

  let next: Date | null = null;
  if (user.birthday) {
    const b = new Date(user.birthday);
    next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      next.setFullYear(today.getFullYear() + 1);
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-lg">
        <Cake className="size-5 text-mure" aria-hidden="true" />
        Cadeau d’anniversaire
      </h2>
      {!user.birthday ? (
        <p className="mt-2 text-sm text-ink-soft">
          Indiquez votre date de naissance dans{' '}
          <Link to="/compte/profil" className="font-semibold text-forest hover:underline">
            votre profil
          </Link>{' '}
          pour recevoir un cadeau chaque année.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Prochain anniversaire : {dayMonth.format(next!)}. Choisissez votre cadeau, vous pouvez changer d’avis
            jusqu’à la veille.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Cadeau d’anniversaire">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={choice === o.id}
                onClick={() =>
                  choice !== o.id &&
                  update.mutate(
                    { birthdayRewardChoice: o.id },
                    { onSuccess: () => toast.success('Choix enregistré', { description: o.title }) },
                  )
                }
                className={cn(
                  'rounded-lg border-2 p-4 text-left transition-colors',
                  choice === o.id ? 'border-forest' : 'border-sage hover:border-sage-dark',
                )}
              >
                <span className="block font-bold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{o.detail}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
