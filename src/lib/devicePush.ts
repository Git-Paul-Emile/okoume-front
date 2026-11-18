import { z } from 'zod';
import { backend } from '@/api/backend';
import { pushSupported, subscribeToPush, unsubscribeFromPush } from './push';

/**
 * Abonnement de cet appareil aux notifications push de l'API (10.3). Clients et équipe ont leurs propres
 * routes : un appareil reçoit ce qui concerne le compte connecté, selon ses préférences ou ses droits.
 */
export type PushAudience = 'customer' | 'staff';

const BASE: Record<PushAudience, string> = { customer: '/push', staff: '/staff/push' };

/** unavailable : notifications non configurées sur le serveur ou navigateur incompatible ; refused : refus du client. */
export type PushResult = 'enabled' | 'refused' | 'unavailable';

const keyDto = z.object({ publicKey: z.string().nullable() });

export async function enableDevicePush(audience: PushAudience): Promise<PushResult> {
  if (!pushSupported()) return 'unavailable';
  const { publicKey } = keyDto.parse(await backend.get('/push/public-key'));
  if (!publicKey) return 'unavailable';
  const subscription = await subscribeToPush(publicKey);
  if (!subscription) return Notification.permission === 'denied' ? 'refused' : 'unavailable';
  await backend.post(`${BASE[audience]}/subscriptions`, subscription);
  return 'enabled';
}

/** Désabonne l'appareil et le retire côté serveur ; sans abonnement, rien à faire. */
export async function disableDevicePush(audience: PushAudience): Promise<void> {
  const endpoint = await unsubscribeFromPush();
  if (endpoint) await backend.delete(`${BASE[audience]}/subscriptions`, { endpoint });
}

/** Cet appareil est-il abonné ? (le navigateur garde l'abonnement entre les visites) */
export async function devicePushActive(): Promise<boolean> {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return !!(await registration?.pushManager.getSubscription());
}
