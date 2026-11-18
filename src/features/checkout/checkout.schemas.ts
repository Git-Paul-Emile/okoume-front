import { z } from 'zod';
import { gabonPhone } from '@/features/auth/auth.schemas';

export const deliverySchema = z.object({
  recipient: z.string().trim().min(3, 'Saisissez le nom et le prénom du destinataire.'),
  phone: gabonPhone,
  email: z
    .string()
    .trim()
    .email('Saisissez une adresse e-mail complète : vous y recevrez le récapitulatif et le suivi.'),
  zoneId: z.string().min(1, 'Choisissez votre quartier pour connaître les frais de livraison.'),
  landmark: z.string().trim().min(5, 'Indiquez un repère précis (pharmacie, école, carrefour…) pour aider le livreur.'),
  instructions: z.string().trim().max(300, 'Les instructions sont limitées à 300 caractères.').optional().default(''),
});

export const paymentSchema = z.object({
  method: z.enum(['cash', 'airtel', 'moov'], { error: 'Choisissez un moyen de paiement.' }),
});

export type DeliveryInput = z.infer<typeof deliverySchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
