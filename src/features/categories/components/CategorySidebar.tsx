import { Link } from 'react-router';
import { useCategories } from '../categories.queries';
import { CategoryIcon } from './CategoryIcon';

export function CategorySidebar() {
  const { data, isLoading } = useCategories();
  return (
    <nav className="card hidden overflow-hidden lg:block" aria-label="Catégories">
      <ul className="py-2">
        {isLoading && Array.from({ length: 7 }, (_, i) => <li key={i} className="skeleton mx-4 my-3 h-5" />)}
        {data?.tree.map((c) => (
          <li key={c.id}>
            <Link
              to={`/catalogue?categorie=${c.id}`}
              className="group flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-forest-50 hover:text-forest"
            >
              <CategoryIcon name={c.icon} />
              <span className="flex-1">{c.name}</span>
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-sage">
          <Link
            to="/catalogue"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-forest hover:bg-forest-50"
          >
            <CategoryIcon />
            Tout le catalogue
          </Link>
        </li>
      </ul>
    </nav>
  );
}
