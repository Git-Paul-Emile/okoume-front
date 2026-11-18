import { gabonPhone } from './auth.schemas';

describe('gabonPhone', () => {
  it.each(['07 12 34 56', '077 12 34 56', '+241 77 12 34 56', '+241 07 12 34 56', '066.12.34.56'])(
    'accepte %s',
    (n) => {
      expect(gabonPhone.safeParse(n).success).toBe(true);
    },
  );

  it.each(['12', '08 12 34 56', 'abc', '+33 6 12 34 56 78'])('refuse %s', (n) => {
    expect(gabonPhone.safeParse(n).success).toBe(false);
  });
});
