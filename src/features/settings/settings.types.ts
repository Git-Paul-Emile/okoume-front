export type TierId = 'bronze' | 'argent' | 'or';

export interface Tier {
  id: TierId;
  name: string;
  threshold: number;
  perks: string[];
}

export interface MobileMoneyAccount {
  method: 'airtel' | 'moov';
  label: string;
  number: string;
  beneficiary: string;
  instructions: string;
}

export interface ShopSettings {
  currency: 'XAF';
  loyalty: { pointValue: number; minRedeem: number; earnPer: number };
  maxDiscountRate: number;
  tiers: Tier[];
  mobileMoney: MobileMoneyAccount[];
  mobileMoneyExpiryHours: number;
  returnWindowDays: number;
  /** Délai pour rouvrir une demande d'assistance ou un retour refusé (jours). */
  reopenWindowDays?: number;
  /** Délai avant relance et escalade d'une alerte critique non prise en charge, en heures (17.6). */
  alertEscalationHours?: number;
  /** Montant (FCFA) à partir duquel une commande est vérifiée avant préparation. */
  reviewAmount?: number;
  /** Points offerts au parrain à la première commande livrée du filleul. */
  referralReward?: number;
  /** Code de bienvenue après la première commande livrée et payée (12.5). */
  welcomeCode?: { enabled: boolean; percent: number; validDays: number };
  /** Taux de TVA appliqué à la livraison (25.4), à faire valider. */
  deliveryVatRate?: number;
  /** Nombre maximum d'adresses par client (2.2). */
  maxAddresses?: number;
  /** Alerte quand une commande en espèces n'est pas préparée après ce délai, en heures (6.4). */
  cashPreparationAlertHours?: number;
  /** Requêtes de l'assistant client autorisées par mois (16.6) ; 0 ou absent : sans plafond. */
  assistantMonthlyBudget?: number;
  /** Délai de première réponse de l'assistance, en heures, selon la priorité (15.3). */
  supportSla?: { high: number; normal: number };
  /** Cadeau d'anniversaire : points bonus ou code de réduction, au choix du client. */
  birthdayReward?: { enabled: boolean; points: number; percent: number };
  /** Mentions légales de la facture (raison sociale, NIF, RCCM). */
  legal?: { companyName: string; nif: string; rccm: string; vatNote: string };
  support: { whatsapp: string; phone: string; email: string; hours: string; address: string };
  social: Record<string, string>;
}
