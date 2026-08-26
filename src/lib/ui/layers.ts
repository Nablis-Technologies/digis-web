/**
 * The app's stacking order, in one place.
 *
 * Z-indices had grown ad hoc — page chrome sat at 60 while some sheets sat at
 * 50, so the floating bell/avatar and bottom nav punched through modals and the
 * full-screen QR view. These are the only tiers anything should use; the numbers
 * are spaced so a tier can grow without colliding with the next one.
 *
 * Tailwind can't read runtime values, so class names carry the same numbers —
 * `z-[100]` for an overlay, and so on. Keep them in sync with this table.
 */
export const LAYER = {
  /** In-card decoration, gradients, badges over artwork. */
  raised: 10,
  /** Sticky section headers, carousel drag layers, hero controls. */
  sticky: 20,
  /** Page-level docked bars (purchase bar, in-page search results). */
  docked: 25,
  /** App chrome: top bar, mobile bell/avatar, bottom navigation. */
  chrome: 30,
  /** Menus anchored to chrome — notifications, profile, location. */
  chromeMenu: 45,
  /** Full-screen modals and bottom sheets. */
  overlay: 100,
  /** A sheet opened from inside an overlay (add extras, edit answers). */
  nestedOverlay: 120,
  /** Confirmations stacked on a nested sheet. */
  nestedConfirm: 130,
  /** Full-screen media viewers (the scannable QR). */
  viewer: 140,
  /** Transient success/celebration overlays. */
  celebration: 200,
  /** Auth gate — always the last word. */
  auth: 300,
  /** Popovers inside the auth gate. */
  authMenu: 310,
} as const;
