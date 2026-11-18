/**
 * Abonnement de cet appareil aux notifications push (cahier des charges, 10.3). Le résultat est l'objet
 * standard PushSubscriptionJSON attendu par l'API (POST /api/v1/push/subscriptions).
 */

export const pushSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

/** Clé publique VAPID (base64url) convertie dans le format binaire attendu par PushManager. */
export function decodeServerKey(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Demande l'autorisation si besoin puis abonne l'appareil. null : refus du client, navigateur incompatible ou
 * service worker absent (il n'est enregistré qu'en production).
 */
export async function subscribeToPush(publicKey: string): Promise<PushSubscriptionJSON | null> {
  if (!pushSupported()) return null;
  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeServerKey(publicKey),
    }));
  return subscription.toJSON();
}

/** Désabonne l'appareil et rend son adresse, à retirer aussi côté serveur (DELETE /api/v1/push/subscriptions). */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const subscription = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}
