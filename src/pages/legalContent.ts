import { brand } from '@/config/brand';
import type { ShopSettings } from '@/features/settings/settings.types';

export interface LegalDoc {
  title: string;
  sections: Array<{ heading: string; body: string[] }>;
}

/** Paramètres de la boutique repris dans les textes : un seul endroit à modifier, le site reste cohérent. */
export type LegalSettings = Pick<ShopSettings, 'returnWindowDays'> &
  Partial<Pick<ShopSettings, 'legal' | 'support'>>;

/** Valeurs par défaut de l'API (RETURN_WINDOW_DAYS, données de départ), en attendant les paramètres réels. */
export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {
  returnWindowDays: 14,
};

/** Valeur obligatoire pas encore fournie : signalée clairement plutôt qu'inventée. */
const TO_FILL = '[à renseigner dans les Paramètres avant la mise en ligne]';
const filled = (value: string | undefined) => (value && value.trim() ? value.trim() : TO_FILL);

/**
 * Textes légaux établis au regard du droit gabonais : loi n° 001/2011 du 25 septembre 2011 relative à la protection
 * des données à caractère personnel (contrôle : CNPDCP), droit OHADA (RCCM, conservation comptable), TVA gabonaise.
 * Faute de texte gabonais précis connu (retours, garanties), le modèle français sert de référence, sans citer
 * d'article non vérifié. À faire valider par un professionnel du droit avant la mise en ligne.
 */
export function buildLegalDocs(settings: LegalSettings = DEFAULT_LEGAL_SETTINGS): Record<string, LegalDoc> {
  const company = filled(settings.legal?.companyName || brand.legalName);
  const contactEmail = filled(settings.support?.email);
  const contactPhone = filled(settings.support?.phone);
  const address = filled(settings.support?.address || `${brand.city}, ${brand.country}`);
  const days = settings.returnWindowDays;

  return {
    cgv: {
      title: 'Conditions générales de vente',
      sections: [
        {
          heading: 'Objet et champ d’application',
          body: [
            `Les présentes conditions régissent les ventes conclues sur le site ${brand.name} entre ${company} (« la boutique ») et toute personne qui achète, avec ou sans compte client. Elles sont acceptées à chaque commande ; la version applicable est celle en vigueur au jour de la commande.`,
            `Des vendeurs indépendants, inscrits sur ${brand.name}, y publient aussi leurs produits. Chaque fiche indique la boutique qui vend. Un panier qui réunit plusieurs boutiques donne une commande par boutique : chacune est préparée par sa boutique, livrée par les livreurs de ${brand.name} ou par le vendeur, et payée à la livraison. Pour les produits d’un vendeur, le vendeur est responsable du produit. ${brand.name} vérifie les produits avant publication et encaisse pour le vendeur lorsque la livraison est assurée par ses livreurs. Les différends concernant une vente ou une livraison organisée par un vendeur sont à régler directement entre l’acheteur et la boutique ; ${brand.name} ne les instruit ni ne les arbitre.`,
          ],
        },
        {
          heading: 'Produits',
          body: [
            'Les caractéristiques essentielles des produits figurent sur leur fiche. Les photos sont aussi fidèles que possible mais n’ont pas de valeur contractuelle. Les produits sont proposés dans la limite des stocks disponibles.',
          ],
        },
        {
          heading: 'Prix',
          body: [
            'Les prix sont indiqués en francs CFA (XAF), toutes taxes comprises : la taxe sur la valeur ajoutée applicable au Gabon (18 % au taux normal) est incluse. Les frais de livraison s’ajoutent et sont affichés avant la confirmation.',
            'Le prix applicable est celui affiché au moment de la confirmation de la commande ; il est conservé dans la commande. Si un prix change alors qu’un produit est dans votre panier, le nouveau montant vous est présenté avant la commande.',
          ],
        },
        {
          heading: 'Commande',
          body: [
            'La commande est conclue après le récapitulatif, l’acceptation des présentes conditions et la confirmation. Pour un panier multi-boutiques, un numéro global relie les sous-commandes de chaque boutique ; un code de suivi commun et un e-mail récapitulatif vous sont communiqués. Le récapitulatif n’est pas une facture : la facture est émise au paiement.',
            'La boutique peut demander une vérification avant de préparer une commande inhabituelle (montant, quantités, commandes répétées). Elle peut annuler une commande en cas de fraude avérée ou de produit indisponible ; toute somme versée est alors remboursée.',
          ],
        },
        {
          heading: 'Paiement',
          body: [
            'Tous les paiements se font à la livraison : en espèces, par Airtel Money ou par Moov Money. Aucun paiement n’est demandé avant la livraison. Pour les sous-commandes confiées au livreur OKOZA, le paiement est regroupé et réglé une fois à la réception. Les boutiques qui livrent elles-mêmes encaissent leur sous-commande séparément. Pour le Mobile Money, utilisez la référence de panier ou de commande indiquée au récapitulatif.',
            'Seul le montant exact dû pour la livraison concernée est accepté. La facture est émise une fois le paiement enregistré par la boutique.',
          ],
        },
        {
          heading: 'Livraison',
          body: [
            'Pour les commandes centralisées, un livreur OKOZA collecte les produits dans les boutiques concernées et les remet en une seule livraison à l’adresse indiquée. Une boutique peut aussi organiser indépendamment la livraison de sa sous-commande. Les frais sont affichés avant la confirmation ; les délais sont indicatifs. En cas d’absence, une nouvelle tentative ou l’annulation vous est proposée.',
            'Les risques sont transférés à la remise du colis. Vérifiez le colis en présence du livreur et signalez tout dommage depuis votre compte ou la page Contact dans les meilleurs délais.',
          ],
        },
        {
          heading: 'Annulation, retours et remboursements',
          body: [
            'Avant le début de la préparation, vous pouvez annuler votre commande depuis votre compte. Ensuite, une demande d’annulation est examinée par la boutique, qui vous informe de sa décision et de son motif.',
            `Un retour peut être demandé dans les ${days} jours suivant la livraison, selon les modalités de la page Retours et remboursements. Le remboursement intervient après confirmation de réception, par le moyen de paiement initial lorsque c’est possible.`,
          ],
        },
        {
          heading: 'Garanties',
          body: [
            'Les produits bénéficient de la garantie légale contre les vices cachés et de la garantie de conformité au contrat, dans les conditions prévues par la loi. Un produit défectueux ou non conforme est réparé, remplacé ou remboursé, retour à la charge de la boutique.',
          ],
        },
        {
          heading: 'Contact et recours',
          body: [
            `Pour toute question ou réclamation : ${contactEmail}, ${contactPhone}, ou la page Contact. Une solution amiable est recherchée en priorité.`,
            'Les présentes conditions sont soumises au droit gabonais. À défaut d’accord amiable, le litige est porté devant les juridictions compétentes de Libreville, sous réserve des règles protectrices dont bénéficie le consommateur.',
          ],
        },
      ],
    },
    confidentialite: {
      title: 'Politique de confidentialité',
      sections: [
        {
          heading: 'Responsable du traitement',
          body: [
            `${company}, ${address}. Contact pour vos données : ${contactEmail}. Les traitements respectent la loi n° 001/2011 du 25 septembre 2011 relative à la protection des données à caractère personnel ; ils sont déclarés auprès de la Commission Nationale pour la Protection des Données à Caractère Personnel (CNPDCP).`,
          ],
        },
        {
          heading: 'Données collectées',
          body: [
            'Commande : nom, téléphone, adresse e-mail, quartier, repère et consignes de livraison. Avec un compte : identifiants, adresses, favoris, historique de commandes et préférences d’e-mail. Assistance : vos messages et les photos jointes. Commande auprès d’une boutique de vendeur : les informations nécessaires à la préparation et à la livraison (nom, téléphone, quartier, repère, consignes) sont transmises à ce vendeur.',
            'Le mot de passe n’est jamais conservé en clair. Aucune donnée de carte bancaire n’est collectée : les paiements Mobile Money se font hors du site.',
          ],
        },
        {
          heading: 'Finalités et bases légales',
          body: [
            'Exécution du contrat : préparer, livrer et facturer vos commandes, gérer retours et remboursements et votre compte. Obligation légale : conservation des factures. Intérêt légitime : sécurité du site et prévention de la fraude (vérification de commandes inhabituelles). Consentement : mesure d’audience et offres promotionnelles par e-mail.',
          ],
        },
        {
          heading: 'Destinataires et sous-traitants',
          body: [
            'Vos données sont traitées par l’équipe habilitée de la boutique, chacun selon son rôle. Le livreur reçoit uniquement ce qui est nécessaire à la livraison. Vos données ne sont jamais vendues.',
            'Prestataires techniques, liés par contrat : hébergement du site (Vercel) et de l’API (Render), base de données (Neon), envoi des e-mails (Resend), images (Cloudinary), suivi des erreurs (Sentry), et intelligence artificielle pour l’assistant d’achat et la vérification des produits des vendeurs (Google Gemini ou Anthropic). Ces prestataires peuvent héberger les données hors du Gabon, notamment aux États-Unis ou dans l’Union européenne ; la boutique encadre ces transferts par des engagements contractuels de protection.',
          ],
        },
        {
          heading: 'Assistants automatisés',
          body: [
            'L’assistant d’achat n’accède qu’aux informations publiques du catalogue. Les produits proposés par les vendeurs peuvent être analysés par un service d’intelligence artificielle pour vérifier leur conformité avant publication ; un refus est toujours décidé par une personne de l’équipe. Ne communiquez jamais de mot de passe ni de code reçu.',
          ],
        },
        {
          heading: 'Durées de conservation',
          body: [
            'Comptes clients inactifs : 3 ans, puis anonymisation. Factures et pièces comptables : 10 ans (droit comptable OHADA), archivées hors de votre compte. Paniers : 30 jours. Mesure d’audience : 13 mois. Journaux de connexion : 12 mois. Assistance et prospection : 3 ans après le dernier contact.',
          ],
        },
        {
          heading: 'Vos droits',
          body: [
            'Vous disposez d’un droit d’accès, de rectification, d’opposition et de suppression de vos données, ainsi que d’un droit d’obtenir une copie de vos données. Ces demandes se font depuis votre compte (Profil et préférences) ou via la page Contact ; une réponse vous est apportée dans un délai d’un mois.',
            'La suppression du compte efface ou anonymise vos données, sauf celles que la loi impose de conserver (factures). Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNPDCP.',
          ],
        },
        {
          heading: 'Sécurité',
          body: [
            'Connexions chiffrées (HTTPS), mots de passe protégés par un hachage robuste, accès de l’équipe en deux étapes et journalisés, sauvegardes de la base. En cas de violation de données présentant un risque, vous en serez informé.',
          ],
        },
        {
          heading: 'Cookies et stockage local',
          body: [
            'Des cookies techniques, indispensables, conservent votre session et protègent les formulaires. Le stockage de votre navigateur garde votre panier et les produits récemment consultés.',
            'La mesure d’audience n’est activée qu’avec votre accord, donné ou retiré à tout moment depuis « Gérer les cookies » en bas de page ; votre choix est redemandé après 6 mois. Aucun traceur publicitaire n’est utilisé.',
          ],
        },
      ],
    },
    mentions: {
      title: 'Mentions légales',
      sections: [
        {
          heading: 'Éditeur du site',
          body: [
            `${company}. Siège social : ${address}.`,
            `Immatriculation au Registre du Commerce et du Crédit Mobilier (RCCM) : ${filled(settings.legal?.rccm)}. Numéro d’identification fiscale (NIF) : ${filled(settings.legal?.nif)}.`,
            `Contact : ${contactEmail}, ${contactPhone}. Directeur de la publication : le représentant légal de la société.`,
          ],
        },
        {
          heading: 'Hébergement',
          body: [
            'Site : Vercel Inc. (vercel.com). API et traitements : Render Services, Inc. (render.com). Base de données : Neon, Inc. (neon.tech). Images : Cloudinary Ltd. (cloudinary.com).',
          ],
        },
        {
          heading: 'Propriété intellectuelle',
          body: [
            `La structure du site, ses textes, logos et visuels sont la propriété de ${company} ou de ses partenaires. Toute reproduction sans autorisation est interdite. Les marques citées appartiennent à leurs titulaires ; les fiches des produits des vendeurs engagent leurs auteurs.`,
          ],
        },
        {
          heading: 'Données personnelles',
          body: [
            'Le traitement de vos données est décrit dans la Politique de confidentialité, conformément à la loi n° 001/2011 relative à la protection des données à caractère personnel.',
          ],
        },
      ],
    },
    retours: {
      title: 'Retours et remboursements',
      sections: [
        {
          heading: 'Délai',
          body: [
            `Vous pouvez demander un retour dans les ${days} jours suivant la livraison, depuis votre compte ou la page Contact. Un retour refusé peut être réexaminé sur demande motivée.`,
          ],
        },
        {
          heading: 'Conditions',
          body: [
            'Le produit doit être complet, dans son emballage d’origine lorsque c’est possible, et ne pas avoir été utilisé au-delà de ce qui est nécessaire pour l’essayer. Pour un produit endommagé, défectueux ou non conforme, une description et au moins une photo sont demandées.',
          ],
        },
        {
          heading: 'Traitement',
          body: [
            'La boutique accepte ou refuse la demande et vous informe de sa décision et de son motif. Après réception, le produit est inspecté. Les frais de retour sont à la charge de la boutique pour un produit défectueux, endommagé ou non conforme ; dans les autres cas, ils sont précisés lors de l’acceptation.',
          ],
        },
        {
          heading: 'Remboursement',
          body: [
            'Le remboursement correspond au montant payé pour les articles retournés, remises comprises au prorata. Il est effectué après confirmation de réception du retour, par le moyen de paiement initial lorsque c’est possible ; un autre moyen nécessite votre accord.',
          ],
        },
      ],
    },
  };
}

/** Textes avec les valeurs par défaut : base de l'éditeur des pages légales du back-office. */
export const legalDocs = buildLegalDocs();
