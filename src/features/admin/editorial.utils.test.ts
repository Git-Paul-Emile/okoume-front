import { blocksToText, readingTime, sectionsToText, textToBlocks, textToSections } from './editorial.utils';

describe('contenus éditoriaux', () => {
  const text =
    'Introduction sur\ndeux lignes.\n\n## Étape 1\nPayez avec Airtel Money.\n\n## Étape 2\n\nAttendez la vérification.';

  it('découpe intertitres et paragraphes', () => {
    expect(textToBlocks(text)).toEqual([
      { type: 'p', text: 'Introduction sur deux lignes.' },
      { type: 'h2', text: 'Étape 1' },
      { type: 'p', text: 'Payez avec Airtel Money.' },
      { type: 'h2', text: 'Étape 2' },
      { type: 'p', text: 'Attendez la vérification.' },
    ]);
  });

  it('revient au texte d’origine (aller-retour stable)', () => {
    const blocks = textToBlocks(text);
    expect(textToBlocks(blocksToText(blocks))).toEqual(blocks);
  });

  it('regroupe les pages légales par section', () => {
    const sections = textToSections(text);
    expect(sections.map((s) => s.heading)).toEqual(['Préambule', 'Étape 1', 'Étape 2']);
    expect(textToSections(sectionsToText(sections))).toEqual(sections);
  });

  it('estime le temps de lecture', () => {
    expect(readingTime([{ type: 'p', text: 'mot '.repeat(600) }])).toBe(3);
    expect(readingTime([])).toBe(1);
  });
});
