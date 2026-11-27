import { useMemo } from 'react';
import type { BadgeKey } from './admin.navigation';
import { useAdminOrders, useAdminProducts } from './admin.queries';
import { stockAlerts } from './dashboard.utils';

export function useAdminBadges(): Partial<Record<BadgeKey, number>> {
  const { data: orders = [] } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();

  return useMemo(
    () => ({
      orders: orders.filter((order) => order.status === 'confirmed').length,
      payments: orders.filter(
        (order) => order.status === 'delivered' && order.paymentStatus === 'awaiting_payment',
      ).length,
      stock: stockAlerts(products).filter((stock) => stock.available <= 0).length,
    }),
    [orders, products],
  );
}
