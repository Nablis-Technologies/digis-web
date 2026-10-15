import type { ArtworkPalette } from '@/lib/ui/artworkPalette';

/**
 * The artwork-driven environment behind a profile sheet (artist / organizer /
 * venue): a tinted base gradient, the artwork blurred and saturated behind the
 * header, and a radial colour glow. Ported from the web2 export, where the same
 * block was repeated inline at each of the three sheets' roots.
 *
 * Layering matches the export: this sits after `<GlassReflection>` and before the
 * content, so the edge reflection paints over the environment while the sheet's
 * `relative z-10` content stays on top. Decorative only — `aria-hidden`,
 * `pointer-events-none`, absolutely positioned so it never affects layout.
 *
 * The artwork layer renders only when there IS artwork: an entity with no image
 * keeps the brand-hue base rather than a placeholder (ADR-0002).
 */
export function SheetEnvironment({ palette, artwork, isDark }: {
  palette: ArtworkPalette;
  artwork?: string | null;
  isDark: boolean;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${palette.bg0} 0%, ${palette.bg1} 100%)`, transition: 'background 600ms ease' }} />
      {artwork && (
        <div className="absolute inset-x-0 top-0 h-[70%]"
          style={{
            backgroundImage: `url("${artwork}")`, backgroundSize: 'cover', backgroundPosition: 'center',
            transform: 'scale(1.4)', filter: 'blur(60px) saturate(1.6)', opacity: isDark ? 0.4 : 0.35,
          }} />
      )}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[120%] h-[420px] rounded-full"
        style={{ background: `radial-gradient(ellipse at center, ${palette.glow}, transparent 65%)`, transition: 'background 600ms ease' }} />
    </div>
  );
}
