import { privacyBackend } from './privacy.backend';
import type { PrivacyRequest } from './privacy.types';

/** Demandes que le client envoie lui-même ; l'export et la suppression sont tracés par le serveur. */
export type ClientPrivacyRequestType = Extract<PrivacyRequest['type'], 'access' | 'correction'>;

export const privacyApi = {
  /**
   * Suppression du compte par le client lui-même (2.2) : mot de passe redemandé, puis anonymisation immédiate.
   * Une trace sans donnée personnelle est gardée pour l'équipe.
   */
  deleteOwnAccount: (password: string) => privacyBackend.deleteMine(password),
  mine: (signal?: AbortSignal): Promise<PrivacyRequest[]> => privacyBackend.mine(signal),
  create: (type: ClientPrivacyRequestType, details: string) => privacyBackend.create(type, details),
  /** Copie des données du client connecté, préparée par le serveur, qui garde la trace de l'export. */
  bundle: () => privacyBackend.exportMine(),
};

/** Téléchargement d'un fichier JSON lisible. */
export function downloadJson(data: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
