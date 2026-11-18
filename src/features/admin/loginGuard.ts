/** Adresse masquée pour indiquer où le code a été envoyé : n•••@boutique.ga */
export const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  return `${user[0]}${'•'.repeat(Math.max(2, user.length - 1))}@${domain}`;
};

/** Session du back-office : fermée après 60 minutes sans activité (28.8). L'API doit aussi l'invalider. */
export const SESSION_MINUTES = 60;
const ACTIVITY_KEY = 'shop-admin-activity';

export const sessionExpired = (lastActivity: number | null, now: number) =>
  lastActivity !== null && now - lastActivity > SESSION_MINUTES * 60_000;

export function readActivity(): number | null {
  try {
    const v = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function writeActivity(at: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    // Stockage indisponible : l'expiration reste gérée par l'API en production
  }
}
