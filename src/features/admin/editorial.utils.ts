import type { ArticleBlock } from '@/features/articles/articles.types';
import type { LegalDoc } from '@/pages/legalContent';

/**
 * Format d'édition des contenus : « ## Titre » pour un intertitre, une ligne vide entre deux paragraphes.
 * Simple à saisir sans éditeur riche, et converti en blocs pour l'affichage.
 */
export function textToBlocks(text: string): ArticleBlock[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}|\n(?=## )|(?<=^## .*)\n/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith('## ')
        ? { type: 'h2' as const, text: chunk.slice(3).trim() }
        : { type: 'p' as const, text: chunk.replace(/\s*\n\s*/g, ' ') },
    );
}

export const blocksToText = (blocks: ArticleBlock[]) =>
  blocks.map((b) => (b.type === 'h2' ? `## ${b.text}` : b.text)).join('\n\n');

/** Temps de lecture estimé à 200 mots par minute, au moins 1 minute. */
export const readingTime = (blocks: ArticleBlock[]) =>
  Math.max(1, Math.round(blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0) / 200));

/** Page légale : chaque « ## » ouvre une section. */
export function textToSections(text: string): LegalDoc['sections'] {
  const sections: LegalDoc['sections'] = [];
  for (const b of textToBlocks(text)) {
    if (b.type === 'h2') sections.push({ heading: b.text, body: [] });
    else if (sections.length) sections[sections.length - 1].body.push(b.text);
    else sections.push({ heading: 'Préambule', body: [b.text] });
  }
  return sections;
}

export const sectionsToText = (sections: LegalDoc['sections']) =>
  sections.map((s) => [`## ${s.heading}`, ...s.body].join('\n\n')).join('\n\n');
