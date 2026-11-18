import { formatPrice } from '@/utils/formatPrice';
import type { AdminOrder, Courier } from './admin.types';

/** Contenu de l'e-mail envoyé au livreur (9.4) : envoyé par l'API en production. */
export function courierEmail(order: AdminOrder, courier: Courier) {
  const toCollect =
    order.paymentStatus === 'paid'
      ? 'Déjà payée : rien à encaisser.'
      : `À encaisser : ${formatPrice(order.totals.total)}.`;
  return {
    subject: `Course ${order.number} : ${order.customer.zoneName}`,
    body: [
      `Bonjour ${courier.firstName},`,
      '',
      `Une course vous est confiée : commande ${order.number}.`,
      `Client : ${order.customer.recipient}, ${order.customer.phone}`,
      `Adresse : ${order.customer.zoneName}, ${order.customer.landmark}`,
      order.customer.instructions ? `Consignes : ${order.customer.instructions}` : '',
      `Articles : ${order.items.reduce((s, i) => s + i.quantity, 0)}`,
      toCollect,
      '',
      'Merci de confirmer la livraison à la boutique dès la remise du colis.',
    ]
      .filter((l) => l !== '')
      .join('\n'),
  };
}
