import { ExternalLink } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import type { LegalPageRecord } from '@/features/legal/legal.api';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminLegalPages, useAdminMutation } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro } from '@/features/admin/components/Toolbar';
import { sectionsToText, textToSections } from '@/features/admin/editorial.utils';
import { legalDocs } from '@/pages/legalContent';
import { formatDate } from '@/utils/formatDate';

const FORMAT_HINT = 'Une ligne vide entre deux paragraphes ; « ## Titre » pour un intertitre.';

/** Gestion des pages légales de la boutique. */
export default function AdminEditorialPage() {
  const { data: legalPages = [], isLoading } = useAdminLegalPages();
  const [legal, setLegal] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;

  const edited = new Map(legalPages.map((page) => [page.id, page]));
  const rows = Object.entries(legalDocs).map(([id, doc]) => ({ id, ...doc, ...edited.get(id) }));
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'title', header: 'Page', cell: (page) => <span className="font-semibold">{page.title}</span> },
    { key: 'sections', header: 'Sections', align: 'right', cell: (page) => page.sections.length },
    {
      key: 'state',
      header: 'Version',
      cell: (page) =>
        'updatedAt' in page && page.updatedAt ? (
          <span>Modifiée le {formatDate(page.updatedAt)}</span>
        ) : (
          <StateBadge tone="warning">Texte modèle à faire valider</StateBadge>
        ),
    },
    {
      key: 'view',
      header: 'Voir',
      align: 'right',
      cell: (page) => (
        <Link
          to={`/legal/${page.id}`}
          target="_blank"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
          aria-label={`Voir ${page.title} dans la boutique`}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageIntro>Les pages légales restent accessibles depuis la boutique et peuvent être modifiées ici.</PageIntro>
      <AdminTable
        caption="Pages légales"
        columns={columns}
        rows={rows}
        rowKey={(page) => page.id}
        onRowClick={(page) => setLegal(page.id)}
      />
      {legal && (
        <LegalDialog
          id={legal}
          current={edited.get(legal) ?? { id: legal, updatedAt: '', ...legalDocs[legal] }}
          onClose={() => setLegal(null)}
        />
      )}
    </>
  );
}

function LegalDialog({ id, current, onClose }: { id: string; current: LegalPageRecord; onClose: () => void }) {
  const [title, setTitle] = useState(current.title);
  const [text, setText] = useState(sectionsToText(current.sections));
  const [error, setError] = useState('');
  const save = useAdminMutation(
    (page: LegalPageRecord) => adminApi.saveLegalPage(page),
    (page) => `Page légale modifiée : ${page.title}`,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sections = textToSections(text);
    if (title.trim().length < 3) return setError('Saisissez le titre de la page.');
    if (!sections.length) return setError('La page ne peut pas être vide.');
    save.mutate({ id, title: title.trim(), sections, updatedAt: new Date().toISOString() }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Modifier : ${current.title}`}
      description="La nouvelle version remplace le texte modèle dans la boutique."
      className="max-w-3xl"
    >
      <form onSubmit={submit} noValidate>
        <div className="max-h-[66vh] space-y-4 overflow-y-auto pr-1">
          <TextField label="Titre" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextAreaField
            label="Texte"
            rows={18}
            value={text}
            onChange={(event) => setText(event.target.value)}
            hint={FORMAT_HINT}
          />
        </div>
        {error && (
          <p className="mt-4 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2 border-t border-sage pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={save.isPending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
