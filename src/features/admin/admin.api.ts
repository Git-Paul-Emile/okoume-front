import { ApiError } from '@/api/ApiError';
import { adminOrdersBackend } from './adminOrders.backend';
import { adminZonesBackend } from './adminZones.backend';
import { adminCatalogBackend } from './adminCatalog.backend';
import { adminCommerceBackend } from './adminCommerce.backend';
import { supportBackend } from '@/features/support/support.backend';
import type { Id } from '@/api/types';
import type { Article } from '@/features/articles/articles.types';
import type { Category } from '@/features/categories/categories.types';
import type { DeliveryZone, ZoneRequest } from '@/features/delivery/delivery.types';
import type { Ad, Banner } from '@/features/home/home.types';
import type { PromoCode } from '@/features/promotions/promotions.types';
import type { LegalPageRecord } from '@/features/legal/legal.api';
import type { Review } from '@/features/reviews/reviews.types';
import type { ShopSettings } from '@/features/settings/settings.types';
import { privacyBackend } from '@/features/privacy/privacy.backend';
import { reviewsBackend } from '@/features/reviews/reviews.backend';
import { contentBackend } from '@/features/home/content.backend';
import { adminSettingsBackend } from './adminSettings.backend';
import { adminTeamBackend } from './adminTeam.backend';
import { adminAlertsBackend } from './adminAlerts.backend';
import { adminAssistantBackend } from './adminAssistant.backend';
import { adminAnalyticsBackend } from './adminAnalytics.backend';
import { adminCustomersBackend, toUser } from './adminCustomers.backend';
import type { User } from '@/features/auth/auth.types';
import type { PrivacyRequest } from '@/features/privacy/privacy.types';
import type { Ticket } from '@/features/support/support.types';
import type { CustomRole } from './permissions';
import type { ProposalDecision, RulesVersion } from './assistantRules';
import type { AssistantLogEntry } from './assistantLog';
import type { AlertRecord } from './alerts.rules';
import type { ProductViewEntry } from './stats.rules';
import type { SearchEntry } from '@/features/search/searchLog';
import type {
  ActivityEntry,
  AssistantAction,
  AdminOrder,
  Courier,
  AdminProduct,
  ReviewReport,
  SiteStat,
  PriceChange,
  StockMovement,
  TeamMember,
} from './admin.types';

/**
 * Accès du back-office à l'API. Authentification, droits de chaque rôle et journalisation des actions
 * sont appliqués par le serveur.
 */
export const adminApi = {
  assistantLog: (signal?: AbortSignal): Promise<AssistantLogEntry[]> => adminAssistantBackend.questions(signal),
  /** L'auteur est celui de la session, et les coordonnées sont masquées par le serveur aussi. */
  logAssistant: (entry: AssistantLogEntry): Promise<AssistantLogEntry> => adminAssistantBackend.logQuestion(entry),
  proposalDecisions: (signal?: AbortSignal): Promise<ProposalDecision[]> => adminAssistantBackend.decisions(signal),
  decideProposal: (d: Omit<ProposalDecision, 'id' | 'at'>): Promise<ProposalDecision> =>
    adminAssistantBackend.decide(d),
  assistantRules: (signal?: AbortSignal): Promise<RulesVersion[]> => adminAssistantBackend.rules(signal),
  /** Le numéro de version est attribué par le serveur. */
  saveAssistantRules: (v: RulesVersion): Promise<RulesVersion> => adminAssistantBackend.saveRules(v),
  customRoles: (signal?: AbortSignal): Promise<CustomRole[]> => adminTeamBackend.customRoles(signal),
  /** Les membres qui ont ce rôle sont déconnectés par le serveur pour recevoir les nouveaux droits. */
  saveCustomRole: (role: CustomRole) => adminTeamBackend.saveCustomRole(role),

  /** Le nom du livreur de chaque commande vient du répertoire des livreurs. */
  orders: async (signal?: AbortSignal): Promise<AdminOrder[]> => {
    // Le dossier de retour est une ressource à part, rattaché ici à sa commande
    const [couriers, returns] = await Promise.all([
      adminOrdersBackend.couriers(signal),
      adminCommerceBackend.returnsByOrder(signal),
    ]);
    const orders = await adminOrdersBackend.list(couriers, signal);
    return orders.map((o) => ({ ...o, returnRequest: returns.get(o.id) ?? null }));
  },

  products: (signal?: AbortSignal) => adminCatalogBackend.products(signal),
  createProduct: (product: AdminProduct) => adminCatalogBackend.createProduct(product),
  /** priceReason : motif historisé par l'API pour chaque prix modifié */
  updateProduct: (id: Id, patch: Partial<AdminProduct>, priceReason?: string) =>
    adminCatalogBackend.updateProduct(id, patch, priceReason),

  /**
   * Journal général des mouvements de stock. L'API ne le tient que variante par variante : le journal
   * général reste vide en attendant une route de consultation globale.
   */
  /** 100 derniers mouvements de toutes les variantes (journal général tenu par l'API) */
  stockMovements: (signal?: AbortSignal): Promise<StockMovement[]> => adminCatalogBackend.stockJournal(signal),
  /** Ajustement manuel : la quantité comptée remplace le stock, le mouvement et son auteur sont tracés par le serveur. */
  /** Quantité comptée ; un inventaire physique est signalé dans le motif du mouvement d'ajustement */
  adjustStock: (variantId: Id, quantity: number, reason: string, origin: 'correction' | 'inventaire' = 'correction') =>
    adminCatalogBackend.setStock(variantId, quantity, origin === 'inventaire' ? `Inventaire : ${reason}` : reason),
  /** Sortie définitive du stock non revendable : motif et quantité, l'auteur est tracé par le serveur. */
  async writeOffUnsellable(product: AdminProduct, variantId: Id, quantity: number, reason: string) {
    const v = product.variants.find((x) => x.id === variantId)!;
    const before = v.unsellable ?? 0;
    if (quantity <= 0 || quantity > before) throw new ApiError('Quantité supérieure au stock non revendable.', 400);
    return adminCatalogBackend.writeOff(v, quantity, reason);
  },

  categories: (signal?: AbortSignal) => adminCatalogBackend.categories(signal),
  createCategory: (category: Category) => adminCatalogBackend.saveCategory(category, false),
  updateCategory: (id: Id, category: Category) => adminCatalogBackend.saveCategory({ ...category, id }, true),

  promoCodes: (signal?: AbortSignal) => adminCommerceBackend.promoCodes(signal),
  createPromoCode: (code: PromoCode) => adminCommerceBackend.createPromoCode(code),
  updatePromoCode: (id: Id, patch: Partial<PromoCode>) => adminCommerceBackend.updatePromoCode(id, patch),

  customers: async (signal?: AbortSignal): Promise<User[]> => (await adminCustomersBackend.list(signal)).map(toUser),

  privacyRequests: (signal?: AbortSignal): Promise<PrivacyRequest[]> => privacyBackend.staffList(signal),

  reviews: async (signal?: AbortSignal): Promise<Review[]> => (await reviewsBackend.staffList(signal)).reviews,
  /** Les signalements en attente sont lus avec la file de modération. */
  reviewReports: async (signal?: AbortSignal): Promise<ReviewReport[]> =>
    (await reviewsBackend.staffList(signal)).reports,

  tickets: (signal?: AbortSignal): Promise<Ticket[]> => supportBackend.staffList(signal),

  ads: (signal?: AbortSignal): Promise<Ad[]> => contentBackend.staffAds(signal),
  updateAd: (id: Id, patch: Partial<Ad>): Promise<Ad> => contentBackend.updateAd(id, patch),
  banners: (signal?: AbortSignal): Promise<Banner[]> => contentBackend.staffBanners(signal),
  updateBanner: (id: Id, patch: Partial<Banner>): Promise<Banner> => contentBackend.updateBanner(id, patch),

  deliveryZones: (signal?: AbortSignal) => adminZonesBackend.list(signal),
  updateDeliveryZone: (id: Id, patch: Partial<DeliveryZone>) => adminZonesBackend.update(id, patch),
  /** L'identifiant de la nouvelle zone est attribué par le serveur. */
  createDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => adminZonesBackend.create(zone),
  zoneRequests: (signal?: AbortSignal): Promise<ZoneRequest[]> => adminZonesBackend.requests(signal),
  /** Une demande ne reçoit qu'une suite : ouverte ou refusée, avec sa note. */
  decideZoneRequest: (id: Id, status: 'added' | 'declined', note: string) =>
    adminZonesBackend.decideRequest(id, status, note),

  settings: (signal?: AbortSignal): Promise<ShopSettings> => adminSettingsBackend.read(signal),
  updateSettings: (patch: Partial<ShopSettings>): Promise<ShopSettings> => adminSettingsBackend.update(patch),

  team: (signal?: AbortSignal): Promise<TeamMember[]> => adminTeamBackend.team(signal),
  /** Annuaire réduit de l'équipe (membres actifs), lisible par tous ses membres */
  teamDirectory: (signal?: AbortSignal) => adminTeamBackend.directory(signal),
  /** Invitation (19.2) : le lien est envoyé par e-mail par le serveur. */
  inviteMember: (member: Omit<TeamMember, 'status'>): Promise<TeamMember> => adminTeamBackend.invite(member),
  renewInvite: (id: Id) => adminTeamBackend.renewInvite(id),
  /** Mesure d'audience collectée par l'API, sur les 13 mois conservés. */
  productViews: (signal?: AbortSignal): Promise<ProductViewEntry[]> => adminAnalyticsBackend.productViews(signal),
  searchLog: (signal?: AbortSignal): Promise<SearchEntry[]> => adminAnalyticsBackend.searches(signal),
  revokeSessions: (id: Id): Promise<unknown> => adminTeamBackend.revokeSessions(id),
  /** Procédure administrative de récupération de la double vérification (19.2). */
  resetMfa: (id: Id, reason = ''): Promise<unknown> => adminTeamBackend.resetBackupCodes(id, reason),
  updateMember: (id: Id, patch: Partial<TeamMember>): Promise<TeamMember> => adminTeamBackend.update(id, patch),

  activityLog: (signal?: AbortSignal): Promise<ActivityEntry[]> => adminTeamBackend.activity(signal),

  couriers: (signal?: AbortSignal) => adminOrdersBackend.couriers(signal),
  saveCourier: (courier: Courier) => adminOrdersBackend.saveCourier(courier, !!courier.id),

  articles: (signal?: AbortSignal): Promise<Article[]> => contentBackend.staffArticles(signal),
  /** Auteur et nature du changement sont établis par le serveur, qui tient l'historique (3.6). */
  saveArticle: (article: Article) => contentBackend.saveArticle(article),
  legalPages: (signal?: AbortSignal): Promise<LegalPageRecord[]> => contentBackend.staffLegalPages(signal),
  saveLegalPage: (page: LegalPageRecord): Promise<LegalPageRecord> => contentBackend.saveLegalPage(page),

  assistantActions: (signal?: AbortSignal): Promise<AssistantAction[]> => adminAssistantBackend.actions(signal),
  /** Applique une proposition validée : chaque produit reçoit la modification, l'état d'origine est conservé. */
  applyProposal: (action: Omit<AssistantAction, 'id' | 'appliedAt' | 'revertedAt'>) =>
    adminAssistantBackend.apply(action),
  /** Retour arrière : remet chaque produit dans son état d'avant la proposition. */
  revertProposal: (action: AssistantAction) => adminAssistantBackend.revert(action),

  /** Historique des prix : l'API ne l'expose pas encore, la liste reste vide. */
  /** 100 derniers changements de prix, tenus par l'API */
  priceChanges: (signal?: AbortSignal): Promise<PriceChange[]> => adminCatalogBackend.priceChanges(signal),

  alerts: (signal?: AbortSignal): Promise<AlertRecord[]> => adminAlertsBackend.list(signal),
  updateAlert: (id: Id, patch: Partial<AlertRecord>): Promise<AlertRecord> => adminAlertsBackend.update(id, patch),

  siteStats: (signal?: AbortSignal): Promise<SiteStat[]> => adminAnalyticsBackend.daily(signal),
};
