import { useMemo } from 'react';
import type { BadgeKey } from './admin.navigation';
import { useAdminAlerts, useAdminOrders, useAdminProducts } from './admin.queries';
import { stockAlerts } from './dashboard.utils';
import { isRecipient } from './alertRecipients';
import { useAdminAuthStore } from '@/stores/adminAuthStore';

/** Compteurs affichés dans le menu : ce qui attend une action de l'équipe. */
export function useAdminBadges(): Partial<Record<BadgeKey, number>> {
  const { data: orders = [] } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: alerts = [] } = useAdminAlerts();
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
      alerts: alerts.filter((a) => a.state === 'new' && isRecipient(admin, a.key)).length,
    }),
    [orders, products, alerts, admin],
  );
}
