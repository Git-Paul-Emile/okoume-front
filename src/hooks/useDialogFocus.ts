import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Fenêtres ouvertes, de la plus ancienne à la plus récente : seule la dernière réagit au clavier. */
const stack: object[] = [];

/**
 * Comportement clavier d'une fenêtre modale (RGAA, WCAG 2.1.2 et 2.4.3) : focus placé dans la fenêtre
 * à l'ouverture, Tab qui reste à l'intérieur, Échap qui ne ferme que la fenêtre du dessus,
 * puis retour du focus sur l'élément qui l'avait ouverte.
 */
export function useDialogFocus(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  /** `field` : premier champ du formulaire s'il y en a un ; sinon la fenêtre elle-même. */
  initial: 'field' | 'container' = 'field',
) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);

    // Le contenu est animé : on attend qu'il soit monté pour placer le focus
    const frame = requestAnimationFrame(() => {
      if (ref.current?.contains(document.activeElement)) return;
      // Jamais sur un bouton d'action : une touche Entrée ne doit rien valider par surprise
      const field = initial === 'field' ? focusables().find((el) => el.matches('input, select, textarea')) : undefined;
      (field ?? ref.current)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (stack.at(-1) !== token) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = ref.current?.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, [open, ref, initial]);
}
