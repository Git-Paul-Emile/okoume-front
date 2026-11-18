import type { Category } from '@/features/categories/categories.types';
import { analyzeImport, buildImportedProducts, IMPORT_TEMPLATE, parseCsv } from './catalogImport';

const categories = [
  { id: 'mode', slug: 'mode', name: 'Mode', parentId: null, image: null },
  { id: 'mode-homme', slug: 'mode-homme', name: 'Homme', parentId: 'mode', image: null },
  { id: 'tradi-homme', slug: 'tradi-homme', name: 'Tenues traditionnelles', parentId: 'mode-homme', image: null },
  { id: 'cuisine', slug: 'cuisine', name: 'Cuisine & électroménager', parentId: null, image: null },
] as Category[];
const products = [{ id: '86', sku: 'GA-1085', slug: 'chemise', name: 'Chemise' }];

describe('parseCsv', () => {
  it('lit le point-virgule, les guillemets et ignore les lignes vides', () => {
    const rows = parseCsv('﻿a;b\n"x;1";"dit ""bonjour"""\n\n2;3\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x;1', 'dit "bonjour"'],
      ['2', '3'],
    ]);
  });

  it('détecte la virgule comme séparateur', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('analyzeImport', () => {
  it('accepte le modèle fourni', () => {
    const { lines, headerError } = analyzeImport(parseCsv(IMPORT_TEMPLATE), products, categories);
    expect(headerError).toBeNull();
    expect(lines.every((l) => l.errors.length === 0)).toBe(true);
    expect(lines[2].categoryId).toBe('cuisine');
  });

  it('signale champs manquants, valeurs invalides et doublons sans rien accepter en silence', () => {
    const csv = [
      'reference;nom;categorie;prix;cout;stock',
      ';;tradi-homme;;;',
      'X1;Robe;Inconnue;abc;;',
      'GA-1085;Chemise;tradi-homme;10000;;2',
      'Y1;Pagne;tradi-homme;9000;9500;1',
      'Y2;Bol;cuisine;5000;;1',
      'Y2;Bol;cuisine;5000;;1',
    ].join('\n');
    const { lines } = analyzeImport(parseCsv(csv), products, categories);
    expect(lines[0].errors.map((e) => e.kind)).toEqual(['missing', 'missing']);
    expect(lines[1].errors.map((e) => e.kind)).toEqual(['invalid', 'invalid']);
    expect(lines[2].errors[0].kind).toBe('duplicate');
    expect(lines[3].errors[0].message).toMatch(/Coût/);
    expect(lines[4].errors).toEqual([]);
    expect(lines[5].errors[0].message).toMatch(/Doublon de la ligne 6/);
  });

  it('refuse un fichier sans les colonnes obligatoires', () => {
    expect(analyzeImport(parseCsv('nom;prix\nA;1'), products, categories).headerError).toMatch(/categorie/);
  });
});

describe('buildImportedProducts', () => {
  it('regroupe les variantes par référence et crée des brouillons', () => {
    const { lines } = analyzeImport(parseCsv(IMPORT_TEMPLATE), products, categories);
    const created = buildImportedProducts(lines, products, categories);
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({ sku: 'CHM-01', status: 'draft', rootCategoryId: 'mode' });
    expect(created[0].variants.map((v) => v.label)).toEqual(['M', 'L']);
    expect(created[1].images).toEqual(['https://exemple.ga/bol.jpg']);
    expect(created[1].id).not.toBe(created[0].id);
  });
});
