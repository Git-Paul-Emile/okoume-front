import { z } from 'zod';
import { backend } from '@/api/backend';
import { toShopSettings } from '@/features/settings/settings.api';
import type { ShopSettings } from '@/features/settings/settings.types';

/**
 * Paramètres de la boutique sur l'API. Les réglages publics sont lus sur /settings ; les seuils internes
 * (alertes, vérification des grosses commandes, budget de l'assistant) sur /staff/settings/shop, réservé à
 * l'administrateur principal. Les règles fixées par le serveur (valeur du point, délais de retour et de
 * réouverture, nombre d'adresses) s'y lisent mais ne s'y modifient pas.
 */

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

  /** Deux enregistrements : informations de la boutique, puis règles de fidélité. */
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
    const threshold = (id: 'argent' | 'or') => patch.tiers?.find((t) => t.id === id)?.threshold;
    const silver = threshold('argent');
    const gold = threshold('or');
    const loyalty = {
      ...(patch.maxDiscountRate !== undefined ? { maxDiscountRate: patch.maxDiscountRate } : {}),
      ...(silver !== undefined ? { silverThreshold: silver } : {}),
      ...(gold !== undefined ? { goldThreshold: gold } : {}),
      ...(patch.referralReward !== undefined ? { referralReward: patch.referralReward } : {}),
      ...(patch.welcomeCode
        ? {
            welcomeEnabled: patch.welcomeCode.enabled,
            ...(patch.welcomeCode.enabled ? { welcomePercent: patch.welcomeCode.percent } : {}),
            welcomeValidDays: patch.welcomeCode.validDays,
          }
        : {}),
      ...(patch.birthdayReward
        ? {
            birthdayEnabled: patch.birthdayReward.enabled,
            birthdayPoints: patch.birthdayReward.points,
            ...(patch.birthdayReward.percent > 0 ? { birthdayPercent: patch.birthdayReward.percent } : {}),
          }
        : {}),
    };
    if (Object.keys(information).length) await backend.patch('/staff/settings/shop', information);
    if (Object.keys(loyalty).length) await backend.patch('/staff/settings/loyalty', loyalty);
    return adminSettingsBackend.read();
  },
};
