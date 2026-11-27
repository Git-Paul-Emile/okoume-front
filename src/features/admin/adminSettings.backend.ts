import { backend } from '@/api/backend';
import { toShopSettings } from '@/features/settings/settings.api';
import type { ShopSettings } from '@/features/settings/settings.types';

export const adminSettingsBackend = {
  async read(signal?: AbortSignal): Promise<ShopSettings> {
    return toShopSettings(await backend.get('/settings', undefined, signal));
  },

  /** Informations d'exploitation et plafond général des remises. */
  async update(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    const information = {
      ...(patch.mobileMoney !== undefined ? { mobileMoney: patch.mobileMoney } : {}),
      ...(patch.mobileMoneyExpiryHours !== undefined ? { mobileMoneyExpiryHours: patch.mobileMoneyExpiryHours } : {}),
      ...(patch.support !== undefined ? { support: patch.support } : {}),
      ...(patch.legal !== undefined ? { legal: patch.legal } : {}),
      ...(patch.mobileMoneyExpiryHours !== undefined ? { mobileMoneyExpiryHours: patch.mobileMoneyExpiryHours } : {}),
      // Un réseau sans adresse n'est pas affiché : il n'est pas enregistré
      ...(patch.social !== undefined
        ? { social: Object.fromEntries(Object.entries(patch.social).filter(([, url]) => url !== '')) }
        : {}),
    };
    if (Object.keys(information).length) await backend.patch('/staff/settings/shop', information);
    return adminSettingsBackend.read();
  },
};
