/**
 * Decide whether a popup menu anchored to `button` should open upward instead
 * of downward, so it stays fully visible.
 *
 * Considers the nearest clipping (overflow) ancestor as well as the viewport,
 * so it works both for menus inside a plain card (bounded by the viewport) and
 * menus inside a scroll/rounded `overflow-hidden` container (bounded by it).
 *
 * Browser-only (reads layout + computed styles); call from an event handler.
 */
export function shouldOpenMenuUp(button: HTMLElement, menuHeight = 200): boolean {
  const rect = button.getBoundingClientRect();

  // The menu must fit between the top and bottom edges that would clip it:
  // the viewport, narrowed by the nearest ancestor that hides overflow.
  let boundaryTop = 0;
  let boundaryBottom = window.innerHeight;
  for (let el: HTMLElement | null = button.parentElement; el; el = el.parentElement) {
    if (getComputedStyle(el).overflowY !== 'visible') {
      const r = el.getBoundingClientRect();
      boundaryTop = Math.max(boundaryTop, r.top);
      boundaryBottom = Math.min(boundaryBottom, r.bottom);
      break; // the nearest clipping ancestor is the one that bounds us
    }
  }

  const spaceBelow = boundaryBottom - rect.bottom;
  const spaceAbove = rect.top - boundaryTop;
  return spaceBelow < menuHeight && spaceAbove > spaceBelow;
}
