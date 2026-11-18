import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { API_URL, LOG_DIR, startStack, stop, WEB_URL } from './stack';

/** Fichier d'état du navigateur : cookies non essentiels refusés aujourd'hui (un refus ancien expire). */
export const CONSENT_STATE = join(LOG_DIR, '..', '.state', 'consent.json');

const answers = async (url: string) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

/**
 * Monte l'environnement une fois pour tous les parcours, et renvoie de quoi l'arrêter à la fin.
 * Si un environnement lancé par `npm run e2e:up` tourne déjà, il est réutilisé tel quel (mise au point).
 */
export default async function globalSetup() {
  writeConsentState();
  if ((await answers(`${API_URL}/health`)) && (await answers(WEB_URL))) return;
  const children = await startStack();
  return () => children.forEach(stop);
}

function writeConsentState() {
  const value = JSON.stringify({ state: { analytics: false, decidedAt: Date.now() }, version: 0 });
  const state = { cookies: [], origins: [{ origin: WEB_URL, localStorage: [{ name: 'shop-consent', value }] }] };
  mkdirSync(dirname(CONSENT_STATE), { recursive: true });
  writeFileSync(CONSENT_STATE, JSON.stringify(state));
}
