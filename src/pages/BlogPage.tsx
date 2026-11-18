import { useState } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Tabs } from '@/components/ui/Tabs';
import { useArticles } from '@/features/articles/articles.queries';
import { ArticleCard } from '@/features/articles/components/ArticleCard';

export default function BlogPage() {
  const { data: articles, isLoading, error, refetch } = useArticles();
  const [category, setCategory] = useState('all');
  const categories = [...new Set((articles ?? []).map((a) => a.category))];
  const list = (articles ?? []).filter((a) => category === 'all' || a.category === category);

  return (
    <div className="container-page py-6 lg:py-8">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Conseils' }]} />
      <h1 className="text-2xl sm:text-3xl">Conseils et guides</h1>
      <p className="mt-1.5 text-ink-soft">
        Bien choisir, bien utiliser, et tout savoir sur la livraison et le paiement.
      </p>
      <div className="mt-6 mb-6 border-b border-sage">
        <Tabs
          label="Filtrer par thème"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'Tous' }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-80" />
          ))}
        </div>
      ) : (
        <RevealGroup key={category} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <RevealItem key={a.id}>
              <ArticleCard article={a} />
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
