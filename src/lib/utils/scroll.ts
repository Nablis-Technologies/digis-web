/**
 * Scroll helpers that never touch ancestor frames. `scrollIntoView` walks every scrollable
 * ancestor — including the embedding page — which throws cross-origin errors inside a preview frame.
 */

/** Scroll the window so `el` sits at the top (minus `offset`). */
export function scrollWindowTo(el: Element | null | undefined, offset = 0, behavior: ScrollBehavior = 'smooth') {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

/** Horizontally centre `el` inside its scroll container `list`. */
export function centerInScroller(list: HTMLElement | null | undefined, el: HTMLElement | null | undefined, behavior: ScrollBehavior = 'smooth') {
  if (!list || !el) return;
  const l = list.getBoundingClientRect(), r = el.getBoundingClientRect();
  list.scrollTo({ left: list.scrollLeft + (r.left - l.left) - (l.width - r.width) / 2, behavior });
}
