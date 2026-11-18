import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { devicePushActive, disableDevicePush, enableDevicePush } from '@/lib/devicePush';
import { pushSupported } from '@/lib/push';
import { toast } from '@/stores/toastStore';

/**
 * Alertes de l'équipe sur cet appareil (nouvelles commandes, paiements à vérifier…), selon les droits du membre.
 * Le navigateur garde l'abonnement : le bouton reflète l'état réel de l'appareil.
 */
export function StaffPushButton() {
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void devicePushActive().then((on) => alive && setActive(on));
    return () => {
      alive = false;
    };
  }, []);

  if (!pushSupported() || active === null) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (active) {
        await disableDevicePush('staff');
        setActive(false);
        toast.info('Alertes désactivées sur cet appareil');
        return;
      }
      const result = await enableDevicePush('staff');
      if (result === 'enabled') {
        setActive(true);
        toast.success('Alertes activées sur cet appareil');
      } else
        toast.info(result === 'refused' ? 'Notifications refusées par le navigateur' : 'Alertes indisponibles', {
          description:
            result === 'refused'
              ? 'Autorisez-les dans les réglages du navigateur, puis réessayez.'
              : 'Les notifications ne sont pas configurées sur le serveur, ou ce navigateur ne les accepte pas.',
        });
    } catch (error) {
      toast.error('Action impossible', { description: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const label = active ? 'Désactiver les alertes sur cet appareil' : 'Activer les alertes sur cet appareil';
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-md text-ink hover:text-forest disabled:opacity-50"
    >
      {active ? <Bell className="size-5" /> : <BellOff className="size-5" />}
    </button>
  );
}
