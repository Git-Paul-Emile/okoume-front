import { z } from 'zod';
import { backend } from '@/api/backend';
import { toShopSettings } from '@/features/settings/settings.api';
import type { ShopSettings } from '@/features/settings/settings.types';

/** Réglages de boutique et d'exploitation ; seuls les codes promotionnels manuels restent disponibles. */

const internalDto = z.object({
  alertEscalationHours: z.number(),
  reviewAmount: z.number(),
  cashPreparationAlertHours: z.number(),
  assistantMonthlyBudget: z.number(),
});

export const adminSettingsBackend = {
  async read(signal?: AbortSignal): Promise<ShopSettings> {
    const [publicRaw, internalRaw] = await Promise.all([
      backend.get('/settings', undefined, signal),
      backend.get('/staff/settings/shop', undefined, signal),
    ]);
    return { ...toShopSettings(publicRaw), ...internalDto.parse(internalRaw) };
  },

  /** Informations d'exploitation et plafond général des remises. */
  async update(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    const information = {
      ...(patch.mobileMoney !== undefined ? { mobileMoney: patch.mobileMoney } : {}),
      ...(patch.mobileMoneyExpiryHours !== undefined ? { mobileMoneyExpiryHours: patch.mobileMoneyExpiryHours } : {}),
      ...(patch.support !== undefined ? { support: patch.support } : {}),
      // Un réseau sans adresse n'est pas affiché : il n'est pas enregistré
      ...(patch.social !== undefined
        ? { social: Object.fromEntries(Object.entries(patch.social).filter(([, url]) => url !== '')) }
        : {}),
      ...(patch.alertEscalationHours !== undefined ? { alertEscalationHours: patch.alertEscalationHours } : {}),
      ...(patch.reviewAmount !== undefined ? { reviewAmount: patch.reviewAmount } : {}),
      ...(patch.cashPreparationAlertHours !== undefined
        ? { cashPreparationAlertHours: patch.cashPreparationAlertHours }
        : {}),
      ...(patch.assistantMonthlyBudget !== undefined ? { assistantMonthlyBudget: patch.assistantMonthlyBudget } : {}),
    };
    if (Object.keys(information).length) await backend.patch('/staff/settings/shop', information);
    return adminSettingsBackend.read();
  },
};
