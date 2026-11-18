import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/api/ApiError';
import { Button } from '@/components/ui/Button';

interface Props {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function ErrorState({ error, title = 'Impossible d’afficher ce contenu', onRetry, children }: Props) {
  return (
    <div className="card mx-auto my-8 max-w-lg p-8 text-center" role="alert">
      <span className="mx-auto mb-3 grid place-items-center text-mure">
        <AlertTriangle className="size-6" />
      </span>
      <h2 className="text-lg">{title}</h2>
      {error !== undefined && <p className="mt-2 text-ink-soft">{getErrorMessage(error)}</p>}
      {children}
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
