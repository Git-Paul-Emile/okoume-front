import { z } from 'zod';

/** Numéro gabonais : 8 ou 9 chiffres (ex. 07 12 34 56, 077 12 34 56), avec ou sans +241. */
export const gabonPhone = z
  .string()
  .trim()
  .refine(
    (v) => /^(\+241|00241)?0?[1-7]\d{6,7}$/.test(v.replace(/[\s.-]/g, '')),
    'Saisissez un numéro gabonais, par exemple 077 12 34 56 ou +241 77 12 34 56.',
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .refine(
      (v) => (v.includes('@') ? z.string().email().safeParse(v).success : gabonPhone.safeParse(v).success),
      'Saisissez votre adresse e-mail ou votre numéro de téléphone.',
    ),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Saisissez votre prénom (2 caractères minimum).'),
    lastName: z.string().trim().min(2, 'Saisissez votre nom (2 caractères minimum).'),
    email: z.string().trim().email('Saisissez une adresse e-mail complète, par exemple nom@exemple.ga.'),
    phone: gabonPhone,
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
      .regex(/[0-9]/, 'Ajoutez au moins un chiffre à votre mot de passe.')
      .regex(/[A-Za-z]/, 'Ajoutez au moins une lettre à votre mot de passe.'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: 'Acceptez les conditions pour créer votre compte.' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les deux mots de passe ne sont pas identiques.',
  });

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Saisissez votre prénom (2 caractères minimum).'),
  lastName: z.string().trim().min(2, 'Saisissez votre nom (2 caractères minimum).'),
  phone: gabonPhone,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
