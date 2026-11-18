import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { supportBackend, toTicket } = await import('./support.backend');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(status < 400 ? { success: true, data: body } : { success: false, error: body }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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
  id: 't1',
  number: 'SAV-2026-ABC123',
  email: 'awa@example.ga',
  name: 'Awa Ndong',
  category: 'livraison',
  orderNumber: null,
  subject: 'Colis en retard',
  status: 'pending',
  priority: 'normal',
  satisfaction: null,
  closureReason: null,
  resolvedAt: null,
  reopenedAt: null,
  messages: [
    {
      id: 'm1',
      from: 'customer',
      body: 'Où est mon colis ?',
      attachments: ['https://medias.test/support/a.jpg'],
      at: 'x',
    },
    { id: 'm2', from: 'support', body: 'Il part ce matin.', attachments: [], at: 'y', staffName: 'Inès Moussavou' },
  ],
  createdAt: 'x',
};

const ticket = toTicket(raw, 'c1');

describe('assistance sur l’API', () => {
  it('traduit une demande : images jointes nommées par leur rang, compte lecteur comme auteur', () => {
    expect(ticket.userId).toBe('c1');
    expect(ticket.messages[0]?.attachments).toEqual([
      { name: 'Image 1', type: 'image/webp', url: 'https://medias.test/support/a.jpg' },
    ]);
    expect(ticket.messages[1]).not.toHaveProperty('attachments');
    expect(toTicket({ ...raw, customerId: null, assigneeId: 's0' }, null)).toMatchObject({
      userId: null,
      assigneeId: 's0',
    });
  });

  it('envoie les adresses des images jointes avec la demande', async () => {
    fetchMock.mockResolvedValue(json(raw));
    await supportBackend.create(
      {
        name: 'Awa Ndong',
        email: 'awa@example.ga',
        category: 'livraison',
        orderNumber: '',
        subject: 'Colis en retard',
        message: 'Où est mon colis ?',
      },
      'c1',
      [{ name: 'photo.jpg', type: 'image/jpeg', size: 10, url: 'https://medias.test/support/a.jpg' }],
    );
    expect(call()).toEqual({
      route: 'POST /support/tickets',
      body: {
        name: 'Awa Ndong',
        email: 'awa@example.ga',
        category: 'livraison',
        orderNumber: '',
        subject: 'Colis en retard',
        message: 'Où est mon colis ?',
        attachments: ['https://medias.test/support/a.jpg'],
      },
    });
  });

  it('ne relit une demande par son numéro que pour un compte connecté, et rend null si elle est introuvable', async () => {
    expect(await supportBackend.byNumber('SAV-2026-ABC123', null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(json({ code: 'NOT_FOUND', message: 'Demande introuvable' }, 404));
    expect(await supportBackend.byNumber('SAV-2026-ABC123', 'c1')).toBeNull();
  });

  it('répond et clôt depuis l’équipe sur les routes du personnel', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(raw)));
    await supportBackend.answer(ticket, 'Il part ce matin.');
    expect(call()).toEqual({ route: 'POST /staff/support/tickets/t1/messages', body: { body: 'Il part ce matin.' } });
    fetchMock.mockClear();
    await supportBackend.update(ticket, { status: 'resolved', closureReason: 'Colis livré.' });
    expect(call()).toEqual({
      route: 'PATCH /staff/support/tickets/t1',
      body: { status: 'resolved', closureReason: 'Colis livré.' },
    });
  });
});
