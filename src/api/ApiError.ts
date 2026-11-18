export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError)
      return 'Connexion au serveur impossible. Vérifiez votre connexion internet puis réessayez.';
    if (error.isNotFound) return 'L’élément demandé est introuvable.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
}
