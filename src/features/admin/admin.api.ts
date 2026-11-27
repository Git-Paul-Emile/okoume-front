import type { Id } from '@/api/types';
import type { Category } from '@/features/categories/categories.types';
import type { DeliveryZone } from '@/features/delivery/delivery.types';
import type { Ad, AdInput } from '@/features/home/home.types';
import type { PromoCode } from '@/features/promotions/promotions.types';
import type { Review } from '@/features/reviews/reviews.types';
import type { ShopSettings } from '@/features/settings/settings.types';
import { contentBackend } from '@/features/home/content.backend';
import { reviewsBackend } from '@/features/reviews/reviews.backend';
import { adminCatalogBackend } from './adminCatalog.backend';
import { adminCommerceBackend } from './adminCommerce.backend';
import { adminOrdersBackend } from './adminOrders.backend';
import { adminSettingsBackend } from './adminSettings.backend';
import { adminZonesBackend } from './adminZones.backend';
import type { AdminOrder, AdminProduct, Courier, StockMovement, PriceChange } from './admin.types';

/** Appels du back-office nécessaires aux parcours du MVP. */
export const adminApi = {
  orders: async (signal?: AbortSignal): Promise<AdminOrder[]> => {
    const couriers = await adminOrdersBackend.couriers(signal);
    return adminOrdersBackend.list(couriers, signal);
  },
  products: (signal?: AbortSignal) => adminCatalogBackend.products(signal),
  createProduct: (product: AdminProduct) => adminCatalogBackend.createProduct(product),
  moderateProduct: (id: Id, decision: 'approve' | 'request_changes' | 'reject', note: string, issues: string[]) =>
    adminCatalogBackend.moderateProduct(id, decision, note, issues),
  updateProduct: (id: Id, patch: Partial<AdminProduct>, priceReason?: string) =>
    adminCatalogBackend.updateProduct(id, patch, priceReason),
  stockMovements: (signal?: AbortSignal): Promise<StockMovement[]> => adminCatalogBackend.stockJournal(signal),
  adjustStock: (variantId: Id, quantity: number, reason: string) => adminCatalogBackend.setStock(variantId, quantity, reason),
  priceChanges: (signal?: AbortSignal): Promise<PriceChange[]> => adminCatalogBackend.priceChanges(signal),
  categories: (signal?: AbortSignal) => adminCatalogBackend.categories(signal),
  createCategory: (category: Category) => adminCatalogBackend.saveCategory(category, false),
  updateCategory: (id: Id, category: Category) => adminCatalogBackend.saveCategory({ ...category, id }, true),
  promoCodes: (signal?: AbortSignal) => adminCommerceBackend.promoCodes(signal),
  createPromoCode: (code: PromoCode) => adminCommerceBackend.createPromoCode(code),
  updatePromoCode: (id: Id, patch: Partial<PromoCode>) => adminCommerceBackend.updatePromoCode(id, patch),
  reviews: (signal?: AbortSignal): Promise<Review[]> => reviewsBackend.staffList(signal),
  ads: (signal?: AbortSignal): Promise<Ad[]> => contentBackend.staffAds(signal),
  createAd: (ad: AdInput): Promise<Ad> => contentBackend.createAd(ad),
  updateAd: (id: Id, patch: Partial<Ad>): Promise<Ad> => contentBackend.updateAd(id, patch),
  deliveryZones: (signal?: AbortSignal) => adminZonesBackend.list(signal),
  updateDeliveryZone: (id: Id, patch: Partial<DeliveryZone>) => adminZonesBackend.update(id, patch),
  createDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => adminZonesBackend.create(zone),
  settings: (signal?: AbortSignal): Promise<ShopSettings> => adminSettingsBackend.read(signal),
  updateSettings: (patch: Partial<ShopSettings>): Promise<ShopSettings> => adminSettingsBackend.update(patch),
  couriers: (signal?: AbortSignal) => adminOrdersBackend.couriers(signal),
  saveCourier: (courier: Courier) => adminOrdersBackend.saveCourier(courier, !!courier.id),
};
