import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Niveau du titre, selon la page qui l'accueille (h1 quand il remplace tout le contenu). */
  level?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({ icon, title, description, action, level: Heading = 'h2' }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid place-items-center text-forest [&_svg]:size-10">{icon}</span>
      <Heading className="text-lg">{title}</Heading>
      {description && <p className="mt-1.5 max-w-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
