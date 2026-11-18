import { brand } from '@/config/brand';

export interface LegalDoc {
  title: string;
  sections: Array<{ heading: string; body: string[] }>;
}

/**
 * Textes modèles : à faire relire et compléter par un juriste au regard du droit gabonais
 * (protection des données, commerce électronique, mentions obligatoires) avant la mise en ligne.
 */
export const legalDocs: Record<string, LegalDoc> = {
  cgv: {
    title: 'Conditions générales de vente',
    sections: [
      {
        heading: 'Objet',
        body: [
          `Les présentes conditions régissent les ventes conclues sur le site ${brand.name} entre la boutique et toute personne effectuant un achat, avec ou sans compte client.`,
        ],
      },
      {
        heading: 'Prix',
        body: [
          'Les prix sont indiqués en francs CFA (XAF). Le prix applicable est celui affiché au moment de la confirmation de la commande ; il est conservé dans la commande et ne change pas ensuite.',
          'Si un prix change alors qu’un produit est dans votre panier, l’ancien et le nouveau prix vous sont présentés et vous devez confirmer le nouveau montant avant de commander.',
        ],
      },
      {
        heading: 'Commande',
        body: [
          'La commande est confirmée après acceptation des présentes conditions. Un numéro de commande et un code de suivi vous sont communiqués. Le récapitulatif de commande n’est pas une facture.',
        ],
      },
      {
        heading: 'Paiement',
        body: [
          'Les moyens acceptés sont les espèces à la livraison, Airtel Money et Moov Money. Les paiements Mobile Money sont réalisés en dehors du site puis vérifiés manuellement. La préparation commence après vérification des fonds.',
          'Une commande Mobile Money dont le paiement n’est pas vérifié dans un délai de 24 heures est annulée. Un paiement reçu après annulation fait l’objet d’un remboursement manuel.',
        ],
      },
      {
        heading: 'Livraison',
        body: [
          'Les frais de livraison sont fixes par quartier et affichés avant la confirmation. Les délais sont indicatifs. La livraison est assurée par des livreurs partenaires.',
        ],
      },
      {
        heading: 'Annulation, retours et remboursements',
        body: [
          'Avant le début de la préparation, vous pouvez annuler votre commande depuis votre suivi. Ensuite, une demande d’annulation est examinée par la boutique.',
          'Les demandes de retour sont possibles dans le délai indiqué sur la page Retours. Le remboursement intervient après réception et inspection du produit, par le moyen de paiement initial lorsque c’est possible.',
        ],
      },
      {
        heading: 'Fidélité',
        body: [
          'Les points sont crédités après livraison et paiement effectifs, à raison d’un point par tranche de 1 000 FCFA dépensés sur les produits. Un point vaut 50 FCFA ; l’utilisation est possible à partir de 100 points. Les points n’expirent pas.',
        ],
      },
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    sections: [
      {
        heading: 'Données collectées',
        body: [
          'Nous collectons les données nécessaires au traitement de vos commandes : nom, téléphone, adresse e-mail, quartier et repère de livraison. Avec un compte : vos adresses, favoris, historique et points de fidélité.',
        ],
      },
      {
        heading: 'Finalités',
        body: [
          'Ces données servent à préparer et livrer vos commandes, vous informer de leur avancement, gérer le service client, le programme de fidélité et prévenir la fraude.',
        ],
      },
      {
        heading: 'Assistant d’achat',
        body: [
          'L’assistant n’accède qu’aux informations publiques du catalogue. Ne lui communiquez jamais de mot de passe ni de code secret. Les conversations sont conservées pour une durée courte puis supprimées.',
        ],
      },
      {
        heading: 'Partage',
        body: [
          'Le livreur attribué reçoit uniquement les informations nécessaires à la livraison. Vos données ne sont pas vendues.',
        ],
      },
      {
        heading: 'Vos droits',
        body: [
          'Vous pouvez demander l’accès, la rectification ou la suppression de vos données depuis votre compte ou via la page Contact. Certaines données de commande sont conservées pendant la durée exigée par la loi.',
          'Durées de conservation : comptes clients inactifs 3 ans ; documents comptables 10 ans, archivés à part et hors de votre compte ; paniers abandonnés 30 jours ; historique de navigation 13 mois ; journaux de connexion 12 mois ; service client et prospection 3 ans.',
          'La suppression de votre compte efface ou anonymise vos données personnelles, sauf les documents que la loi impose de conserver (factures et avoirs).',
        ],
      },
      {
        heading: 'Cookies et stockage local',
        body: [
          'Le site utilise le stockage de votre navigateur pour conserver votre panier, votre session et les produits récemment consultés. Aucun traceur publicitaire n’est utilisé à ce stade.',
        ],
      },
    ],
  },
  mentions: {
    title: 'Mentions légales',
    sections: [
      {
        heading: 'Éditeur',
        body: [
          `${brand.legalName}. Siège : ${brand.city}, ${brand.country}. RCCM, NIF et responsable de la publication : à compléter.`,
        ],
      },
      { heading: 'Hébergement', body: ['Nom et coordonnées de l’hébergeur : à compléter.'] },
      {
        heading: 'Propriété intellectuelle',
        body: ['Les contenus du site sont protégés. Les marques citées appartiennent à leurs titulaires respectifs.'],
      },
    ],
  },
  retours: {
    title: 'Retours et remboursements',
    sections: [
      {
        heading: 'Délai',
        body: [
          'Vous pouvez demander un retour dans les 7 jours suivant la livraison, depuis votre compte, votre suivi de commande ou la page Contact.',
        ],
      },
      {
        heading: 'Justificatifs',
        body: [
          'Une description, et si nécessaire des photos, sont demandées uniquement pour les produits endommagés, défectueux ou non conformes.',
        ],
      },
      {
        heading: 'Traitement',
        body: [
          'La boutique accepte ou refuse la demande et vous en informe. Après réception, le produit est inspecté. Les frais de retour sont décidés au cas par cas.',
        ],
      },
      {
        heading: 'Remboursement',
        body: [
          'Le remboursement correspond au montant payé pour les articles concernés. Il est effectué manuellement, par le moyen de paiement initial lorsque c’est possible, après réception et vérification. Les points gagnés sur ces articles sont retirés.',
        ],
      },
    ],
  },
};
