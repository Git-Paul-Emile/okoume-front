import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Les pages sont chargées à la demande et Vitest les transforme au premier import : sur une machine
// chargée, cela dépasse la seconde d'attente par défaut des requêtes findBy et waitFor
configure({ asyncUtilTimeout: 10_000 });

// jsdom n'implémente pas le défilement
window.scrollTo = (() => undefined) as typeof window.scrollTo;
Element.prototype.scrollTo = (() => undefined) as typeof Element.prototype.scrollTo;
Element.prototype.scrollIntoView = () => undefined;

// React Router crée des Request avec le AbortSignal de jsdom, que le Request de Node refuse
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const { signal: _signal, ...rest } = init ?? {};
    void _signal;
    super(input, rest);
  }
} as typeof Request;
