import { topSearches } from './searchLog';

describe('termes recherchés', () => {
  it('regroupe les recherches et garde le dernier nombre de résultats', () => {
    const entries = [
      { id: '1', term: 'Pagne wax', results: 4, at: '2026-10-20T10:00:00Z' },
      { id: '2', term: 'pagne  wax', results: 6, at: '2026-10-25T10:00:00Z' },
      { id: '3', term: 'casque', results: 0, at: '2026-10-26T10:00:00Z' },
      { id: '4', term: 'casque', results: 0, at: '2026-08-01T10:00:00Z' },
    ];
    const top = topSearches(entries, new Date('2026-10-01'), new Date('2026-10-31'));
    expect(top).toEqual([
      { term: 'pagne wax', count: 2, results: 6 },
      { term: 'casque', count: 1, results: 0 },
    ]);
  });
});
