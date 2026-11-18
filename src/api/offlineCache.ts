/**
 * Copie locale des données publiques du catalogue (20.2) : la dernière réponse reçue est gardée
 * dans le stockage du navigateur et resservie si le réseau est coupé. Les données personnelles
 * (commandes, compte, assistance) et le back-office ne sont jamais conservés.
 */
const CACHE = 'catalogue-data-v1';
const PUBLIC_PATHS = [
  '/products',
  '/categories',
  '/settings',
  '/deliveryZones',
  // Chemins de l'API Okoumé (VITE_BACKEND_URL)
  '/delivery-zones',
  '/reviews',
  '/articles',
  '/banners',
  '/ads',
  '/offers',
  '/legalPages',
];

const available = () => typeof caches !== 'undefined';

export const isPublicData = (path: string) =>
  PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));

export async function saveOffline(url: string, body: string, total: string | null) {
  if (!available()) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(
      url,
      new Response(body, { headers: { 'Content-Type': 'application/json', 'X-Total-Count': total ?? '' } }),
    );
  } catch {
    // Stockage plein ou indisponible : la copie hors ligne est simplement ignorée
  }
}

export async function readOffline(url: string) {
  if (!available()) return null;
  try {
    const response = await (await caches.open(CACHE)).match(url);
    if (!response) return null;
    return { text: await response.text(), total: response.headers.get('X-Total-Count') };
  } catch {
    return null;
  }
}
