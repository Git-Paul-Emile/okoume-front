import { z } from 'zod';
import { ORDER_NUMBER_EXAMPLE, ORDER_NUMBER_PATTERN } from '@/features/orders/orders.constants';

export const ticketSchema = z.object({
  name: z.string().trim().min(2, 'Saisissez votre nom.'),
  email: z.string().trim().email('Saisissez une adresse e-mail complète pour recevoir notre réponse.'),
  category: z.enum(['commande', 'livraison', 'retour', 'produit', 'compte', 'publicite'], {
    error: 'Choisissez le sujet de votre demande.',
  }),
  orderNumber: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || ORDER_NUMBER_PATTERN.test(v),
      `Le numéro de commande a le format ${ORDER_NUMBER_EXAMPLE}.`,
    )
    .optional()
    .default(''),
  subject: z.string().trim().min(5, 'Résumez votre demande en quelques mots (5 caractères minimum).'),
  message: z
    .string()
    .trim()
    .min(20, 'Décrivez votre demande en 20 caractères minimum pour que nous puissions vous aider.')
    .max(2000, 'Votre message est limité à 2 000 caractères.'),
});

export type TicketInput = z.infer<typeof ticketSchema>;

export const categoryLabel: Record<TicketInput['category'], string> = {
  commande: 'Commande',
  livraison: 'Livraison',
  retour: 'Retour ou réclamation',
  produit: 'Produit',
  compte: 'Compte',
  publicite: 'Publicité et partenariat',
};
