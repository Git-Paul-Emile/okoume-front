import { z } from 'zod';
import { installFrenchMessages } from './zodMessages';

installFrenchMessages();

const messages = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('messages de validation', () => {
  it('ne montre jamais un message technique en anglais', () => {
    const schema = z.object({ name: z.string(), email: z.email(), qty: z.number().min(1), size: z.enum(['S', 'M']) });
    const all = messages(schema, { email: 'pas-un-email', qty: 0, size: 'XL' });
    expect(all).toEqual([
      'Ce champ est obligatoire.',
      'Adresse e-mail invalide.',
      'La valeur doit être au moins 1.',
      'Choisissez une valeur proposée.',
    ]);
    for (const m of all) expect(m).not.toMatch(/Invalid|expected|received/);
  });

  it('donne les longueurs en clair', () => {
    expect(messages(z.string().min(5), 'abc')).toEqual(['Saisissez au moins 5 caractères.']);
    expect(messages(z.string().min(1), '')).toEqual(['Ce champ est obligatoire.']);
    expect(messages(z.string().max(3), 'abcdef')).toEqual(['3 caractères au maximum.']);
    expect(messages(z.number(), 'douze')).toEqual(['Saisissez un nombre.']);
  });

  it('garde les messages écrits dans les schémas', () => {
    expect(messages(z.string().min(2, 'Saisissez votre nom.'), '')).toEqual(['Saisissez votre nom.']);
  });
});
