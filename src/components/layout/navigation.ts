export const mainLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/boutiques', label: 'Boutiques' },
  { to: '/catalogue', label: 'Produits' },
  { to: '/catalogue?tri=newest', label: 'Nouveautés' },
  { to: '/contact', label: 'Contact' },
];

export const footerLinks = {
  'Service client': [
    { to: '/contact', label: 'Nous contacter' },
    { to: '/suivi', label: 'Suivre une commande' },
  ],
  Boutique: [
    { to: '/catalogue', label: 'Tout le catalogue' },
    { to: '/promotions', label: 'Promotions' },
    { to: '/catalogue?tri=newest', label: 'Nouveautés' },
  ],
  'Mon compte': [
    { to: '/compte/commandes', label: 'Mes commandes' },
    { to: '/compte/adresses', label: 'Mes adresses' },
  ],
};

export const legalLinks = [
  { to: '/legal/cgv', label: 'Conditions générales de vente' },
  { to: '/legal/confidentialite', label: 'Politique de confidentialité' },
  { to: '/legal/mentions', label: 'Mentions légales' },
];
