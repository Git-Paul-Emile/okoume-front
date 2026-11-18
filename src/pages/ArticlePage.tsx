import { motion, useScroll, useSpring } from 'motion/react';
import { Clock } from 'lucide-react';
import { useEffect } from 'react';
import { useParams } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageLoader } from '@/components/feedback/PageLoader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { useArticle } from '@/features/articles/articles.queries';
import { formatDate } from '@/utils/formatDate';
import { whatsappShareLink } from '@/utils/whatsapp';

export default function ArticlePage() {
  const { slug = '' } = useParams();
  const { data: article, isLoading } = useArticle(slug);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  useEffect(() => {
    if (!article) return;
    document.title = article.seo?.title || `Conseils : ${article.title}`;
    // Description pour les moteurs de recherche (3.6)
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = article.seo?.description || article.excerpt;
  }, [article]);

  if (isLoading) return <PageLoader />;
  if (!article)
    return (
      <EmptyState
        icon={<Clock className="size-7" />}
        level="h1"
        title="Article introuvable"
        action={<ButtonLink to="/conseils">Tous les conseils</ButtonLink>}
      />
    );

  return (
    <>
      {/* Barre de progression de lecture */}
      <motion.div
        className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-mure"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
      <article className="container-page py-6 lg:py-8">
        <Breadcrumbs
          items={[{ label: 'Accueil', to: '/' }, { label: 'Conseils', to: '/conseils' }, { label: article.title }]}
        />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl leading-tight sm:text-4xl">{article.title}</h1>
          <p className="mt-3 flex items-center gap-3 text-sm text-ink-muted">
            {article.category} · {formatDate(article.publishedAt)} · <Clock className="size-4" /> {article.readingTime}{' '}
            min de lecture
          </p>
          <div className="mt-6 aspect-[16/8] overflow-hidden rounded-xl bg-forest-50">
            <img src={article.cover} alt="" className="size-full object-contain p-8" />
          </div>
          <div className="prose-shop mt-8 text-[17px]">
            {article.content.map((b, i) => (b.type === 'h2' ? <h2 key={i}>{b.text}</h2> : <p key={i}>{b.text}</p>))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3 border-t border-sage pt-6">
            <a
              href={whatsappShareLink(`${article.title} : ${window.location.href}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-md bg-[#1f7a4a] px-5 font-semibold text-white hover:bg-[#186139]"
            >
              Partager sur WhatsApp
            </a>
            <ButtonLink to="/catalogue" variant="outline">
              Voir le catalogue
            </ButtonLink>
          </div>
        </div>
      </article>
    </>
  );
}
