/** Correction manuelle : un nombre entier non nul et un motif, conservés dans l'historique non modifiable. */
export function correctionError(points: number, reason: string): string | null {
  if (!Number.isInteger(points) || points === 0) return 'Indiquez un nombre de points entier, positif ou négatif.';
  if (Math.abs(points) > 100_000) return 'Correction trop importante : 100 000 points au maximum.';
  if (reason.trim().length < 5) return 'Indiquez le motif de la correction.';
  return null;
}
