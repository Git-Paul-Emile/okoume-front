import { Lock } from 'lucide-react';
import { useUpdateUser } from '../auth.queries';
import type { NotificationTopic, User } from '../auth.types';

const TOPICS: Array<{ id: NotificationTopic; label: string; hint: string; locked?: boolean; enabled: boolean }> = [
  { id: 'orders', label: 'Suivi de mes commandes', hint: 'Confirmation, préparation, livraison, retours et remboursements.', locked: true, enabled: true },
  { id: 'promotions', label: 'Offres et nouveautés', hint: 'Informations par e-mail sur les offres de la boutique.', enabled: false },
];

/** Préférences e-mail uniquement ; les notifications push ont été retirées du MVP. */
export function NotificationPreferences({ user }: { user: User }) {
  const update = useUpdateUser();
  const value = (topic: (typeof TOPICS)[number]) => topic.locked || (user.notificationPrefs.topics?.[topic.id]?.email ?? topic.enabled);
  const set = (topic: NotificationTopic, checked: boolean) => {
    const topics = { ...user.notificationPrefs.topics, [topic]: { email: checked } };
    update.mutate({ notificationPrefs: { email: checked, topics } });
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg">Notifications par e-mail</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Les messages liés aux commandes restent actifs car ils contiennent des informations nécessaires au service.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="border-b border-sage text-xs text-ink-muted">
              <th className="py-2 text-left font-semibold">Type de message</th>
              <th className="w-24 py-2 text-center font-semibold">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {TOPICS.map((topic) => (
              <tr key={topic.id} className="border-b border-sage/70 last:border-0">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <span className="block font-semibold text-ink">{topic.label}</span>
                  <span className="block text-xs text-ink-muted">{topic.hint}</span>
                </th>
                <td className="text-center">
                  {topic.locked ? (
                    <Lock className="mx-auto size-4 text-ink-muted" aria-label="Toujours actif" />
                  ) : (
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      aria-label={`${topic.label} par e-mail`}
                      checked={value(topic)}
                      disabled={update.isPending}
                      onChange={(event) => set(topic.id, event.target.checked)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
