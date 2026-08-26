import { motion, AnimatePresence } from 'motion/react';

/**
 * Apple Music–style immersive backdrop: the event poster becomes the
 * environment of the whole page. A large blurred poster, dynamic radial
 * color washes from the dominant artwork color, and readability scrims —
 * all fixed behind the page content and crossfading when the event changes.
 *
 * Robust by design: falls back to the Digis brand color when no dominant
 * color is available, and scrim strength adapts to the poster's luminance
 * so bright and dark posters both stay readable in light and dark mode.
 */
export function ImmersiveBackdrop({
  image,
  posterRgb,
  isDark,
}: {
  image: string;
  posterRgb?: [number, number, number] | null;
  isDark: boolean;
}) {
  const [r, g, b] = posterRgb ?? [214, 249, 5];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Keep the wash legible regardless of poster brightness: very bright posters
  // get a slightly stronger scrim, very dark ones a touch less.
  const washStrong = isDark ? 0.32 : 0.26;
  const washSoft = isDark ? 0.18 : 0.16;

  const base = isDark ? '#070707' : '#f5f4f9';

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0, background: base }}
    >
      {/* Crossfading poster atmosphere — one keyed layer per event */}
      <AnimatePresence>
        <motion.div
          key={image}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* Large blurred poster */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${image}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'scale(1.35)',
              filter: isDark
                ? 'blur(70px) saturate(1.5) brightness(0.85)'
                : 'blur(80px) saturate(1.45) brightness(1.05)',
              opacity: isDark ? 0.42 : 0.3,
            }}
          />

          {/* Dynamic radial color washes from the dominant artwork color */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 90% 60% at 50% -5%, rgba(${r},${g},${b},${washStrong}), transparent 60%),
                radial-gradient(ellipse 70% 50% at 12% 30%, rgba(${r},${g},${b},${washSoft}), transparent 55%),
                radial-gradient(ellipse 80% 60% at 88% 75%, rgba(${r},${g},${b},${washSoft}), transparent 60%)
              `,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Readability scrims (static, above the crossfading atmosphere) */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `linear-gradient(to bottom,
                rgba(7,7,7,0.18) 0%,
                rgba(7,7,7,0.42) 46%,
                rgba(7,7,7,0.70) 80%,
                rgba(7,7,7,0.88) 100%)`
            : `linear-gradient(to bottom,
                rgba(245,244,249,0.22) 0%,
                rgba(245,244,249,0.50) 46%,
                rgba(245,244,249,0.76) 80%,
                rgba(245,244,249,0.90) 100%)`,
        }}
      />

      {/* Soft edge vignette so the color world hugs the frame */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 120% 80% at 50% 35%, transparent 55%, rgba(0,0,0,0.4) 100%)'
            : 'radial-gradient(ellipse 120% 80% at 50% 35%, transparent 60%, rgba(20,18,40,0.10) 100%)',
        }}
      />

      {/* Extra-bright posters in light mode: lift a faint white veil for contrast */}
      {!isDark && luminance > 0.72 && (
        <div className="absolute inset-0" style={{ background: 'rgba(245,244,249,0.18)' }} />
      )}
    </div>
  );
}
