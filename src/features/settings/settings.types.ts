export interface MobileMoneyAccount {
  method: 'airtel' | 'moov';
  label: string;
  number: string;
  beneficiary: string;
  instructions: string;
}

export interface ShopSettings {
  currency: 'XAF';
  mobileMoney: MobileMoneyAccount[];
  mobileMoneyExpiryHours: number;
  /** Taux de TVA appliqué à la livraison (25.4), à faire valider. */
  deliveryVatRate?: number;
  /** Nombre maximum d'adresses par client (2.2). */
  maxAddresses?: number;
  /** Mentions légales de la facture (raison sociale, NIF, RCCM). */
  legal?: { companyName: string; nif: string; rccm: string; vatNote: string };
  support: { whatsapp: string; phone: string; email: string; hours: string; address: string };
  social: Record<string, string>;
}
