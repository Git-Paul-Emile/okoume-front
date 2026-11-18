import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate } from '@/utils/formatDate';
import type { Article } from '../articles.types';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="aspect-[16/10] overflow-hidden bg-forest-50">
        <img
          src={article.cover}
          alt=""
          loading="lazy"
          className="size-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base leading-snug">
          <Link to={`/conseils/${article.slug}`} className="hover:text-forest">
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{article.excerpt}</p>
        <p className="mt-auto flex items-center gap-3 pt-4 text-xs text-ink-muted">
          <span>{formatDate(article.publishedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {article.readingTime} min
          </span>
        </p>
      </div>
    </article>
  );
}
