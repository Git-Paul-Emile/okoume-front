import type { Id } from '@/api/types';
import type { Category, CategoryNode } from './categories.types';

export const isCollection = (c: Category) => !!c.members?.length;

/** Arborescence des menus, sur autant de niveaux que nécessaire ; les collections n'y figurent pas. */
export function buildTree(categories: Category[], parentId: Id | null = null): CategoryNode[] {
  return categories
    .filter((c) => (c.parentId ?? null) === parentId && !isCollection(c))
    .map((c) => ({ ...c, children: buildTree(categories, c.id) }));
}

/** La catégorie et tous ses parents, du plus proche au plus lointain. */
export function ancestors(id: Id, byId: Map<Id, Category>) {
  const chain: Category[] = [];
  let current = byId.get(id);
  while (current && chain.length < 10) {
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/** Vrai si un produit appartient à la catégorie (directement, via un parent, ou via une collection). */
export function inCategory(productCategoryId: Id, categoryId: Id, byId: Map<Id, Category>) {
  const target = byId.get(categoryId);
  const wanted = target && isCollection(target) ? target.members! : [categoryId];
  const chain = ancestors(productCategoryId, byId).map((c) => c.id);
  return wanted.some((w) => chain.includes(w));
}

/** Ronds de « Acheter par catégorie » : sous-catégories de premier niveau et collections, avec visuel. */
export function shopCategories(categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories.filter((c) => c.image && (isCollection(c) || (c.parentId && !byId.get(c.parentId)?.parentId)));
}
