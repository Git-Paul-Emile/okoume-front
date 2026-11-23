import type { LegalDoc } from '@/pages/legalContent';

type TextBlock = { type: 'p' | 'h2'; text: string };

/** Convertit un texte simple en paragraphes et intertitres de page légale. */
function textToBlocks(text: string): TextBlock[] {
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

/** Page légale : chaque « ## » ouvre une section. */
export function textToSections(text: string): LegalDoc['sections'] {
  const sections: LegalDoc['sections'] = [];
  for (const block of textToBlocks(text)) {
    if (block.type === 'h2') sections.push({ heading: block.text, body: [] });
    else if (sections.length) sections[sections.length - 1]!.body.push(block.text);
    else sections.push({ heading: 'Préambule', body: [block.text] });
  }
  return sections;
}

export const sectionsToText = (sections: LegalDoc['sections']) =>
  sections.map((section) => [`## ${section.heading}`, ...section.body].join('\n\n')).join('\n\n');
