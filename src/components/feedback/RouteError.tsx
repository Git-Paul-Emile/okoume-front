import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { useEffect } from 'react';
import { reportError } from '@/lib/errorReporting';
import { ErrorState } from './ErrorState';

export function RouteError() {
  const error = useRouteError();
  // Une page introuvable n'est pas une panne ; toute autre erreur d'affichage est remontée
  useEffect(() => {
    if (!isRouteErrorResponse(error)) reportError(error);
  }, [error]);
  const title = isRouteErrorResponse(error) && error.status === 404 ? 'Page introuvable' : 'Une erreur est survenue';
  return (
    <div className="container-page py-16">
      <ErrorState title={title} error={isRouteErrorResponse(error) ? undefined : error}>
        <ButtonLink to="/" className="mt-5">
          Retour à l’accueil
        </ButtonLink>
      </ErrorState>
    </div>
  );
}
