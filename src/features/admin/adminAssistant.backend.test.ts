import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { adminAssistantBackend } = await import('./adminAssistant.backend');

const json = (body: unknown) =>
  new Response(JSON.stringify({ success: true, data: body }), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const saved = {
  id: 'a1',
  proposalId: 'slow-1',
  title: 'Remise sur les produits lents',
  changes: [{ productId: 'p1', label: 'Robe wax', before: { featured: true }, after: { featured: false } }],
  appliedByName: 'Inès Moussavou',
  appliedAt: '2026-11-03T08:00:00.000Z',
  revertedAt: null,
  revertedByName: null,
};

describe('assistant d’administration sur l’API', () => {
  it('modifie chaque produit par la route du catalogue, puis inscrit la proposition sans champ superflu', async () => {
    const update = vi.fn(() => Promise.resolve());
    fetchMock.mockResolvedValue(json(saved));
    const action = await adminAssistantBackend.apply(
      {
        proposalId: 'slow-1',
        title: 'Remise sur les produits lents',
        changes: [
          { productId: 'p1', label: 'Robe wax', before: { featured: true, name: 'Robe' }, after: { featured: false } },
        ],
      },
      update,
    );
    expect(update).toHaveBeenCalledWith('p1', { featured: false });
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body)) as { changes: Array<{ before: unknown }> };
    expect(body.changes[0]?.before).toEqual({ featured: true });
    expect(action).toMatchObject({ appliedBy: 'Inès Moussavou', revertedAt: null });
  });

  it('n’envoie pas l’auteur d’une décision : le serveur prend celui de la session', async () => {
    fetchMock.mockResolvedValue(
      json({
        id: 'd1',
        proposalId: 'slow-1',
        decision: 'refused',
        reason: 'Stock à écouler autrement',
        until: null,
        staffName: 'Inès Moussavou',
        createdAt: '2026-11-03T08:00:00.000Z',
      }),
    );
    const decision = await adminAssistantBackend.decide({
      proposalId: 'slow-1',
      decision: 'refused',
      reason: 'Stock à écouler autrement',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1].body))).toEqual({
      proposalId: 'slow-1',
      decision: 'refused',
      reason: 'Stock à écouler autrement',
    });
    expect(decision).toMatchObject({ by: 'Inès Moussavou' });
    expect(decision).not.toHaveProperty('until');
  });
});
