import { brand } from '@/config/brand';
import type { ShopSettings } from '@/features/settings/settings.types';

export interface LegalDoc {
  title: string;
  sections: Array<{ heading: string; body: string[] }>;
}

/** ParamÃ¨tres de la boutique repris dans les textes : un seul endroit Ã  modifier, le site reste cohÃ©rent. */
export type LegalSettings = Partial<Pick<ShopSettings, 'legal' | 'support'>>;

/** Valeurs de configuration utilisées par les pages légales. */
export const DEFAULT_LEGAL_SETTINGS: LegalSettings = {};

/** Valeur obligatoire pas encore fournie : signalÃ©e clairement plutÃ´t qu'inventÃ©e. */
const TO_FILL = '[Ã  renseigner dans les ParamÃ¨tres avant la mise en ligne]';
const filled = (value: string | undefined) => (value && value.trim() ? value.trim() : TO_FILL);

/**
 * Textes lÃ©gaux Ã©tablis au regard du droit gabonais : loi nÂ° 001/2011 du 25 septembre 2011 relative Ã  la protection
 * des donnÃ©es Ã  caractÃ¨re personnel (contrÃ´le : CNPDCP), droit OHADA (RCCM, conservation comptable), TVA gabonaise.
 * Faute de texte gabonais prÃ©cis connu (retours, garanties), le modÃ¨le franÃ§ais sert de rÃ©fÃ©rence, sans citer
 * d'article non vÃ©rifiÃ©. Ã€ faire valider par un professionnel du droit avant la mise en ligne.
 */
export function buildLegalDocs(settings: LegalSettings = DEFAULT_LEGAL_SETTINGS): Record<string, LegalDoc> {
  const company = filled(settings.legal?.companyName || brand.legalName);
  const contactEmail = filled(settings.support?.email);
  const contactPhone = filled(settings.support?.phone);
  const address = filled(settings.support?.address || `${brand.city}, ${brand.country}`);

  return {
    cgv: {
      title: 'Conditions gÃ©nÃ©rales de vente',
      sections: [
        {
          heading: 'Objet et champ dâ€™application',
          body: [
            `Les prÃ©sentes conditions rÃ©gissent les ventes conclues sur le site ${brand.name} entre ${company} (Â« la boutique Â») et toute personne qui achÃ¨te, avec ou sans compte client. Elles sont acceptÃ©es Ã  chaque commande ; la version applicable est celle en vigueur au jour de la commande.`,
            `Des vendeurs indÃ©pendants, inscrits sur ${brand.name}, y publient aussi leurs produits. Chaque fiche indique la boutique qui vend. Un panier qui rÃ©unit plusieurs boutiques donne une commande par boutique : chacune est prÃ©parÃ©e par sa boutique, livrÃ©e par les livreurs de ${brand.name} ou par le vendeur, et payÃ©e Ã  la livraison. Pour les produits dâ€™un vendeur, le vendeur est responsable du produit. ${brand.name} vÃ©rifie les produits avant publication et encaisse pour le vendeur lorsque la livraison est assurÃ©e par ses livreurs. Les diffÃ©rends concernant une vente ou une livraison organisÃ©e par un vendeur sont Ã  rÃ©gler directement entre lâ€™acheteur et la boutique ; ${brand.name} ne les instruit ni ne les arbitre.`,
          ],
        },
        {
          heading: 'Produits',
          body: [
            'Les caractÃ©ristiques essentielles des produits figurent sur leur fiche. Les photos sont aussi fidÃ¨les que possible mais nâ€™ont pas de valeur contractuelle. Les produits sont proposÃ©s dans la limite des stocks disponibles.',
          ],
        },
        {
          heading: 'Prix',
          body: [
            'Les prix sont indiquÃ©s en francs CFA (XAF), toutes taxes comprises : la taxe sur la valeur ajoutÃ©e applicable au Gabon (18 % au taux normal) est incluse. Les frais de livraison sâ€™ajoutent et sont affichÃ©s avant la confirmation.',
            'Le prix applicable est celui affichÃ© au moment de la confirmation de la commande ; il est conservÃ© dans la commande. Si un prix change alors quâ€™un produit est dans votre panier, le nouveau montant vous est prÃ©sentÃ© avant la commande.',
          ],
        },
        {
          heading: 'Commande',
          body: [
            'La commande est conclue aprÃ¨s le rÃ©capitulatif, lâ€™acceptation des prÃ©sentes conditions et la confirmation. Pour un panier multi-boutiques, un numÃ©ro global relie les sous-commandes de chaque boutique ; un code de suivi commun et un e-mail rÃ©capitulatif vous sont communiquÃ©s. Le rÃ©capitulatif nâ€™est pas une facture : la facture est Ã©mise au paiement.',
            'La boutique peut demander une vÃ©rification avant de prÃ©parer une commande inhabituelle (montant, quantitÃ©s, commandes rÃ©pÃ©tÃ©es). Elle peut annuler une commande en cas de fraude avÃ©rÃ©e ou de produit indisponible ; toute somme versÃ©e est alors remboursÃ©e.',
          ],
        },
        {
          heading: 'Paiement',
          body: [
            'Tous les paiements se font Ã  la livraison : en espÃ¨ces, par Airtel Money ou par Moov Money. Aucun paiement nâ€™est demandÃ© avant la livraison. Pour les sous-commandes confiÃ©es au livreur OKOZA, le paiement est regroupÃ© et rÃ©glÃ© une fois Ã  la rÃ©ception. Les boutiques qui livrent elles-mÃªmes encaissent leur sous-commande sÃ©parÃ©ment. Pour le Mobile Money, utilisez la rÃ©fÃ©rence de panier ou de commande indiquÃ©e au rÃ©capitulatif.',
            'Seul le montant exact dÃ» pour la livraison concernÃ©e est acceptÃ©. La facture est Ã©mise une fois le paiement enregistrÃ© par la boutique.',
          ],
        },
        {
          heading: 'Livraison',
          body: [
            'Pour les commandes centralisÃ©es, un livreur OKOZA collecte les produits dans les boutiques concernÃ©es et les remet en une seule livraison Ã  lâ€™adresse indiquÃ©e. Une boutique peut aussi organiser indÃ©pendamment la livraison de sa sous-commande. Les frais sont affichÃ©s avant la confirmation ; les dÃ©lais sont indicatifs. En cas dâ€™absence, une nouvelle tentative ou lâ€™annulation vous est proposÃ©e.',
            'Les risques sont transfÃ©rÃ©s Ã  la remise du colis. VÃ©rifiez le colis en prÃ©sence du livreur et signalez tout dommage depuis votre compte ou la page Contact dans les meilleurs dÃ©lais.',
          ],
        },
        {
          heading: 'Garanties',
          body: [
            'Les produits bÃ©nÃ©ficient de la garantie lÃ©gale contre les vices cachÃ©s et de la garantie de conformitÃ© au contrat, dans les conditions prÃ©vues par la loi. Un produit dÃ©fectueux ou non conforme est rÃ©parÃ©, remplacÃ© ou remboursÃ©, retour Ã  la charge de la boutique.',
          ],
        },
        {
          heading: 'Contact et recours',
          body: [
            `Pour toute question ou rÃ©clamation : ${contactEmail}, ${contactPhone}, ou la page Contact. Une solution amiable est recherchÃ©e en prioritÃ©.`,
            'Les prÃ©sentes conditions sont soumises au droit gabonais. Ã€ dÃ©faut dâ€™accord amiable, le litige est portÃ© devant les juridictions compÃ©tentes de Libreville, sous rÃ©serve des rÃ¨gles protectrices dont bÃ©nÃ©ficie le consommateur.',
          ],
        },
      ],
    },
    confidentialite: {
      title: 'Politique de confidentialitÃ©',
      sections: [
        {
          heading: 'Responsable du traitement',
          body: [
            `${company}, ${address}. Contact pour vos donnÃ©es : ${contactEmail}. Les traitements respectent la loi nÂ° 001/2011 du 25 septembre 2011 relative Ã  la protection des donnÃ©es Ã  caractÃ¨re personnel ; ils sont dÃ©clarÃ©s auprÃ¨s de la Commission Nationale pour la Protection des DonnÃ©es Ã  CaractÃ¨re Personnel (CNPDCP).`,
          ],
        },
        {
          heading: 'DonnÃ©es collectÃ©es',
          body: [
            'Commande : nom, tÃ©lÃ©phone, adresse e-mail, quartier, repÃ¨re et consignes de livraison. Avec un compte : identifiants, adresses, favoris, historique de commandes et prÃ©fÃ©rences dâ€™e-mail. Assistance : vos messages et les photos jointes. Commande auprÃ¨s dâ€™une boutique de vendeur : les informations nÃ©cessaires Ã  la prÃ©paration et Ã  la livraison (nom, tÃ©lÃ©phone, quartier, repÃ¨re, consignes) sont transmises Ã  ce vendeur.',
            'Le mot de passe nâ€™est jamais conservÃ© en clair. Aucune donnÃ©e de carte bancaire nâ€™est collectÃ©e : les paiements Mobile Money se font hors du site.',
          ],
        },
        {
          heading: 'FinalitÃ©s et bases lÃ©gales',
          body: [
            'ExÃ©cution du contrat : prÃ©parer, livrer et facturer vos commandes, gÃ©rer retours et remboursements et votre compte. Obligation lÃ©gale : conservation des factures. IntÃ©rÃªt lÃ©gitime : sÃ©curitÃ© du site et prÃ©vention de la fraude (vÃ©rification de commandes inhabituelles). Consentement : mesure dâ€™audience et offres promotionnelles par e-mail.',
          ],
        },
        {
          heading: 'Destinataires et sous-traitants',
          body: [
            'Vos donnÃ©es sont traitÃ©es par lâ€™Ã©quipe habilitÃ©e de la boutique, chacun selon son rÃ´le. Le livreur reÃ§oit uniquement ce qui est nÃ©cessaire Ã  la livraison. Vos donnÃ©es ne sont jamais vendues.',
            'Prestataires techniques, liÃ©s par contrat : hÃ©bergement du site (Vercel) et de lâ€™API (Render), base de donnÃ©es (Neon), envoi des e-mails (Resend), images (Cloudinary), suivi des erreurs (Sentry), et intelligence artificielle pour lâ€™assistant dâ€™achat et la vÃ©rification des produits des vendeurs (Google Gemini ou Anthropic). Ces prestataires peuvent hÃ©berger les donnÃ©es hors du Gabon, notamment aux Ã‰tats-Unis ou dans lâ€™Union europÃ©enne ; la boutique encadre ces transferts par des engagements contractuels de protection.',
          ],
        },
        {
          heading: 'Assistants automatisÃ©s',
          body: [
            'Lâ€™assistant dâ€™achat nâ€™accÃ¨de quâ€™aux informations publiques du catalogue. Les produits proposÃ©s par les vendeurs peuvent Ãªtre analysÃ©s par un service dâ€™intelligence artificielle pour vÃ©rifier leur conformitÃ© avant publication ; un refus est toujours dÃ©cidÃ© par une personne de lâ€™Ã©quipe. Ne communiquez jamais de mot de passe ni de code reÃ§u.',
          ],
        },
        {
          heading: 'DurÃ©es de conservation',
          body: [
            'Comptes clients inactifs : 3 ans, puis anonymisation. Factures et piÃ¨ces comptables : 10 ans (droit comptable OHADA), archivÃ©es hors de votre compte. Paniers : 30 jours. Mesure dâ€™audience : 13 mois. Journaux de connexion : 12 mois. Assistance et prospection : 3 ans aprÃ¨s le dernier contact.',
          ],
        },
        {
          heading: 'Vos droits',
          body: [
            'Vous disposez dâ€™un droit dâ€™accÃ¨s, de rectification, dâ€™opposition et de suppression de vos donnÃ©es, ainsi que dâ€™un droit dâ€™obtenir une copie de vos donnÃ©es. Ces demandes se font depuis votre compte (Profil et prÃ©fÃ©rences) ou via la page Contact ; une rÃ©ponse vous est apportÃ©e dans un dÃ©lai dâ€™un mois.',
            'La suppression du compte efface ou anonymise vos donnÃ©es, sauf celles que la loi impose de conserver (factures). Si vous estimez que vos droits ne sont pas respectÃ©s, vous pouvez saisir la CNPDCP.',
          ],
        },
        {
          heading: 'SÃ©curitÃ©',
          body: [
            'Connexions chiffrÃ©es (HTTPS), mots de passe protÃ©gÃ©s par un hachage robuste, accÃ¨s de lâ€™Ã©quipe en deux Ã©tapes et journalisÃ©s, sauvegardes de la base. En cas de violation de donnÃ©es prÃ©sentant un risque, vous en serez informÃ©.',
          ],
        },
        {
          heading: 'Cookies et stockage local',
          body: [
            'Des cookies techniques, indispensables, conservent votre session et protÃ¨gent les formulaires. Le stockage de votre navigateur garde votre panier et les produits rÃ©cemment consultÃ©s.',
            'La mesure dâ€™audience nâ€™est activÃ©e quâ€™avec votre accord, donnÃ© ou retirÃ© Ã  tout moment depuis Â« GÃ©rer les cookies Â» en bas de page ; votre choix est redemandÃ© aprÃ¨s 6 mois. Aucun traceur publicitaire nâ€™est utilisÃ©.',
          ],
        },
      ],
    },
    mentions: {
      title: 'Mentions lÃ©gales',
      sections: [
        {
          heading: 'Ã‰diteur du site',
          body: [
            `${company}. SiÃ¨ge social : ${address}.`,
            `Immatriculation au Registre du Commerce et du CrÃ©dit Mobilier (RCCM) : ${filled(settings.legal?.rccm)}. NumÃ©ro dâ€™identification fiscale (NIF) : ${filled(settings.legal?.nif)}.`,
            `Contact : ${contactEmail}, ${contactPhone}. Directeur de la publication : le reprÃ©sentant lÃ©gal de la sociÃ©tÃ©.`,
          ],
        },
        {
          heading: 'HÃ©bergement',
          body: [
            'Site : Vercel Inc. (vercel.com). API et traitements : Render Services, Inc. (render.com). Base de donnÃ©es : Neon, Inc. (neon.tech). Images : Cloudinary Ltd. (cloudinary.com).',
          ],
        },
        {
          heading: 'PropriÃ©tÃ© intellectuelle',
          body: [
            `La structure du site, ses textes, logos et visuels sont la propriÃ©tÃ© de ${company} ou de ses partenaires. Toute reproduction sans autorisation est interdite. Les marques citÃ©es appartiennent Ã  leurs titulaires ; les fiches des produits des vendeurs engagent leurs auteurs.`,
          ],
        },
        {
          heading: 'DonnÃ©es personnelles',
          body: [
            'Le traitement de vos donnÃ©es est dÃ©crit dans la Politique de confidentialitÃ©, conformÃ©ment Ã  la loi nÂ° 001/2011 relative Ã  la protection des donnÃ©es Ã  caractÃ¨re personnel.',
          ],
        },
      ],
    }  };
}

/** Textes avec les valeurs par dÃ©faut : base de l'Ã©diteur des pages lÃ©gales du back-office. */
export const legalDocs = buildLegalDocs();


