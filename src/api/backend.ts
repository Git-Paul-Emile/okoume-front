import { env } from '@/config/env';
import { ApiError } from './ApiError';
import type { QueryParams } from './types';

/**
 * Client HTTP de l'API Okoumé (api/), selon son contrat :
 * - réponses enveloppées { success, status, message, data } ; erreurs { message, code, requestId, errors } ;
 * - collections paginées { items, total, page, limit, hasNext } ;
 * - session par cookies HttpOnly (credentials: 'include'), jamais stockée en JavaScript ;
 * - protection CSRF : toute écriture renvoie le cookie ok_csrf dans l'en-tête X-CSRF-Token.
 */

const CSRF_COOKIE = 'ok_csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD']);
/** Taille de page maximale acceptée par l'API (core/validation/common.schemas.ts) */
export const MAX_PAGE_SIZE = 100;

export interface PageOf<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

/** Détails d'une erreur de l'API, gardés dans ApiError.details. */
export interface BackendErrorDetails {
  code: string | null;
  requestId: string | null;
  errors: Array<{ field: string; message: string }>;
}

function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(`${env.backendUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const found = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function errorDetails(body: unknown): BackendErrorDetails {
  if (!isRecord(body)) return { code: null, requestId: null, errors: [] };
  const errors = Array.isArray(body.errors)
    ? body.errors.flatMap((e) =>
        isRecord(e) && typeof e.field === 'string' && typeof e.message === 'string'
          ? [{ field: e.field, message: e.message }]
          : [],
      )
    : [];
  return {
    code: typeof body.code === 'string' ? body.code : null,
    requestId: typeof body.requestId === 'string' ? body.requestId : null,
    errors,
  };
}

/** Données d'une réponse enveloppée ; une réponse 204 n'a pas de données. */
function unwrap(body: unknown): unknown {
  return isRecord(body) && 'data' in body ? body.data : null;
}

type RequestOptions = { params?: QueryParams; body?: unknown; signal?: AbortSignal };

/** Clients et équipe ont chacun leurs cookies et leur route de renouvellement. */
type Audience = 'customer' | 'staff';
const REFRESH_PATH: Record<Audience, string> = {
  customer: '/auth/sessions/refresh',
  staff: '/staff/auth/sessions/refresh',
};

/** Un seul renouvellement à la fois par public : les requêtes refusées en même temps attendent le même. */
const refreshing: Record<Audience, Promise<boolean> | null> = { customer: null, staff: null };

function refreshSession(audience: Audience) {
  refreshing[audience] ??= send('POST', REFRESH_PATH[audience])
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing[audience] = null;
    });
  return refreshing[audience];
}

/** Public de la session à renouveler pour cette route ; null pour les routes d'authentification. */
function audienceOf(path: string): Audience | null {
  if (path.startsWith('/auth/') || path.startsWith('/staff/auth/sessions') || path.startsWith('/staff/auth/challenges'))
    return null;
  return path.startsWith('/staff/') ? 'staff' : 'customer';
}

/**
 * Les jetons d'accès vivent quelques minutes : sur un refus 401, la session (du client ou de l'équipe, selon
 * la route) est renouvelée une fois avec le cookie de renouvellement, puis la requête est rejouée.
 * Les routes de connexion et de renouvellement ne sont pas concernées.
 */
async function request(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
  try {
    return await send(method, path, options);
  } catch (error) {
    const audience = audienceOf(path);
    if (!(error instanceof ApiError) || error.status !== 401 || !audience) throw error;
    if (!(await refreshSession(audience))) throw error;
    return send(method, path, options);
  }
}

async function send(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
  const url = buildUrl(path, options.params);
  const csrf = SAFE_METHODS.has(method) ? null : readCookie(CSRF_COOKIE);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: options.signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // Identifiant de corrélation : l'API le reprend dans ses logs et ses erreurs remontées (observability.md)
        'X-Request-Id': crypto.randomUUID(),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Réseau indisponible', 0, error);
  }

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === 'string' ? body.message : `Erreur ${response.status}`;
    throw new ApiError(message, response.status, errorDetails(body));
  }
  return unwrap(body);
}

export const backend = {
  get: (path: string, params?: QueryParams, signal?: AbortSignal) => request('GET', path, { params, signal }),
  post: (path: string, body?: unknown, signal?: AbortSignal) => request('POST', path, { body, signal }),
  patch: (path: string, body?: unknown) => request('PATCH', path, { body }),
  put: (path: string, body?: unknown) => request('PUT', path, { body }),
  delete: (path: string, body?: unknown) => request('DELETE', path, { body }),
};

/** Une page d'une collection de l'API, chaque élément converti par toItem (qui valide sa forme). */
export async function getPage<T>(
  path: string,
  params: QueryParams,
  toItem: (raw: unknown) => T,
  signal?: AbortSignal,
): Promise<PageOf<T>> {
  const data = await backend.get(path, params, signal);
  if (!isRecord(data) || !Array.isArray(data.items)) throw new ApiError('Réponse de l’API inattendue', 502, data);
  return {
    items: data.items.map(toItem),
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    limit: Number(data.limit ?? MAX_PAGE_SIZE),
    hasNext: data.hasNext === true,
  };
}

/**
 * Toutes les pages d'une collection, dans la limite de maxPages. Réservé aux petites collections publiques
 * pendant la bascule (le catalogue filtre encore dans le navigateur) : au-delà, la recherche paginée s'impose.
 */
export async function getAll<T>(
  path: string,
  params: QueryParams,
  toItem: (raw: unknown) => T,
  signal?: AbortSignal,
  maxPages = 20,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const result = await getPage(path, { ...params, page, limit: MAX_PAGE_SIZE }, toItem, signal);
    all.push(...result.items);
    if (!result.hasNext) return all;
  }
  return all;
}

/** Erreurs par champ renvoyées par l'API (validation zod du serveur), pour les afficher sous chaque champ. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !isRecord(error.details) || !Array.isArray(error.details.errors)) return {};
  const fields: Record<string, string> = {};
  for (const e of error.details.errors)
    if (isRecord(e) && typeof e.field === 'string' && typeof e.message === 'string') fields[e.field] ??= e.message;
  return fields;
}
