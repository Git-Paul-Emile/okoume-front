import { describe, expect, it } from 'vitest';
import { toNotificationPrefs, toUser } from './auth.backend';

const customer = {
  id: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  email: 'awa@example.ga',
  firstName: 'Awa',
  lastName: 'Ndong',
  phone: null,
  emailVerified: true,
  emailVerifiedAt: '2026-11-03T08:05:00.000Z',
  createdAt: '2026-11-03T08:00:00.000Z',
};

// Forme réelle de GET /notification-preferences : une ligne par sujet
const prefs = [
  { topic: 'orders', email: true, emailLocked: true },
  { topic: 'support', email: true, emailLocked: true },
  { topic: 'promotions', email: false, push: false, emailLocked: false },
];

const parts = {
  customer,
  addresses: [
    {
      id: 'a1',
      label: 'Maison',
      recipient: 'Awa Ndong',
      phone: '077123456',
      zoneId: 'z1',
      landmark: 'Face à la pharmacie',
      instructions: '',
      isDefault: true,
      createdAt: '2026-11-03T09:00:00.000Z',
    },
  ],
  favorites: ['p1', 'p2'],
  prefs,
  orders: { items: [], total: 0, page: 1, limit: 1, hasNext: false },
};

describe('compte de l’API dans le format du front', () => {
  it('assemble identité, adresses, favoris et première commande', () => {
    expect(toUser(parts)).toMatchObject({
      id: customer.id,
      phone: '',
      favorites: ['p1', 'p2'],
      addresses: [{ id: 'a1', label: 'Maison', isDefault: true }],
      hasOrdered: false,
      emailVerifiedAt: '2026-11-03T08:05:00.000Z',
    });
    expect(toUser({ ...parts, orders: { ...parts.orders, total: 3 } }).hasOrdered).toBe(true);
  });

  it('n’invente pas de date de vérification pour une adresse non confirmée', () => {
    const user = toUser({ ...parts, customer: { ...customer, emailVerified: false, emailVerifiedAt: null } });
    expect(user).not.toHaveProperty('emailVerifiedAt');
  });

  it('traduit les réglages par sujet en interrupteurs généraux, sans les sujets réservés aux vendeurs', () => {
    expect(toNotificationPrefs(prefs)).toEqual({
      email: true,
      topics: {
        orders: { email: true },
        support: { email: true },
        promotions: { email: false, push: false },
      },
    });
  });

  it('refuse une réponse incomplète', () => {
    expect(() => toUser({ ...parts, customer: { ...customer, id: 4 } })).toThrow();
  });
});
