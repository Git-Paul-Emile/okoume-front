import type { Id } from '@/api/types';

export interface Category {
  id: Id;
  slug: string;
  name: string;
  /** Nom complet hors contexte (titre du catalogue), ex. « Tenues traditionnelles homme ». */
  fullName?: string;
  parentId: Id | null;
  icon?: string;
  image: string | null;
  /** « cover » pour une photo qui doit remplir le rond de « Acheter par catégorie ». */
  imageFit?: 'cover' | 'contain';
  /**
   * Collection transversale (ex. « Traditionnel ») : regroupe plusieurs catégories sans apparaître
   * dans l'arborescence des menus. Elle reste filtrable et visible dans « Acheter par catégorie ».
   */
  members?: Id[];
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
