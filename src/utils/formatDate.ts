/**
 * Dates et heures selon les conventions du cahier des charges (20.5) : JJ/MM/AAAA, heure du Gabon,
 * quel que soit le fuseau de l'appareil du visiteur.
 */
export const TIME_ZONE = 'Africa/Libreville';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

/** 12/10/2026 */
export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

/** 12/10/2026 à 14:05 */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${dateFormatter.format(d)} à ${timeFormatter.format(d)}`;
}

/** Formateur Intl à l'heure du Gabon, pour les libellés courts (axes de graphiques, jours de la semaine). */
export const gabonFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: TIME_ZONE });
