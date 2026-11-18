import { describe, expect, it } from 'vitest';
import { decodeServerKey } from './push';

describe('clé publique des notifications push', () => {
  it('décode le base64url sans remplissage, avec les caractères - et _', () => {
    expect(Array.from(decodeServerKey('-_8'))).toEqual([0xfb, 0xff]);
    expect(Array.from(decodeServerKey('AQID'))).toEqual([1, 2, 3]);
  });
});
