import { clsx } from 'clsx';
import { useTheme } from '@/app/components/ThemeContext';

/**
 * Theme-aware skeleton tones. Kept in one place so every page-load skeleton
 * shares the exact same fill + hairline colors — the whole point is that the
 * loading state reads as a single, coherent system rather than a grab-bag of
 * hand-rolled greys. Values match the placeholder tint used across the app
 * (a faint navy in light mode, faint white in dark mode).
 */
export function useSkeletonTones() {
  const { isDark } = useTheme();
  return {
    shade: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,26,46,0.07)',
    // Slightly softer than the fill, for card outlines that mirror real borders.
    line: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,26,46,0.07)',
  };
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rounding utility — defaults to a pill so text-line skeletons look right. */
  rounded?: string;
}

/**
 * A single shimmering block. Sizing/layout comes entirely from `className` so
 * each page can compose these to trace its real layout. Never pass a background
 * color — the tone is centralized so all skeletons stay in sync.
 */
export function Skeleton({ className, rounded = 'rounded-full', style, ...rest }: SkeletonProps) {
  const { shade } = useSkeletonTones();
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse', rounded, className)}
      style={{ background: shade, ...style }}
      {...rest}
    />
  );
}

/**
 * Card-shaped skeleton: an outlined shell (mirrors real card borders) that
 * holds an image block and text lines. Used by feed/ticket grids.
 */
export function SkeletonCard({
  imageClassName,
  className,
  lines = [{ w: 'w-4/5' }, { w: 'w-2/5' }],
}: {
  imageClassName: string;
  className?: string;
  lines?: { w: string }[];
}) {
  const { line } = useSkeletonTones();
  return (
    <div className={clsx('overflow-hidden border', className)} style={{ borderColor: line }}>
      <Skeleton rounded="rounded-none" className={imageClassName} />
      <div className="space-y-3 p-4">
        {lines.map((l, i) => (
          <Skeleton key={i} className={clsx('h-3.5', l.w)} />
        ))}
      </div>
    </div>
  );
}
