import { useMemo } from 'react';
import type { BadgeKey } from './admin.navigation';
import { usePrivacyRequests, useAdminAlerts, useAdminOrders, useAdminProducts, useAdminTickets } from './admin.queries';
import { stockAlerts } from './dashboard.utils';
import { isRecipient } from './alertRecipients';
import { useAdminAuthStore } from '@/stores/adminAuthStore';

/** Compteurs affichés dans le menu : ce qui attend une action de l'équipe. */
export function useAdminBadges(): Partial<Record<BadgeKey, number>> {
  const { data: orders = [] } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: tickets = [] } = useAdminTickets();
  const { data: alerts = [] } = useAdminAlerts();
  const { data: privacy = [] } = usePrivacyRequests();
  const admin = useAdminAuthStore((s) => s.admin);
  return useMemo(
    () => ({
      orders: orders.filter((o) => o.status === 'confirmed').length,
      // Commandes livrées dont l'encaissement (espèces ou Mobile Money) reste à confirmer
      payments: orders.filter((o) => o.status === 'delivered' && o.paymentStatus === 'awaiting_payment').length,
      returns: orders.filter(
        (o) => o.cancellationRequest?.status === 'pending' || o.returnRequest?.status === 'pending',
      ).length,
      stock: stockAlerts(products).filter((s) => s.available <= 0).length,
      support: tickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
      alerts: alerts.filter((a) => a.state === 'new' && isRecipient(admin, a.key)).length,
      privacy: privacy.filter((r) => r.status === 'received').length,
    }),
    [orders, products, tickets, alerts, privacy, admin],
  );
}
