const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Formate un montant en francs CFA : 125 000 FCFA. */
export function formatPrice(amount: number) {
  // Intl utilise une espace fine insécable ; on la remplace par une espace insécable classique pour un rendu homogène.
  return `${formatter.format(Math.round(amount)).replace(/\u202f/g, '\u00a0')}\u00a0FCFA`;
}
