/**
 * In an embedded (cross-origin) preview, Firefox can hand out events whose `target`/`relatedTarget`
 * belongs to the parent frame — e.g. moving the pointer or focus out of the iframe. React's root
 * listener then reads `__reactFiber$…` on that foreign object and throws "Permission denied".
 * A window-level capture listener runs before React's root listener and drops those events.
 */
const EVENTS = ['mouseover', 'mouseout', 'pointerover', 'pointerout', 'focusin', 'focusout', 'dragenter', 'dragleave'] as const;

function readable(node: EventTarget | null): boolean {
  if (!node) return true;
  try {
    // Any property read on a cross-origin object throws.
    void (node as Node).nodeType;
    return true;
  } catch {
    return false;
  }
}

let installed = false;
export function installCrossOriginEventGuard() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const guard = (e: Event) => {
    const related = (e as MouseEvent | FocusEvent).relatedTarget ?? null;
    if (!readable(e.target) || !readable(related)) e.stopImmediatePropagation();
  };
  for (const type of EVENTS) window.addEventListener(type, guard, true);
}
