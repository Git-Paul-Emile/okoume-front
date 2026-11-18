import { isScheduled } from './articles.types';

describe('publication des articles', () => {
  const now = new Date('2026-11-03T10:00:00Z').getTime();
  it('repère un article programmé tant que sa date n’est pas passée', () => {
    const later = { status: 'published' as const, publishedAt: '2026-11-05T08:00:00Z' };
    expect(isScheduled(later, now)).toBe(true);
    expect(isScheduled({ ...later, publishedAt: '2026-11-01T08:00:00Z' }, now)).toBe(false);
    expect(isScheduled({ status: 'draft', publishedAt: '2026-11-05T08:00:00Z' }, now)).toBe(false);
  });
});
