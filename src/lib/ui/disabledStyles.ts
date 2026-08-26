/**
 * Shared "unavailable" styling.
 *
 * A disabled control should read as *present but inert* — not as a ghost. The
 * old pattern (faint surface + near-black label + `opacity: 0.5`) compounded
 * three dimmers on top of each other and left buttons all but invisible,
 * especially in light mode. Instead we keep full opacity and state the muted
 * surface and label colours outright, so the control still has a readable
 * shape and its text stays legible while clearly not inviting a tap.
 */

/** Surface + label for a disabled solid button. */
export function disabledSurface(isDark: boolean) {
  return {
    background: isDark ? 'rgba(255,255,255,0.085)' : 'rgba(20,18,40,0.08)',
    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(20,18,40,0.42)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,18,40,0.1)'}`,
  };
}

/**
 * Style for the brand-lime primary CTA in both states. Spread onto the button's
 * `style`; add typography/size separately.
 */
export function primaryButtonSurface(enabled: boolean, isDark: boolean) {
  if (!enabled) return { ...disabledSurface(isDark), cursor: 'not-allowed' as const };
  return {
    background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)',
    color: '#0a0a0a',
    border: '1px solid transparent',
    cursor: 'pointer' as const,
  };
}

/** Icon/text colour for a disabled ghost control (steppers, inline actions). */
export function disabledInk(isDark: boolean): string {
  return isDark ? 'rgba(255,255,255,0.32)' : 'rgba(20,18,40,0.3)';
}
