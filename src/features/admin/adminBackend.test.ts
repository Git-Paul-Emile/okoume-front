import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { staffBackend, toAdminUser } = await import('./staff.backend');
const { adminOrdersBackend, toAdminOrder, toCourier, toPaymentRecords } = await import('./adminOrders.backend');
const { adminZonesBackend } = await import('./adminZones.backend');
const { availableWithSource } = await import('./admin.navigation');
const { backend } = await import('@/api/backend');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const sent = (i = 0) => ({
  url: String(fetchMock.mock.calls[i]![0]),
  method: fetchMock.mock.calls[i]![1].method as string,
  body: JSON.parse(String(fetchMock.mock.calls[i]![1].body ?? 'null')) as unknown,
});

const member = {
  id: 's1',
  email: 'ines@okoume.ga',
  firstName: 'Inès',
  lastName: 'Moussavou',
  role: 'orders_manager',
  roles: ['orders_manager', 'stock_manager'],
  permissions: ['commandes:consulter', 'stock:modifier'],
  owner: false,
};

const courier = {
  id: 'c1',
  firstName: 'Jean',
  lastName: 'Obame',
  phone: '077000000',
  email: null,
  vehicle: 'velo',
  active: true,
  notes: '',
  zoneIds: ['z1'],
};

const staffOrder = {
  id: 'o1',
  number: 'CMD-2026-AB12CD',
  trackingCode: 'XY34ZT',
  items: [],
  customer: {
    recipient: 'Awa Ndong',
    phone: '077123456',
    email: 'awa@example.ga',
    zoneId: 'z1',
    zoneName: 'Glass',
    landmark: 'Pharmacie',
    instructions: '',
  },
  totals: {
    subtotal: 10_000,
    productDiscount: 0,
    codeDiscount: 0,
    pointsDiscount: 0,
    deliveryFee: 2_000,
    deliveryDiscount: 0,
    total: 12_000,
  },
  promoCode: null,
  pointsUsed: 0,
  paymentMethod: 'cash',
  paymentStatus: 'awaiting_payment',
  status: 'courier_assigned',
  history: [
    { status: 'confirmed', at: 'a', actor: 'customer' },
    { status: 'courier_assigned', at: 'b', actor: 'staff', by: 'Inès Moussavou' },
  ],
  cancellationRequest: null,
  deliveryDispute: null,
  createdAt: 'a',
  customerId: 'k1',
  courierId: 'c1',
  deliveryCost: 1_500,
  review: null,
};

describe('connexion de l’équipe sur l’API', () => {
  it('reprend les droits effectifs calculés par l’API', () => {
    expect(toAdminUser(member)).toEqual({
      id: 's1',
      firstName: 'Inès',
      lastName: 'Moussavou',
      email: 'ines@okoume.ga',
      role: 'super_admin',
    });
  });

  it('passe le mot de passe, puis le code ou le code de secours, sans les deux à la fois', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: true, data: { challengeId: 'ch1' } }, 202))
      .mockResolvedValueOnce(json({ success: true, data: { member, backupCodesLeft: 9 } }));
    expect(await staffBackend.startLogin('Ines@Okoume.ga', 'motdepasse-long-1')).toBe('ch1');
    const session = await staffBackend.completeLogin('ch1', { backupCode: 'ABCD-EFGH' });
    expect(sent(0).body).toEqual({ email: 'ines@okoume.ga', password: 'motdepasse-long-1' });
    expect(sent(1).body).toEqual({ challengeId: 'ch1', backupCode: 'ABCD-EFGH' });
    expect(session.backupCodesLeft).toBe(9);
  });

  it('renouvelle la session de l’équipe, et non celle du client, sur une route de l’équipe', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: false, message: 'Connectez-vous.' }, 401))
      .mockResolvedValueOnce(json({ success: true, data: { member } }))
      .mockResolvedValueOnce(json({ success: true, data: [] }));
    await backend.get('/staff/couriers');
    expect(sent(1).url).toBe('http://api.test/api/v1/staff/auth/sessions/refresh');
  });

  it('ne renouvelle rien quand la connexion de l’équipe échoue', async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: 'Identifiants incorrects.' }, 401));
    await expect(staffBackend.startLogin('a@b.ga', 'x')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('commandes de l’équipe', () => {
  it('ajoute à la commande le client, le livreur nommé, le coût de course et l’auteur de chaque étape', () => {
    const order = toAdminOrder(staffOrder, [toCourier(courier)]);
    expect(order).toMatchObject({ userId: 'k1', courierId: 'c1', courier: 'Jean Obame', deliveryCost: 1_500 });
    expect(order.history[1]).toMatchObject({ status: 'courier_assigned', by: 'Inès Moussavou' });
    expect(order.history[0]).not.toHaveProperty('by');
  });

  it('envoie une transition comme une action, jamais un nouvel état', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { ...staffOrder, status: 'shipping' } }));
    const order = toAdminOrder(staffOrder);
    await adminOrdersBackend.transition(
      order,
      { action: 'delivery_failed', reason: 'Client absent ou injoignable', decision: 'retry' },
      [],
    );
    expect(sent()).toEqual({
      url: 'http://api.test/api/v1/staff/orders/o1/transitions',
      method: 'POST',
      body: { action: 'delivery_failed', reason: 'Client absent ou injoignable', decision: 'retry' },
    });
  });

  it('enregistre un encaissement sans référence vide ni observation', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { payments: [] } }, 201));
    await adminOrdersBackend.recordPayment(toAdminOrder(staffOrder), {
      amount: 12_000,
      at: '2026-11-10T10:00:00.000Z',
      reference: '  ',
    });
    expect(sent().body).toEqual({ amount: 12_000, receivedAt: '2026-11-10T10:00:00.000Z', reference: null });
  });

  it('traduit les paiements et les livreurs dans la forme du back-office', () => {
    expect(
      toPaymentRecords({
        payments: [
          {
            id: 'p1',
            kind: 'refund',
            amount: 5_000,
            method: 'airtel',
            occurredAt: 'x',
            reference: null,
            noReferenceReason: 'Remboursé en boutique',
            clientAgreed: true,
            by: 'Inès Moussavou',
            createdAt: 'y',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'p1',
        kind: 'refund',
        amount: 5_000,
        method: 'airtel',
        at: 'x',
        reference: '',
        note: 'Sans référence : Remboursé en boutique',
        by: 'Inès Moussavou',
        recordedAt: 'y',
      },
    ]);
    expect(toCourier(courier)).toMatchObject({ vehicle: 'Vélo', email: '' });
  });

  it('crée un livreur avec les valeurs attendues par l’API', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: courier }, 201));
    await adminOrdersBackend.saveCourier({ ...toCourier(courier), id: '', vehicle: 'À pied' }, false);
    expect(sent()).toMatchObject({ url: 'http://api.test/api/v1/staff/couriers', method: 'POST' });
    expect(sent().body).toMatchObject({ vehicle: 'a_pied', email: null });
  });
});

describe('quartiers livrés et écrans disponibles', () => {
  it('n’envoie que les champs modifiés, un coût de course retiré devenant null', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          id: 'z1',
          name: 'Glass',
          city: 'Libreville',
          fee: 2_500,
          eta: '24 h',
          days: 'Lun-Sam',
          available: true,
          courierCost: null,
        },
      }),
    );
    const zone = await adminZonesBackend.update('z1', { fee: 2_500, courierCost: undefined });
    expect(sent().body).toEqual({ fee: 2_500, courierCost: null });
    expect(zone).not.toHaveProperty('courierCost');
  });

  it('ferme les écrans pas encore branchés quand l’API est active', () => {
    expect(availableWithSource('/admin/commandes')).toBe(true);
    expect(availableWithSource('/admin/livreurs')).toBe(true);
    expect(availableWithSource('/admin/statistiques')).toBe(true);
    expect(availableWithSource('/admin/emails')).toBe(true);
    expect(availableWithSource('/admin/assistant')).toBe(true);
    expect(availableWithSource('/admin/securite')).toBe(true);
    expect(availableWithSource('/admin')).toBe(true);
    expect(availableWithSource('/admin/commandes-archives')).toBe(false);
  });
});
