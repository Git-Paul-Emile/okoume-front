import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { disableDevicePush, enableDevicePush } = await import('./devicePush');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

const subscriptionJson = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'cGVyc29ubmVs', auth: 'c2VjcmV0' },
};

let fetchMock: ReturnType<typeof vi.fn>;
let existing: { endpoint: string; toJSON: () => unknown; unsubscribe: () => Promise<boolean> } | null;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  existing = null;
  const pushManager = {
    getSubscription: async () => existing,
    subscribe: async () => {
      existing = { endpoint: subscriptionJson.endpoint, toJSON: () => subscriptionJson, unsubscribe: async () => true };
      return existing;
    },
  };
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: async () => 'granted' });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager }) },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('notifications push de cet appareil', () => {
  it('n’abonne rien quand le serveur n’a pas de clé (notifications non configurées)', async () => {
    fetchMock.mockResolvedValue(json({ publicKey: null }));
    expect(await enableDevicePush('customer')).toBe('unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('abonne l’appareil et l’enregistre pour le compte connecté', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await enableDevicePush('staff')).toBe('enabled');
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('http://api.test/api/v1/staff/push/subscriptions');
    expect(JSON.parse(String(init.body))).toEqual(subscriptionJson);
  });

  it('désabonne l’appareil et le retire côté serveur', async () => {
    existing = { endpoint: subscriptionJson.endpoint, toJSON: () => subscriptionJson, unsubscribe: async () => true };
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await disableDevicePush('customer');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/v1/push/subscriptions');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(String(init.body))).toEqual({ endpoint: subscriptionJson.endpoint });
  });
});
