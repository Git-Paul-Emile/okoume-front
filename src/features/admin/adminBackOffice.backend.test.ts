import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { adminTeamBackend } = await import('./adminTeam.backend');
const { toUser } = await import('./adminCustomers.backend');
const { toAlert } = await import('./adminAlerts.backend');
const { adminZonesBackend } = await import('./adminZones.backend');

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

const member = {
  id: 'm1',
  email: 'paul@okoume.ga',
  firstName: 'Paul',
  lastName: 'Obame',
  role: 'super_admin',
  status: 'active',
  refundLimit: null,
  inviteExpiresAt: null,
  lastLoginAt: null,
  backupCodesLeft: 8,
  createdAt: '2026-11-01T08:00:00.000Z',
};

describe('back-office sur l’API', () => {
  it('n’envoie que le statut géré par l’API, jamais la date de fermeture des sessions', async () => {
    fetchMock.mockResolvedValue(json(member));
    await adminTeamBackend.update('m1', { status: 'suspended', sessionsRevokedAt: '2026-11-03T08:00:00.000Z' });
    expect(call()).toEqual({ route: 'PATCH /staff/team/m1', body: { status: 'suspended' } });
  });

  it('présente un client du fichier comme un compte, sans adresses ni favoris', () => {
    const user = toUser({
      id: 'c1',
      firstName: 'Awa',
      lastName: 'Ndong',
      email: 'aw•••@example.ga',
      phone: null,
      status: 'active',
      createdAt: '2026-01-01T08:00:00.000Z',
      lastLoginAt: null,
      orderCount: 2,
      totalSpent: 90_000,
    });
    expect(user).toMatchObject({ phone: '', hasOrdered: true, addresses: [], favorites: [] });
    expect(user).not.toHaveProperty('lastLoginAt');
  });

  it('lit une alerte sans champs vides et répond à une demande de quartier avec sa note', async () => {
    const alert = toAlert({
      id: 'a1',
      key: 'payments',
      level: 'critical',
      title: 'Paiements à vérifier',
      detail: '2 à traiter',
      to: '/admin/paiements',
      state: 'new',
      occurrences: 1,
      firstSeenAt: 'x',
      lastSeenAt: 'x',
      cleared: false,
      assigneeId: null,
      closureReason: null,
      actionTaken: null,
      episodes: [{ openedAt: 'x' }],
      lastReminderAt: null,
      history: [],
    });
    expect(alert).not.toHaveProperty('closureReason');
    fetchMock.mockResolvedValue(
      json({
        id: 'z1',
        neighbourhood: 'Bikélé',
        city: 'Ntoum',
        contact: '+241 06 22 41 18',
        status: 'declined',
        note: 'Hors de notre rayon',
        createdAt: 'x',
      }),
    );
    await adminZonesBackend.decideRequest('z1', 'declined', 'Hors de notre rayon');
    expect(call()).toEqual({
      route: 'PATCH /staff/zone-requests/z1',
      body: { status: 'declined', note: 'Hors de notre rayon' },
    });
  });
});
