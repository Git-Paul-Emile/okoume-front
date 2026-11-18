import { env } from '@/config/env';

export const healthApi = {
  /** Route de vie de l'API (/health), hors de /api/v1 : répond sans toucher à la base. */
  ping: async (signal?: AbortSignal) => {
    const response = await fetch(`${env.backendOrigin}/health`, { signal });
    if (!response.ok) throw new Error(`API indisponible (${response.status})`);
    return true;
  },
};
