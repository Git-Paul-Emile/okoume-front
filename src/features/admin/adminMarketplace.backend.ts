import { z } from 'zod';
import { backend, getPage } from '@/api/backend';
import type { Id } from '@/api/types';
import { shopDto } from '@/features/seller/seller.backend';

export type StaffShop = z.infer<typeof shopDto>;
export type ShopAction = { action: 'suspend'; reason: string } | { action: 'reinstate' | 'verify' | 'unverify' };

const page = { limit: 20 };

export const adminMarketplaceBackend = {
  shops: (filters: { status?: 'active' | 'suspended'; search?: string }, currentPage: number, signal?: AbortSignal) =>
    getPage(
      '/staff/shops',
      {
        ...page,
        page: currentPage,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
      },
      (raw) => shopDto.parse(raw),
      signal,
    ),

  actOnShop: async (id: Id, action: ShopAction) => shopDto.parse(await backend.patch(`/staff/shops/${id}`, action)),
};
