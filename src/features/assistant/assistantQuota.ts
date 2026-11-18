/**
 * Limites de l'assistant client (2.1, 16.6) : un nombre de messages par visiteur et par heure contre les abus,
 * et un budget mensuel de requêtes pour la boutique. La limite par visiteur est comptée dans le navigateur ;
 * le budget mensuel est tenu et plafonné par l'API.
 * Une suspension ne bloque jamais le catalogue, le panier ni les commandes.
 */
export const WINDOW_MS = 60 * 60_000;
export const GUEST_LIMIT = 20;
export const MEMBER_LIMIT = 60;

export interface RateCheck {
  ok: boolean;
  remaining: number;
  /** Heure à laquelle un nouveau message sera possible, si la limite est atteinte. */
  retryAt: number | null;
}

export function checkRate(timestamps: number[], now: number, limit: number, windowMs = WINDOW_MS): RateCheck {
  const recent = timestamps.filter((t) => now - t < windowMs).sort((a, b) => a - b);
  if (recent.length < limit) return { ok: true, remaining: limit - recent.length - 1, retryAt: null };
  return { ok: false, remaining: 0, retryAt: recent[recent.length - limit] + windowMs };
}

/** Période de budget : le mois en cours. */
export const budgetPeriod = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const nextPeriodStart = (now = new Date()) => new Date(now.getFullYear(), now.getMonth() + 1, 1);

export function budgetExhausted(used: number, budget: number | undefined) {
  return budget !== undefined && budget > 0 && used >= budget;
}

const KEY = 'shop-assistant-messages';

export function readTimestamps(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function writeTimestamps(list: number[], now = Date.now()) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.filter((t) => now - t < WINDOW_MS)));
  } catch {
    // Stockage indisponible : la limite repose alors sur l'API
  }
}

/** Réserve un message pour ce visiteur ; renvoie l'heure de reprise si la limite est atteinte. */
export function takeMessageSlot(member: boolean, now = Date.now()): number | null {
  const stamps = readTimestamps();
  const rate = checkRate(stamps, now, member ? MEMBER_LIMIT : GUEST_LIMIT);
  if (!rate.ok) return rate.retryAt;
  writeTimestamps([...stamps, now], now);
  return null;
}
