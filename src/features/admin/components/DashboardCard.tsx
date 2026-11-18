import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/utils/text';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Carte du tableau de bord : titre, courte explication, action éventuelle. Toutes les cartes d'une rangée ont la même hauteur. */
export function DashboardCard({ title, description, action, children, className, id }: Props) {
  return (
    <motion.section
      id={id}
      variants={fadeUp}
      aria-labelledby={`${id ?? title}-title`}
      className={cn('card flex h-full min-w-0 scroll-mt-24 flex-col p-5 sm:p-6', className)}
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id ?? title}-title`} className="text-base">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.section>
  );
}
