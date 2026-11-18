import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { sellerBackend, listingPhotoUploader } = await import('./seller.backend');
const { ChatThread } = await import('@/features/marketplace/components/ChatThread');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = (i = 0) => ({
  route: `${fetchMock.mock.calls[i]![1].method} ${String(fetchMock.mock.calls[i]![0]).replace('http://api.test/api/v1', '')}`,
  body:
    typeof fetchMock.mock.calls[i]![1].body === 'string'
      ? (JSON.parse(fetchMock.mock.calls[i]![1].body) as unknown)
      : null,
});

const request = {
  id: 'r1',
  number: 'DEM-2026-0001',
  listing: { slug: 'velo-vtt', title: 'Vélo VTT' },
  quantity: 1,
  unitPrice: 80_000,
  total: 80_000,
  paymentMethod: 'cash',
  handover: 'pickup',
  message: '',
  status: 'accepted',
  reason: null,
  history: [],
  createdAt: 'x',
  buyer: { firstName: 'Awa', phone: '077123456' },
};

describe('boutique du vendeur', () => {
  it('considère un compte sans boutique (404) comme une boutique à ouvrir', async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: 'Aucune boutique.' }, 404));
    expect(await sellerBackend.shop()).toBeNull();
  });

  it('déclare un paiement Mobile Money avec l’offre, le moyen, la référence et le montant', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          success: true,
          data: {
            id: 'p1',
            shop: { id: 's1', name: 'Cycles Awa' },
            plan: { name: 'Mensuel' },
            amount: 5_000,
            method: 'airtel',
            reference: 'MP2611',
            status: 'pending',
            decisionReason: null,
            decidedAt: null,
            periodStart: null,
            periodEnd: null,
            createdAt: 'x',
          },
        },
        201,
      ),
    );
    await sellerBackend.declareShopPayment({ planId: 'pl1', method: 'airtel', reference: 'MP2611', amount: 5_000 });
    expect(call()).toEqual({
      route: 'POST /seller/shop/payments',
      body: { planId: 'pl1', method: 'airtel', reference: 'MP2611', amount: 5_000 },
    });
  });
});

describe('demandes, tchat et photos', () => {
  it('envoie chaque décision du vendeur avec son motif quand il est exigé', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ success: true, data: request })));
    await sellerBackend.decideRequest('r1', { action: 'not_concluded', reason: 'Acheteur absent au rendez-vous' });
    expect(call()).toEqual({
      route: 'PATCH /seller/listing-requests/r1',
      body: { action: 'not_concluded', reason: 'Acheteur absent au rendez-vous' },
    });
  });

  it('propose un prix convenu dans la conversation', async () => {
    fetchMock.mockResolvedValue(
      json({
        success: true,
        data: {
          id: 'k1',
          listing: { slug: 'velo-vtt', title: 'Vélo VTT' },
          shop: { name: 'Cycles Awa' },
          status: 'open',
          needsSeller: false,
          agreement: { price: 78_000, expiresAt: 'y' },
          lastMessageAt: 'x',
          messages: [],
        },
      }),
    );
    const conversation = await sellerBackend.agree('k1', 78_000);
    expect(call()).toEqual({ route: 'PUT /seller/conversations/k1/agreement', body: { price: 78_000 } });
    expect(conversation.agreement?.price).toBe(78_000);
  });

  it('envoie une photo d’annonce avec l’autorisation signée pour la boutique', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json(
          {
            success: true,
            data: {
              uploadUrl: 'https://api.cloudinary.com/v1_1/okoume/image/upload',
              fields: { signature: 'sig' },
              expiresAt: 'z',
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(json({ secure_url: 'https://res.cloudinary.com/okoume/image/upload/l.webp' }));
    expect(await listingPhotoUploader(new Blob(['x'], { type: 'image/webp' }))).toBe(
      'https://res.cloudinary.com/okoume/image/upload/l.webp',
    );
    expect(call().route).toBe('POST /seller/listings/photo-uploads');
  });

  it('présente l’assistant comme tel et les messages de chacun de son côté', () => {
    renderWithProviders(
      <ChatThread
        viewer="seller"
        onSend={() => Promise.resolve()}
        conversation={{
          id: 'k1',
          listing: { slug: 'velo-vtt', title: 'Vélo VTT' },
          shop: { name: 'Cycles Awa' },
          status: 'open',
          needsSeller: true,
          agreement: null,
          lastMessageAt: 'x',
          messages: [
            { id: 'm1', author: 'buyer', body: 'Toujours disponible ?', createdAt: '2026-11-11T10:00:00.000Z' },
            { id: 'm2', author: 'assistant', body: 'Oui, il est disponible.', createdAt: '2026-11-11T10:00:05.000Z' },
            { id: 'm3', author: 'seller', body: 'Je confirme.', createdAt: '2026-11-11T10:01:00.000Z' },
          ],
        }}
      />,
    );
    expect(screen.getByText('Acheteur')).toBeInTheDocument();
    expect(screen.getByText('Votre assistant')).toBeInTheDocument();
    expect(screen.queryByText('Cycles Awa')).not.toBeInTheDocument();
  });
});
