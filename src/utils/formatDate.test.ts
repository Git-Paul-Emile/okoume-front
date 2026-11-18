import { formatDate, formatDateTime } from './formatDate';

describe('formatDate', () => {
  it('affiche la date au format JJ/MM/AAAA', () => {
    expect(formatDate('2026-10-12T12:00:00.000Z')).toBe('12/10/2026');
  });

  it('utilise l’heure du Gabon (UTC+1) quel que soit le fuseau de l’appareil', () => {
    // 23 h 30 UTC le 11 = 0 h 30 le 12 à Libreville
    expect(formatDate('2026-10-11T23:30:00.000Z')).toBe('12/10/2026');
    expect(formatDateTime('2026-10-11T23:30:00.000Z')).toBe('12/10/2026 à 00:30');
  });
});
