import { Lock } from 'lucide-react';
import { useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { disableDevicePush, enableDevicePush } from '@/lib/devicePush';
import { toast } from '@/stores/toastStore';
import { useUpdateUser } from '../auth.queries';
import type { NotificationChannel, NotificationTopic, User } from '../auth.types';

const TOPICS: Array<{
  id: NotificationTopic;
  label: string;
  hint: string;
  emailLocked?: boolean;
  defaults: Record<NotificationChannel, boolean>;
}> = [
  {
    id: 'orders',
    label: 'Suivi de mes commandes',
    hint: 'Confirmation, préparation, livreur, livraison, retours et remboursements.',
    emailLocked: true,
    defaults: { email: true, push: true },
  },
  {
    id: 'support',
    label: 'Réponses de l’assistance',
    hint: 'Réponses et décisions sur vos demandes.',
    emailLocked: true,
    defaults: { email: true, push: true },
  },
  {
    id: 'loyalty',
    label: 'Fidélité et anniversaire',
    hint: 'Points gagnés, changement de niveau, cadeau d’anniversaire.',
    defaults: { email: true, push: false },
  },
  {
    id: 'promotions',
    label: 'Offres et nouveautés',
    hint: 'Promotions et nouvelles collections, quelques fois par mois au plus.',
    defaults: { email: false, push: false },
  },
];

const pushSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** Choix des notifications par type de message et par canal (e-mail, notifications sur cet appareil). */
export function NotificationPreferences({ user }: { user: User }) {
  const update = useUpdateUser();
  const [askingPush, setAskingPush] = useState(false);
  const prefs = user.notificationPrefs;

  const value = (topic: (typeof TOPICS)[number], channel: NotificationChannel) =>
    (topic.emailLocked && channel === 'email') ||
    (prefs.topics?.[topic.id]?.[channel] ??
      (channel === 'push' ? prefs.push && topic.defaults.push : topic.defaults[channel]));

  const set = async (topic: NotificationTopic, channel: NotificationChannel, checked: boolean) => {
    // L'appareil s'abonne réellement auprès du serveur, qui enverra les notifications choisies
    if (channel === 'push' && checked) {
      setAskingPush(true);
      try {
        const result = await enableDevicePush('customer');
        if (result === 'refused')
          return toast.info('Notifications refusées par le navigateur', {
            description: 'Vous pouvez les autoriser dans les réglages du navigateur, puis réessayer.',
          });
        if (result === 'unavailable')
          return toast.info('Notifications indisponibles sur cet appareil', {
            description: 'Installez le site sur l’écran d’accueil ou utilisez un navigateur récent.',
          });
      } catch (error) {
        return toast.error('Activation impossible', { description: getErrorMessage(error) });
      } finally {
        setAskingPush(false);
      }
    }
    const topics = { ...prefs.topics, [topic]: { ...prefs.topics?.[topic], [channel]: checked } };
    const anyPush = TOPICS.some((t) =>
      t.id === topic && channel === 'push' ? checked : (topics[t.id]?.push ?? false),
    );
    update.mutate({ notificationPrefs: { ...prefs, push: anyPush, topics } });
    // Plus aucun sujet en push : l'appareil est désabonné, il ne reçoit plus rien
    if (!anyPush) void disableDevicePush('customer').catch(() => undefined);
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg">Notifications</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Choisissez ce que vous recevez. Les e-mails liés à vos commandes et à l’assistance restent actifs : ils
        contiennent des informations nécessaires au service.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="border-b border-sage text-xs text-ink-muted">
              <th className="py-2 text-left font-semibold">Type de message</th>
              <th className="w-24 py-2 text-center font-semibold">E-mail</th>
              <th className="w-28 py-2 text-center font-semibold">Sur cet appareil</th>
            </tr>
          </thead>
          <tbody>
            {TOPICS.map((t) => (
              <tr key={t.id} className="border-b border-sage/70 last:border-0">
                <th scope="row" className="py-3 pr-3 text-left font-normal">
                  <span className="block font-semibold text-ink">{t.label}</span>
                  <span className="block text-xs text-ink-muted">{t.hint}</span>
                </th>
                <td className="text-center">
                  {t.emailLocked ? (
                    <Lock className="mx-auto size-4 text-ink-muted" aria-label="Toujours actif" />
                  ) : (
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      aria-label={`${t.label} par e-mail`}
                      checked={value(t, 'email')}
                      onChange={(e) => void set(t.id, 'email', e.target.checked)}
                    />
                  )}
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-forest disabled:opacity-40"
                    aria-label={`${t.label} sur cet appareil`}
                    disabled={!pushSupported() || askingPush}
                    checked={value(t, 'push')}
                    onChange={(e) => void set(t.id, 'push', e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!pushSupported() && (
        <p className="mt-3 text-xs text-ink-muted">Ce navigateur ne prend pas en charge les notifications.</p>
      )}
    </div>
  );
}
