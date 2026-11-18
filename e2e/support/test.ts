import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/** Refus de la politique de sécurité du contenu, signalés par le navigateur dans la console */
function watchCsp(context: BrowserContext, violations: string[]) {
  context.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
}

/**
 * `test` des parcours : chaque navigateur ouvert (client et équipe) est surveillé, et un parcours échoue si la
 * CSP a bloqué quoi que ce soit. `staffPage` ouvre une session séparée pour l'équipe.
 */
export const test = base.extend<{ cspViolations: string[]; staffPage: Page }>({
  cspViolations: [
    async ({ context }, provide) => {
      const violations: string[] = [];
      watchCsp(context, violations);
      await provide(violations);
      expect(violations, 'refus de la CSP').toEqual([]);
    },
    { auto: true },
  ],
  staffPage: async ({ browser, cspViolations }, provide) => {
    const context = await browser.newContext();
    watchCsp(context, cspViolations);
    await provide(await context.newPage());
    await context.close();
  },
});

export { expect };
