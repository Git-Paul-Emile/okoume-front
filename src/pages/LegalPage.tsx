import { NavLink, useParams } from 'react-router';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { cn } from '@/utils/text';
import { PageLoader } from '@/components/feedback/PageLoader';
import { useLegalDocs } from '@/features/legal/legal.queries';
import { formatDate } from '@/utils/formatDate';
import NotFoundPage from './NotFoundPage';

export default function LegalPage() {
  const { page = '' } = useParams();
  const { docs, isLoading } = useLegalDocs();
  const doc = docs[page];
  if (isLoading) return <PageLoader />;
  if (!doc) return <NotFoundPage />;

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: doc.title }]} />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Informations légales" className="flex gap-2 overflow-x-auto lg:flex-col">
          {Object.entries(docs).map(([key, d]) => (
            <NavLink
              key={key}
              to={`/legal/${key}`}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-md px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-forest text-white' : 'hover:bg-sage',
                )
              }
            >
              {d.title}
            </NavLink>
          ))}
        </nav>
        <article className="card p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl">{doc.title}</h1>
          <p className="mt-2 rounded-md bg-ivory p-3 text-xs text-ink-muted">
            {doc.updatedAt
              ? `Mis à jour le ${formatDate(doc.updatedAt)}.`
              : 'Document modèle, à valider par un professionnel du droit avant la mise en ligne.'}
          </p>
          <div className="prose-shop mt-6 max-w-3xl">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
