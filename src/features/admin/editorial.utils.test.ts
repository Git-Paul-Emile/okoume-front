import { sectionsToText, textToSections } from './editorial.utils';

describe('conversion des pages légales', () => {
  const text =
    'Introduction sur\ndeux lignes.\n\n## Étape 1\nPayez avec Airtel Money.\n\n## Étape 2\n\nAttendez la vérification.';

  it('regroupe les pages légales par section', () => {
    const sections = textToSections(text);
    expect(sections.map((s) => s.heading)).toEqual(['Préambule', 'Étape 1', 'Étape 2']);
    expect(textToSections(sectionsToText(sections))).toEqual(sections);
  });

});
