export const mainLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/catalogue?tri=newest', label: 'Nouveautés' },
  { to: '/annonces', label: 'Annonces' },
  { to: '/conseils', label: 'Conseils' },
  { to: '/livraison', label: 'Livraison' },
  { to: '/contact', label: 'Contact' },
];

export const footerLinks = {
  'Service client': [
    { to: '/contact', label: 'Nous contacter' },
    { to: '/suivi', label: 'Suivre une commande' },
    { to: '/livraison', label: 'Livraison et zones' },
    { to: '/legal/retours', label: 'Retours et remboursements' },
    { to: '/compte/assistance', label: 'Mes demandes d’assistance' },
  ],
  Boutique: [
    { to: '/catalogue', label: 'Tout le catalogue' },
    { to: '/promotions', label: 'Promotions' },
    { to: '/catalogue?tri=newest', label: 'Nouveautés' },
    { to: '/conseils', label: 'Conseils et guides' },
  ],
  'Mon compte': [
    { to: '/compte/commandes', label: 'Mes commandes' },
    { to: '/compte/favoris', label: 'Mes favoris' },
    { to: '/compte/fidelite', label: 'Fidélité et parrainage' },
    { to: '/compte/adresses', label: 'Mes adresses' },
  ],
};

export const legalLinks = [
  { to: '/legal/cgv', label: 'Conditions générales de vente' },
  { to: '/legal/confidentialite', label: 'Politique de confidentialité' },
  { to: '/legal/mentions', label: 'Mentions légales' },
];
