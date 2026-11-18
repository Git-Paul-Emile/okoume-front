import type { Category } from '@/features/categories/categories.types';
import { inCategory } from '@/features/categories/categories.utils';
import type { DeliveryZone } from '@/features/delivery/delivery.types';
import type { Product } from '@/features/products/products.types';
import { availableStock, productInStock, productSalePrice } from '@/features/products/products.utils';
import { searchProducts } from '@/features/search/search.utils';
import type { ShopSettings } from '@/features/settings/settings.types';
import { formatPrice } from '@/utils/formatPrice';
import { normalizeText } from '@/utils/text';

/**
 * Assistant client : version locale à règles, branchée uniquement sur les données publiques du catalogue.
 * Il n'invente jamais un prix ni un stock : tout chiffre affiché vient des données reçues.
 * Le connecteur vers un vrai modèle d'IA (côté serveur) remplacera `answer` sans changer l'interface.
 */
export interface AssistantData {
  products: Product[];
  categories: Category[];
  zones: DeliveryZone[];
  settings: ShopSettings | null;
  contextProduct?: Product | null;
}

export interface AssistantReply {
  text: string;
  products?: Product[];
  links?: Array<{ label: string; to: string; external?: boolean }>;
  /** Information générale, non confirmée par les données de la boutique. */
  general?: boolean;
}

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

/** Questions sur l'assistant lui-même : ce qu'il fait, à quoi il sert, ses fonctions (texte normalisé). */
const ABOUT_ME =
  /\b(que|quoi|quest ce que|comment)\b.*\b(peux|pouvez|peut|sais|savez|fais|faites|sers|servez|aider|aides)\b|\b(tes|vos|ses|les) (fonctions?|fonctionnalites|capacites|roles?|services)\b|\ba quoi (tu |vous )?(sers|servez|sert)\b|\bqui (es|etes) (tu|vous)\b|\b(tu|vous) (es|etes) qui\b|\bton role\b|\bvotre role\b/;

/** Vocabulaire de la boutique : sans aucun de ces mots, la question sort du cadre de l'assistant. */
const SHOP_WORDS = [
  'produit',
  'article',
  'achat',
  'acheter',
  'commande',
  'commander',
  'prix',
  'cout',
  'cher',
  'promo',
  'reduction',
  'solde',
  'stock',
  'dispo',
  'boutique',
  'okoume',
  'panier',
  'compte',
  'livr',
  'pay',
  'facture',
  'garantie',
  'retour',
  'rembours',
  'marque',
  'categorie',
  'catalogue',
  'taille',
  'couleur',
  'vendeur',
  'cadeau',
  'budget',
  'fcfa',
  'franc',
  'mot de passe',
  'connexion',
  'inscri',
  'contact',
];

const OFF_TOPIC =
  'Je ne suis pas destiné à cela : je suis l’assistant d’achat d’Okoumé et je réponds uniquement aux questions sur la boutique (produits, prix, livraison, paiement, commandes, retours, fidélité). Que puis-je faire pour votre achat ?';

/** Réponse de présentation : ce que l'assistant sait faire, avec des questions qu'il comprend. */
const CAPABILITIES = [
  'Je suis l’assistant d’achat d’Okoumé : je réponds à vos questions sur la boutique et vous aide à choisir. Je peux vous aider à :',
  '• trouver un produit selon votre budget (« téléphone moins de 300 000 », « parfum pour femme ») ;',
  '• connaître les frais et délais de livraison (« livraison à Owendo ») ;',
  '• comprendre le paiement Airtel Money, Moov Money ou en espèces ;',
  '• suivre une commande, l’annuler ou faire un retour ;',
  '• utiliser vos points de fidélité et les codes promo ;',
  '• comprendre votre compte et la commande sans compte ;',
  '• vous mettre en relation avec notre équipe.',
  'Que cherchez-vous ?',
].join('\n');

function parseBudget(q: string): number | null {
  const m = q.match(/(\d[\d\s.]*)\s*(k|mille|000|fcfa|f|cfa|francs?)?/);
  if (!m) return null;
  let n = Number(m[1].replace(/[\s.]/g, ''));
  if (!n) return null;
  if (m[2] === 'k' || m[2] === 'mille') n *= 1000;
  return n >= 500 ? n : null;
}

function matchCategory(q: string, categories: Category[]) {
  const synonyms: Record<string, string[]> = {
    // En premier : « robe en pagne » doit mener aux tenues traditionnelles, pas à la mode femme
    traditionnel: ['pagne', 'wax', 'boubou', 'tenue traditionnelle', 'tenue africaine', 'vendredi'],
    smartphones: ['telephone', 'smartphone', 'portable', 'iphone', 'samsung'],
    ordinateurs: ['ordinateur', 'pc', 'laptop', 'macbook'],
    tablettes: ['tablette', 'ipad'],
    'audio-accessoires': ['ecouteur', 'casque', 'airpods', 'enceinte', 'chargeur'],
    montres: ['montre'],
    parfums: ['parfum'],
    cuisine: ['cuisine', 'blender', 'micro onde', 'mixeur', 'marmite'],
    'mode-femme': ['robe', 'sac', 'escarpin'],
    'mode-homme': ['chemise', 'basket', 'chaussure homme'],
    mobilier: ['canape', 'meuble', 'fauteuil', 'chevet'],
  };
  // Les clés sont des slugs : les identifiants des catégories de l'API sont des UUID
  for (const [slug, words] of Object.entries(synonyms))
    if (has(q, words)) return categories.find((c) => c.slug === slug) ?? null;
  return categories.find((c) => q.includes(normalizeText(c.name))) ?? null;
}

export function answer(message: string, data: AssistantData): AssistantReply {
  const q = normalizeText(message);
  const { settings, zones, products, categories } = data;

  if (!q) return { text: 'Posez-moi une question sur un produit, la livraison ou le paiement.' };

  if (has(q, ['humain', 'conseiller', 'quelquun', 'parler a', 'whatsapp', 'appeler'])) {
    return {
      text: `Je vous mets en relation avec notre équipe. ${settings ? settings.support.hours + '.' : ''}`,
      links: [
        ...(settings
          ? [{ label: 'Écrire sur WhatsApp', to: `https://wa.me/${settings.support.whatsapp}`, external: true }]
          : []),
        { label: 'Formulaire de contact', to: '/contact' },
      ],
    };
  }

  // Présentation : ce que l'assistant sait faire, avec des exemples prêts à reprendre
  if (
    has(q, [
      'que peux tu',
      'que pouvez vous',
      'quest ce que tu peux',
      'quest ce que vous pouvez',
      'tu peux faire quoi',
      'tu fais quoi',
      'a quoi tu sers',
      'a quoi sers tu',
      'qui es tu',
      'tu es qui',
      'comment ca marche',
      'comment tu marches',
      'aide moi',
      'besoin daide',
    ]) ||
    q === 'aide' ||
    q === 'help'
  ) {
    return { text: CAPABILITIES, links: [{ label: 'Voir le catalogue', to: '/catalogue' }] };
  }

  if (has(q, ['bonjour', 'bonsoir', 'salut', 'hello', 'mbolo'])) {
    return { text: `Bonjour ! ${CAPABILITIES}` };
  }

  if (has(q, ['merci', 'parfait', 'super', 'top', 'genial'])) {
    return { text: 'Avec plaisir ! Une autre question sur un produit, la livraison ou le paiement ?' };
  }

  if (has(q, ['airtel', 'moov', 'mobile money', 'payer', 'paiement', 'espece', 'cash'])) {
    return {
      text: 'Tout se paie à la livraison, au livreur : en espèces, par Airtel Money ou par Moov Money. Rien à payer avant. Pour le Mobile Money, vous envoyez le montant depuis votre téléphone au moment de la réception, avec votre numéro de commande en référence.',
    };
  }

  if (has(q, ['livraison', 'livrer', 'livre', 'frais', 'quartier', 'delai'])) {
    const zone = zones.find((z) => q.includes(normalizeText(z.name)));
    if (zone) {
      return zone.available
        ? {
            text: `Livraison à ${zone.name} : ${formatPrice(zone.fee)}, délai indicatif ${zone.eta} (${zone.days}). Le tarif est fixe, quel que soit le nombre d’articles.`,
          }
        : {
            text: `${zone.name} n’est pas encore desservi automatiquement. Vous pouvez commander : nous vous confirmerons la disponibilité avant tout engagement.`,
          };
    }
    const fees = zones.filter((z) => z.available).map((z) => z.fee);
    return {
      text: fees.length
        ? `Les frais de livraison sont fixes par quartier, de ${formatPrice(Math.min(...fees))} à ${formatPrice(Math.max(...fees))}. Indiquez-moi votre quartier pour le tarif exact.`
        : 'Les frais de livraison dépendent de votre quartier.',
    };
  }

  if (has(q, ['suivi', 'suivre', 'ou est ma commande', 'statut'])) {
    return {
      text: 'Vous pouvez suivre votre commande avec son numéro et le code de suivi reçus à la confirmation, ou depuis votre compte.',
      links: [{ label: 'Suivre ma commande', to: '/suivi' }],
    };
  }

  if (has(q, ['retour', 'rembourse', 'annul', 'echange'])) {
    return {
      text: `Avant la préparation, vous pouvez annuler depuis votre suivi ou votre compte. Pour un retour, faites la demande sous ${settings?.returnWindowDays ?? 14} jours ; le remboursement intervient après réception et vérification du produit.`,
      links: [{ label: 'Conditions de retour', to: '/legal/retours' }],
    };
  }

  if (has(q, ['point', 'fidelite', 'parrain'])) {
    const l = settings?.loyalty;
    return {
      text: l
        ? `Vous gagnez 1 point par tranche de ${formatPrice(l.earnPer)} d’achats (hors livraison), crédités après livraison et paiement. 1 point = ${formatPrice(l.pointValue)}, utilisable à partir de ${l.minRedeem} points. Les points n’expirent pas.`
        : 'Le programme de fidélité vous fait gagner des points à chaque commande livrée et payée.',
      links: [{ label: 'Mon espace fidélité', to: '/compte/fidelite' }],
    };
  }

  // Questions sur le produit consulté
  const ctx = data.contextProduct;
  if (
    ctx &&
    has(q, ['ce produit', 'celui ci', 'stock', 'dispo', 'prix', 'variante', 'taille', 'couleur', 'garantie'])
  ) {
    const lines = ctx.variants.map(
      (v) =>
        `${v.label} : ${formatPrice(productSalePrice({ ...ctx, variants: [v] }).price)}, ${availableStock(v) > 0 ? 'disponible' : 'indisponible'}`,
    );
    const warranty = ctx.specs.find((s) => s.label === 'Garantie');
    return { text: `${ctx.name} :\n${lines.join('\n')}${warranty ? `\nGarantie : ${warranty.value}.` : ''}` };
  }

  // Recommandation selon besoin et budget
  const budget = parseBudget(q);
  const category = matchCategory(q, categories);
  // « Que peux-tu faire pour moi ? », « À quoi sers-tu ? » : présentation, sauf si un produit est visé
  if (!category && ABOUT_ME.test(q)) {
    return { text: CAPABILITIES, links: [{ label: 'Voir le catalogue', to: '/catalogue' }] };
  }
  const searchTerms = q
    .replace(/\d[\d\s.]*\s*(k|mille|fcfa|f|cfa|francs?)?/g, ' ')
    .replace(/\b(moins|de|max|maximum|budget|pour|un|une|je|cherche|veux|voudrais|avec|a|le|la|les)\b/g, ' ')
    .trim();
  let pool = category
    ? products.filter((p) => inCategory(p.categoryId, category.id, new Map(categories.map((c) => [c.id, c]))))
    : searchProducts(products, searchTerms, () => '', 20);
  if (!pool.length && !category) pool = [];
  const inBudget = pool
    .filter((p) => productInStock(p) && (budget === null || productSalePrice(p).price <= budget))
    .sort((a, b) => productSalePrice(b).price - productSalePrice(a).price);

  if (pool.length) {
    if (inBudget.length) {
      return {
        text: budget
          ? `Voici ${inBudget.length > 3 ? 'les meilleures options disponibles' : 'ce qui correspond'} pour un budget de ${formatPrice(budget)}${category ? ` en ${category.name.toLowerCase()}` : ''} :`
          : `Voici des produits disponibles${category ? ` en ${category.name.toLowerCase()}` : ''} :`,
        products: inBudget.slice(0, 3),
        links: [
          {
            label: 'Voir tous les résultats',
            to: category
              ? `/catalogue?categorie=${category.id}${budget ? `&max=${budget}` : ''}`
              : `/catalogue?q=${encodeURIComponent(searchTerms)}`,
          },
        ],
      };
    }
    const cheapest = pool
      .filter(productInStock)
      .sort((a, b) => productSalePrice(a).price - productSalePrice(b).price)[0];
    return {
      text: cheapest
        ? `Je n’ai rien de disponible sous ${formatPrice(budget ?? 0)}. L’option disponible la plus abordable est à ${formatPrice(productSalePrice(cheapest).price)}. Souhaitez-vous la voir ?`
        : 'Ces produits sont actuellement indisponibles. Notre équipe peut vous conseiller une alternative.',
      products: cheapest ? [cheapest] : undefined,
    };
  }

  if (!has(q, SHOP_WORDS)) return { text: OFF_TOPIC };

  return {
    text: 'Je n’ai pas de réponse fiable à cette question. Reformulez-la (par exemple « téléphone moins de 300 000 » ou « livraison à Owendo ») ou contactez notre équipe.',
    links: [{ label: 'Contacter la boutique', to: '/contact' }],
  };
}
