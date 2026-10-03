import type { CSSProperties } from "react";

type GlassTint = "accent" | "danger";

export type GlassReflectionSettings = {
  hairlineOpacity?: number;
  hairlineAngle?: number;
  edgeOpacity?: number;
  edgeFade?: number;
  edgeAngle?: number;
  poolOpacity?: number;
  poolSize?: number;
  poolX?: number;
  poolY?: number;
  poolHeight?: number;
  washOpacity?: number;
  washAngle?: number;
};

export type GlassSurfaceSettings = GlassReflectionSettings & {
  shadowOpacity?: number;
  shadowY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
};

/** Approved Digis reflection balance, intentionally quiet on broad surfaces. */
export const defaultGlassReflection: Required<GlassReflectionSettings> = {
  hairlineOpacity: 0.05,
  hairlineAngle: 57,
  edgeOpacity: 0.02,
  edgeFade: 22,
  edgeAngle: 216,
  poolOpacity: 0.145,
  poolSize: 54,
  poolX: -20,
  poolY: -19,
  poolHeight: 50,
  washOpacity: 0.022,
  washAngle: 166,
};

export const defaultGlassSurface: Required<GlassSurfaceSettings> = {
  ...defaultGlassReflection,
  shadowOpacity: 0,
  shadowY: 0,
  shadowBlur: 12,
  shadowSpread: -60,
};

export function glass(isDark: boolean, tint?: GlassTint): CSSProperties {
  const base = isDark
    ? 'linear-gradient(177deg, rgba(255,255,255,.075), rgba(255,255,255,.02) 30%, rgba(255,255,255,0) 62%), #101115'
    : 'linear-gradient(177deg, rgba(255,255,255,.92), rgba(255,255,255,.6) 34%, rgba(255,255,255,.4) 100%)';
  const accent = isDark
    ? 'linear-gradient(177deg, rgba(214,249,5,.16), rgba(214,249,5,.04) 34%, rgba(255,255,255,0) 66%), #12140b'
    : 'linear-gradient(177deg, rgba(255,255,255,.95), rgba(214,249,5,.12) 60%, rgba(214,249,5,.1) 100%)';
  const danger = isDark
    ? 'linear-gradient(177deg, rgba(248,113,113,.14), rgba(248,113,113,.03) 34%, rgba(255,255,255,0) 66%), #16100f'
    : 'linear-gradient(177deg, rgba(255,255,255,.94), rgba(248,113,113,.1) 60%, rgba(248,113,113,.09) 100%)';
  return {
    background: tint === 'accent' ? accent : tint === 'danger' ? danger : base,
    boxShadow: isDark
      ? "0 14px 34px -24px rgba(0,0,0,.7)"
      : "0 14px 32px -26px rgba(23,22,28,.28)",
  };
}

/**
 * A non-invasive reflected-light layer. Render this on an absolutely positioned
 * child of a `relative overflow-hidden` surface. It only sits above the existing
 * surface; it never replaces its background, opacity, image, or backdrop blur.
 */
export function glassReflection(
  isDark: boolean,
  tint?: GlassTint,
  settings: GlassReflectionSettings = {},
): CSSProperties {
  const highlight = tint === "accent" ? (isDark ? "214,249,5" : "125,146,0") : tint === "danger" ? "248,113,113" : "255,255,255";
  const multiplier = isDark ? 1 : 2.2;
  const config = { ...defaultGlassReflection, ...settings };
  const edge = config.edgeOpacity * multiplier;
  const pool = config.poolOpacity * multiplier;
  const fade = config.edgeFade;
  const poolSize = config.poolSize;
  const poolX = config.poolX;
  const poolY = config.poolY;
  const poolHeight = config.poolHeight;
  const wash = config.washOpacity * multiplier;

  return {
    background: [
      `radial-gradient(${poolSize}% ${poolHeight}% at ${poolX}% ${poolY}%, rgba(${highlight},${pool}) 0%, rgba(${highlight},${pool * 0.34}) 30%, transparent 61%)`,
      `linear-gradient(${config.washAngle}deg, rgba(${highlight},${wash}) 0%, rgba(${highlight},${wash * 0.24}) 31%, transparent 61%)`,
      `linear-gradient(${config.edgeAngle}deg, rgba(255,255,255,${edge}) 0%, rgba(255,255,255,${edge * 0.26}) ${Math.max(4, fade * 0.4)}%, transparent ${fade}%)`,
    ].join(", "),
    borderRadius: "inherit",
  };
}

/**
 * A one-pixel reflected perimeter, with the brightness travelling around the
 * rounded edge. Render beside `glassReflection()` as its own absolute child;
 * the mask removes the centre, so it cannot tint the host surface.
 */
export function glassEdgeReflection(
  isDark: boolean,
  settings: GlassReflectionSettings = {},
): CSSProperties {
  const config = { ...defaultGlassReflection, ...settings };
  const opacity = config.hairlineOpacity * (isDark ? 1 : 1.8);
  const mask = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

  return {
    padding: "1px",
    background: `conic-gradient(from ${config.hairlineAngle}deg at 50% 50%, rgba(255,255,255,${opacity * 0.24}) 0deg, rgba(255,255,255,${opacity}) 50deg, rgba(255,255,255,${opacity * 0.34}) 132deg, rgba(255,255,255,${opacity * 0.08}) 230deg, rgba(255,255,255,${opacity * 0.24}) 360deg)`,
    borderRadius: "inherit",
    WebkitMask: mask,
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  };
}

/** Soft elevation, kept separate from reflection so it never changes a fill. */
export function glassShadow(isDark: boolean, settings: GlassSurfaceSettings = {}): CSSProperties {
  const config = { ...defaultGlassSurface, ...settings };
  return {
    boxShadow: `0 ${config.shadowY}px ${config.shadowBlur}px ${config.shadowSpread}px rgba(0,0,0,${isDark ? config.shadowOpacity : config.shadowOpacity * 0.62})`,
  };
}

/** Restrained top hairline for compact elements that cannot host an overlay. */
export function glassEdge(isDark: boolean): CSSProperties {
  const shadow = glassShadow(isDark).boxShadow;
  return { boxShadow: `inset 0 1px 0 rgba(255,255,255,${isDark ? 0.055 : 0.34}), ${shadow}` };
}

/**
 * The boundary for compact controls (inputs, icon tiles, small buttons, pills)
 * that are too small to host the reflection overlay: a glass fill composed with
 * the restrained inset top light. `border` is deliberately absent — the edge is
 * light, not a stroke (ADR-0007). Pass a tint for state (accent = selected,
 * danger = error/destructive).
 */
export function glassControl(isDark: boolean, tint?: GlassTint): CSSProperties {
  return { ...glass(isDark, tint), ...glassEdge(isDark) };
}

/**
 * The canonical input chrome — the FULL discovery-search setup, not just the
 * fill: translucent surface + 40px backdrop blur + a thin reflected hairline
 * (the same one-pixel conic edge `glassEdgeReflection()` paints) + the quiet
 * float shadow. Rendered on the host itself as a border-box gradient, so a
 * plain `AppInput` gets the whole look without an overlay child. State
 * (focus/error) recolours the hairline and adds a halo.
 *
 * The search bar keeps its separate `<GlassReflection>` overlay (it animates a
 * bloom too); this mirrors that chrome so every field matches it.
 */
export function glassField(isDark: boolean, opts: { error?: boolean; focused?: boolean } = {}): CSSProperties {
  const edge = glassEdgeReflection(isDark).background;
  const line = opts.error
    ? (isDark ? "rgba(248,113,113,0.75)" : "rgba(190,18,60,0.6)")
    : opts.focused
      ? (isDark ? "rgba(217,255,0,0.8)" : "rgba(124,154,0,0.9)")
      : null;
  const shadow = opts.error
    ? (isDark ? "0 0 0 3px rgba(248,113,113,0.14)" : "0 0 0 3px rgba(190,18,60,0.1)")
    : opts.focused
      ? (isDark ? "0 0 0 4px rgba(217,255,0,0.12)" : "0 0 0 4px rgba(214,249,5,0.14)")
      : null;
  return {
    background: isDark
      ? `linear-gradient(rgba(30,30,34,0.40), rgba(30,30,34,0.40)) padding-box, ${edge} border-box`
      : `linear-gradient(rgba(255,255,255,0.68), rgba(255,255,255,0.68)) padding-box, ${edge} border-box`,
    backgroundClip: "padding-box, border-box",
    border: "1px solid transparent",
    backdropFilter: "blur(40px) saturate(1.5)",
    WebkitBackdropFilter: "blur(40px) saturate(1.5)",
    boxShadow: [
      ...(shadow ? [shadow] : []),
      isDark ? "0 12px 36px -16px rgba(0,0,0,0.48)" : "0 12px 36px -18px rgba(20,18,40,0.18)",
    ].join(", "),
    ...(line ? { borderColor: line } : {}),
  };
}
