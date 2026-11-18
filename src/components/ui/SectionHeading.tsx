import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  title: string;
  link?: { to: string; label: string };
  children?: ReactNode;
}

export function SectionHeading({ title, link, children }: Props) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl">{title}</h2>
      </div>
      {children}
      {link && (
        <Link to={link.to} className="text-sm font-semibold text-forest hover:text-forest-dark hover:underline">
          {link.label}
        </Link>
      )}
    </div>
  );
}
