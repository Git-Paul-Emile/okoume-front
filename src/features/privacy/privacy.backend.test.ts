import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { privacyBackend, toPrivacyRequest } = await import('./privacy.backend');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = () => ({
  route: `${fetchMock.mock.calls[0]![1].method} ${String(fetchMock.mock.calls[0]![0]).replace('http://api.test/api/v1', '')}`,
  body: JSON.parse(String(fetchMock.mock.calls[0]![1].body ?? 'null')) as unknown,
});

const raw = {
  id: 'p1',
  number: 'DP-2026-ABC123',
  customerId: 'c1',
  name: 'Awa Ndong',
  email: 'awa@example.ga',
  type: 'correction',
  details: 'Mon nom est mal écrit.',
  status: 'received',
  response: null,
  history: [{ at: '2026-11-03T08:00:00.000Z', by: 'Client', event: 'Demande envoyée' }],
  dueAt: '2026-12-03T08:00:00.000Z',
  createdAt: '2026-11-03T08:00:00.000Z',
};

describe('données personnelles sur l’API', () => {
  it('traduit une demande : compte en userId, réponse absente tant qu’elle n’est pas donnée', () => {
    const request = toPrivacyRequest(raw);
    expect(request.userId).toBe('c1');
    expect(request).not.toHaveProperty('response');
    expect(toPrivacyRequest({ ...raw, response: 'Nom corrigé.' }).response).toBe('Nom corrigé.');
  });

  it('demande une correction et supprime le compte avec le mot de passe', async () => {
    fetchMock.mockResolvedValue(json(raw));
    await privacyBackend.create('correction', 'Mon nom est mal écrit.');
    expect(call()).toEqual({
      route: 'POST /me/privacy-requests',
      body: { type: 'correction', details: 'Mon nom est mal écrit.' },
    });
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await privacyBackend.deleteMine('secret');
    expect(call()).toEqual({ route: 'POST /me/account-deletion', body: { password: 'secret' } });
  });

  it('clôt une demande avec la réponse, prend en charge sans réponse', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(raw)));
    await privacyBackend.decide('p1', 'in_progress');
    expect(call()).toEqual({ route: 'PATCH /staff/privacy-requests/p1', body: { status: 'in_progress' } });
    fetchMock.mockClear();
    await privacyBackend.decide('p1', 'refused', 'Identité non vérifiée.');
    expect(call().body).toEqual({ status: 'refused', response: 'Identité non vérifiée.' });
  });
});
