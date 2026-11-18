import { ExternalLink, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { TextAreaField, TextField } from '@/components/ui/TextField';
import { ImageUpload } from '@/components/ui/Upload';
import { staffImageUploader } from '@/features/admin/adminCatalog.backend';
import { isScheduled, type Article } from '@/features/articles/articles.types';
import type { LegalPageRecord } from '@/features/legal/legal.api';
import { adminApi } from '@/features/admin/admin.api';
import { useAdminArticles, useAdminLegalPages, useAdminMutation } from '@/features/admin/admin.queries';
import { AdminTable, type Column } from '@/features/admin/components/AdminTable';
import { StateBadge } from '@/features/admin/components/StatusBadges';
import { PageIntro, Segmented, Toolbar } from '@/features/admin/components/Toolbar';
import {
  blocksToText,
  readingTime,
  sectionsToText,
  textToBlocks,
  textToSections,
} from '@/features/admin/editorial.utils';
import { legalDocs } from '@/pages/legalContent';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { normalizeText } from '@/utils/text';

type Tab = 'articles' | 'legal';
const FORMAT_HINT = 'Une ligne vide entre deux paragraphes ; « ## Titre » pour un intertitre.';

/** Contenus éditoriaux : conseils et guides d'achat (3.6) et pages légales (25.3). */
export default function AdminEditorialPage() {
  const { data: articles, isLoading } = useAdminArticles();
  const { data: legalPages = [] } = useAdminLegalPages();
  const [tab, setTab] = useState<Tab>('articles');
  const [article, setArticle] = useState<Article | 'new' | null>(null);
  const [legal, setLegal] = useState<string | null>(null);
  const publish = useAdminMutation(
    (a: Article) => adminApi.saveArticle({ ...a, status: a.status === 'published' ? 'draft' : 'published' }),
    (a) => (a.status === 'published' ? `Article dépublié : ${a.title}` : `Article publié : ${a.title}`),
  );

  if (isLoading || !articles) return <PageLoader />;

  const edited = new Map(legalPages.map((p) => [p.id, p]));
  const legalRows = Object.entries(legalDocs).map(([id, doc]) => ({ id, ...doc, ...edited.get(id) }));

  const articleColumns: Column<Article>[] = [
    {
      key: 'title',
      header: 'Article',
      cell: (a) => (
        <span className="flex items-center gap-3">
          {a.cover && (
            <img src={a.cover} alt="" className="h-11 w-16 shrink-0 rounded-md border border-sage object-cover" />
          )}
          <span className="min-w-0">
            <span className="block max-w-md truncate font-semibold">{a.title}</span>
            <span className="block text-xs text-ink-muted">
              {a.category} · {a.readingTime} min de lecture
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (a) =>
        isScheduled(a) ? (
          <span className="font-semibold text-warning">Programmé le {formatDateTime(a.publishedAt)}</span>
        ) : (
          formatDate(a.publishedAt)
        ),
    },
    {
      key: 'status',
      header: 'En ligne',
      align: 'center',
      cell: (a) => (
        <Switch checked={a.status === 'published'} onChange={() => publish.mutate(a)} label={`Publier ${a.title}`} />
      ),
    },
  ];

  const legalColumns: Column<(typeof legalRows)[number]>[] = [
    { key: 'title', header: 'Page', cell: (p) => <span className="font-semibold">{p.title}</span> },
    { key: 'sections', header: 'Sections', align: 'right', cell: (p) => p.sections.length },
    {
      key: 'state',
      header: 'Version',
      cell: (p) =>
        'updatedAt' in p && p.updatedAt ? (
          <span>Modifiée le {formatDate(p.updatedAt)}</span>
        ) : (
          <StateBadge tone="warning">Texte modèle à faire valider</StateBadge>
        ),
    },
    {
      key: 'view',
      header: 'Voir',
      align: 'right',
      cell: (p) => (
        <Link
          to={`/legal/${p.id}`}
          target="_blank"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
          aria-label={`Voir ${p.title} dans la boutique`}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageIntro
        actions={
          tab === 'articles' && (
            <Button icon={<Plus className="size-4" />} onClick={() => setArticle('new')}>
              Nouvel article
            </Button>
          )
        }
      >
        Les conseils aident à choisir et à payer ; les pages légales doivent être relues par un juriste avant la mise en
        ligne.
      </PageIntro>
      <Toolbar>
        <Segmented
          label="Contenu"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'articles', label: 'Conseils et guides', count: articles.length },
            { value: 'legal', label: 'Pages légales', count: legalRows.length },
          ]}
        />
      </Toolbar>
      {tab === 'articles' ? (
        <AdminTable
          caption="Articles"
          columns={articleColumns}
          rows={articles}
          rowKey={(a) => a.id}
          onRowClick={setArticle}
        />
      ) : (
        <AdminTable
          caption="Pages légales"
          columns={legalColumns}
          rows={legalRows}
          rowKey={(p) => p.id}
          onRowClick={(p) => setLegal(p.id)}
        />
      )}
      {article && (
        <ArticleDialog
          article={article === 'new' ? null : article}
          articles={articles}
          onClose={() => setArticle(null)}
        />
      )}
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

function ArticleDialog({
  article,
  articles,
  onClose,
}: {
  article: Article | null;
  articles: Article[];
  onClose: () => void;
}) {
  const [v, setV] = useState({
    title: article?.title ?? '',
    category: article?.category ?? 'Guide d’achat',
    excerpt: article?.excerpt ?? '',
    cover: article?.cover ?? null,
    content: article ? blocksToText(article.content) : '',
    seoTitle: article?.seo?.title ?? '',
    seoDescription: article?.seo?.description ?? '',
    // Vide : publication immédiate ; date future : publication programmée
    publishAt: article && isScheduled(article) ? toLocalInput(article.publishedAt) : '',
  });
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const save = useAdminMutation(
    (a: Article) => adminApi.saveArticle(a),
    (a) => `Article enregistré : ${a.title}`,
  );

  const submit = (publish: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    const content = textToBlocks(v.content);
    if (v.title.trim().length < 5) return setError('Saisissez un titre.');
    if (v.excerpt.trim().length < 20) return setError('Le résumé doit faire au moins 20 caractères.');
    if (!v.cover) return setError('Ajoutez une image de couverture.');
    if (content.length < 2) return setError('Rédigez au moins deux paragraphes.');
    if (v.seoTitle.length > 70) return setError('Titre SEO : 70 caractères au maximum.');
    if (v.seoDescription.length > 160) return setError('Description SEO : 160 caractères au maximum.');
    const scheduled = v.publishAt ? new Date(v.publishAt) : null;
    if (scheduled && publish && scheduled.getTime() <= Date.now())
      return setError('La date de publication programmée doit être dans le futur.');
    const base = normalizeText(v.title).replace(/ /g, '-');
    let slug = article?.slug ?? base;
    for (let i = 2; !article && articles.some((a) => a.slug === slug); i++) slug = `${base}-${i}`;
    save.mutate(
      {
        id: article?.id ?? '',
        slug,
        title: v.title.trim(),
        category: v.category.trim() || 'Conseils',
        excerpt: v.excerpt.trim(),
        cover: v.cover,
        content,
        readingTime: readingTime(content),
        publishedAt: scheduled
          ? scheduled.toISOString()
          : article && !isScheduled(article)
            ? article.publishedAt
            : new Date().toISOString(),
        status: publish ? 'published' : 'draft',
        seo:
          v.seoTitle.trim() || v.seoDescription.trim()
            ? { title: v.seoTitle.trim(), description: v.seoDescription.trim() }
            : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open onClose={onClose} title={article ? 'Modifier l’article' : 'Nouvel article'} className="max-w-3xl">
      <form onSubmit={submit(true)} noValidate>
        <div className="max-h-[66vh] space-y-4 overflow-y-auto pr-1">
          <TextField label="Titre" value={v.title} onChange={(e) => set({ title: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <TextAreaField
              label="Résumé"
              rows={3}
              value={v.excerpt}
              onChange={(e) => set({ excerpt: e.target.value })}
            />
            <TextField label="Rubrique" value={v.category} onChange={(e) => set({ category: e.target.value })} />
          </div>
          <ImageUpload
            label="Image de couverture"
            value={v.cover}
            onChange={(cover) => set({ cover })}
            aspect="aspect-[16/9] max-w-md"
            fit="cover"
            maxSize={1600}
            uploader={staffImageUploader('banners')}
          />
          <TextAreaField
            label="Contenu"
            rows={14}
            value={v.content}
            onChange={(e) => set({ content: e.target.value })}
            hint={FORMAT_HINT}
          />
          <fieldset className="space-y-3 rounded-lg border border-sage p-3">
            <legend className="px-1 text-sm font-semibold">Référencement (SEO)</legend>
            <TextField
              label="Titre pour les moteurs de recherche"
              optional
              value={v.seoTitle}
              onChange={(e) => set({ seoTitle: e.target.value })}
              hint={`${v.seoTitle.length}/70 caractères. À défaut, le titre de l’article.`}
            />
            <TextAreaField
              label="Description pour les moteurs de recherche"
              optional
              rows={2}
              value={v.seoDescription}
              onChange={(e) => set({ seoDescription: e.target.value })}
              hint={`${v.seoDescription.length}/160 caractères. À défaut, le résumé.`}
            />
          </fieldset>
          <TextField
            label="Publier le"
            type="datetime-local"
            optional
            value={v.publishAt}
            onChange={(e) => set({ publishAt: e.target.value })}
            hint="Laisser vide pour publier tout de suite. Une date future programme la publication."
          />
          {article?.history?.length ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Historique ({article.history.length})</h3>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
                {[...article.history].reverse().map((h, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-ivory px-3 py-2"
                  >
                    <span>
                      <span className="font-medium">{h.event}</span>{' '}
                      <span className="text-xs text-ink-muted">
                        {formatDateTime(h.at)} · {h.by} · version précédente : « {h.title} »
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text-sm font-semibold text-forest hover:underline"
                      onClick={() => set({ title: h.title, excerpt: h.excerpt, content: blocksToText(h.content) })}
                    >
                      Reprendre cette version
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        {error && (
          <p className="mt-4 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-sage pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="outline" loading={save.isPending} onClick={() => submit(false)()}>
            Enregistrer en brouillon
          </Button>
          <Button type="submit" loading={save.isPending}>
            {v.publishAt ? 'Programmer' : 'Publier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Date ISO vers la valeur d'un champ datetime-local (heure locale). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function LegalDialog({ id, current, onClose }: { id: string; current: LegalPageRecord; onClose: () => void }) {
  const [title, setTitle] = useState(current.title);
  const [text, setText] = useState(sectionsToText(current.sections));
  const [error, setError] = useState('');
  const save = useAdminMutation(
    (page: LegalPageRecord) => adminApi.saveLegalPage(page),
    (page) => `Page légale modifiée : ${page.title}`,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
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
      description="La nouvelle version remplace le texte modèle dans la boutique, avec sa date de mise à jour."
      className="max-w-3xl"
    >
      <form onSubmit={submit} noValidate>
        <div className="max-h-[66vh] space-y-4 overflow-y-auto pr-1">
          <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextAreaField
            label="Texte"
            rows={18}
            value={text}
            onChange={(e) => setText(e.target.value)}
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
