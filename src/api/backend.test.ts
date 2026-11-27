import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/env', () => ({ env: { backendUrl: 'http://api.test/api/v1' } }));

const { apiFieldErrors, backend, getAll } = await import('./backend');
const { ApiError } = await import('./ApiError');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'ok_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('client de l’API OKOZA', () => {
  it('lit les données de l’enveloppe et envoie les cookies de session, sans jeton CSRF en lecture', async () => {
    fetchMock.mockResolvedValue(json({ success: true, status: 200, message: 'OK', data: [{ id: 'a' }] }));
    expect(await backend.get('/categories')).toEqual([{ id: 'a' }]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/v1/categories');
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(init.headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('renvoie le cookie ok_csrf dans l’en-tête X-CSRF-Token pour une écriture', async () => {
    document.cookie = 'ok_csrf=jeton-de-test; path=/';
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await backend.post('/conversations/x/messages', { body: 'Bonjour' })).toBeNull();
    expect(fetchMock.mock.calls[0]![1].headers).toMatchObject({
      'X-CSRF-Token': 'jeton-de-test',
      'Content-Type': 'application/json',
    });
  });

  it('traduit une erreur de l’API : statut, message, code et champs en erreur', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          success: false,
          status: 400,
          message: 'Certaines données sont invalides.',
          code: 'VALIDATION_ERROR',
          requestId: 'req-1',
          errors: [{ field: 'price', message: 'Prix invalide.' }],
        },
        400,
      ),
    );
    const error = await backend.get('/products').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'Certaines données sont invalides.',
      details: {
        code: 'VALIDATION_ERROR',
        requestId: 'req-1',
        errors: [{ field: 'price', message: 'Prix invalide.' }],
      },
    });
  });

  it('parcourt toutes les pages d’une collection, à la taille maximale de page', async () => {
    const page = (items: string[], hasNext: boolean, n: number) =>
      json({ success: true, data: { items, total: 3, page: n, limit: 100, hasNext } });
    fetchMock.mockResolvedValueOnce(page(['a', 'b'], true, 1)).mockResolvedValueOnce(page(['c'], false, 2));
    expect(await getAll('/products', {}, (raw) => String(raw))).toEqual(['a', 'b', 'c']);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://api.test/api/v1/products?page=1&limit=100',
      'http://api.test/api/v1/products?page=2&limit=100',
    ]);
  });

  it('signale une coupure réseau comme erreur de connexion', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(backend.post('/products', {})).rejects.toMatchObject({ status: 0 });
  });

  it('renouvelle la session une fois sur un refus 401, puis rejoue la requête', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: false, message: 'Connectez-vous.', code: 'UNAUTHORIZED' }, 401))
      .mockResolvedValueOnce(json({ success: true, data: { id: 'c1' } }))
      .mockResolvedValueOnce(json({ success: true, data: ['p1'] }));
    expect(await backend.get('/me/addresses')).toEqual(['p1']);
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'GET http://api.test/api/v1/me/addresses',
      'POST http://api.test/api/v1/auth/sessions/refresh',
      'GET http://api.test/api/v1/me/addresses',
    ]);
  });

  it('renvoie le refus initial si le renouvellement échoue, sans boucle', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ success: false, message: 'Connectez-vous.' }, 401))
      .mockResolvedValueOnce(json({ success: false, message: 'Session expirée.', code: 'SESSION_EXPIRED' }, 401));
    await expect(backend.get('/me/addresses')).rejects.toMatchObject({ status: 401, message: 'Connectez-vous.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ne renouvelle pas la session sur les routes d’authentification', async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: 'Identifiant ou mot de passe incorrect.' }, 401));
    await expect(backend.post('/auth/sessions', { identifier: 'a@b.ga', password: 'x' })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('partage un seul renouvellement entre requêtes refusées en même temps', async () => {
    const refused = () => json({ success: false, message: 'Connectez-vous.' }, 401);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith('/auth/sessions/refresh')
          ? json({ success: true, data: null })
          : fetchMock.mock.calls.filter(([u]) => u === url).length === 1
            ? refused()
            : json({ success: true, data: url }),
      ),
    );
    await Promise.all([backend.get('/me/addresses'), backend.get('/me')]);
    const refreshes = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/sessions/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('expose les erreurs par champ renvoyées par l’API', () => {
    const error = new ApiError('Certaines données sont invalides.', 400, {
      code: 'VALIDATION_ERROR',
      requestId: null,
      errors: [
        { field: 'phone', message: 'Saisissez un numéro gabonais valide.' },
        { field: 'phone', message: 'second message ignoré' },
      ],
    });
    expect(apiFieldErrors(error)).toEqual({ phone: 'Saisissez un numéro gabonais valide.' });
    expect(apiFieldErrors(new Error('autre'))).toEqual({});
  });
});
