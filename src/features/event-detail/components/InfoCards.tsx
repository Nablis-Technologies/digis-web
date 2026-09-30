import React from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { type GlassReflectionSettings } from '@/lib/ui/glass';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export type InfoItem = { icon: React.ReactNode; label: string; value: string; onClick?: () => void };

function boostSaturation([r, g, b]: [number, number, number], factor = 1.25): [number, number, number] {
  const avg = (r + g + b) / 3;
  const sat = (c: number) => Math.max(0, Math.min(255, Math.round(avg + (c - avg) * factor)));
  return [sat(r), sat(g), sat(b)];
}

export function InfoStrip({ items, rgb, reflectionSettings }: {
  items: { icon: React.ReactNode; label: string; value: string }[];
  rgb?: [number, number, number] | null;
  reflectionSettings?: GlassReflectionSettings;
}) {
  const { isDark } = useTheme();
  const accent = rgb ? boostSaturation(rgb) : ([214, 249, 5] as [number, number, number]);
  const [r, g, b] = accent;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  const bg = isDark
    ? `linear-gradient(135deg, rgba(${r},${g},${b},0.10), rgba(${r},${g},${b},0.04))`
    : `linear-gradient(135deg, rgba(${r},${g},${b},${luminance > 0.75 ? 0.16 : 0.12}), rgba(${r},${g},${b},0.05))`;
  const dividerColor = isDark
    ? `rgba(${r},${g},${b},0.18)`
    : `rgba(${r},${g},${b},0.22)`;
  const iconColor = isDark
    ? (luminance < 0.35 ? `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})` : `rgba(${r},${g},${b},0.95)`)
    : (luminance > 0.6 ? '#0a0a0a' : `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})`);
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const valueColor = isDark ? '#fff' : '#0a0a0a';

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: bg, backdropFilter: 'blur(40px)' }}>
      <GlassReflection isDark={isDark} settings={reflectionSettings} />
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, rgba(${r},${g},${b},0.15), transparent 60%)` }} />
      {/* Mobile keeps the 2×2 grid; on desktop each cell takes only the width
          its content needs, spread across the full strip (justify-between) so
          the row still spans the whole width together. */}
      <div className="relative z-10 grid grid-cols-2 lg:flex lg:flex-nowrap lg:justify-between -ml-px -mt-px">
        {items.map((item) => (
          <div key={item.label}
            className="flex flex-col gap-2 px-4 py-4 min-w-0 lg:px-5"
            style={{ borderLeft: `1px solid ${dividerColor}`, borderTop: `1px solid ${dividerColor}` }}>
            <div className="flex items-center gap-1.5" style={{ color: iconColor }}>
              {item.icon}
              <span className="text-[9px] tracking-[1.2px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: labelColor, fontWeight: 600 }}>
                {item.label}
              </span>
            </div>
            <p className="text-[13px] font-light leading-snug"
              style={{ color: valueColor, fontFamily: "'Inter', sans-serif" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InfoCardsGrid({ items, rgb }: {
  items: InfoItem[];
  rgb?: [number, number, number] | null;
}) {
  const { isDark } = useTheme();
  const accent = rgb ? boostSaturation(rgb) : ([214, 249, 5] as [number, number, number]);
  const [r, g, b] = accent;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Darken light-mode poster colors so the card surface stays readable.
  // Bright/pale posters (luminance > 0.55) get pushed toward a deeper
  // shade for the card tint so it doesn't look washed out on white.
  const darken = (v: number, amt: number) => Math.round(v * (1 - amt));
  const lr = luminance > 0.55 ? darken(r, 0.45) : luminance > 0.35 ? darken(r, 0.2) : r;
  const lg = luminance > 0.55 ? darken(g, 0.45) : luminance > 0.35 ? darken(g, 0.2) : g;
  const lb = luminance > 0.55 ? darken(b, 0.45) : luminance > 0.35 ? darken(b, 0.2) : b;

  // Glassy in both modes so the blurred artwork backdrop stays visible behind
  // the cards (they float on the atmosphere rather than a solid block).
  const cardBg = isDark
  ? `linear-gradient(160deg, rgba(${r},${g},${b},0.12), rgba(${r},${g},${b},0.04)), rgba(20,20,22,0.30)`
  : `linear-gradient(160deg, rgba(${lr},${lg},${lb},0.14), rgba(${lr},${lg},${lb},0.05)), rgba(255,255,255,0.55)`;
  const iconColor = isDark
    ? (luminance < 0.35 ? `rgb(${Math.min(255, r + 90)},${Math.min(255, g + 90)},${Math.min(255, b + 90)})` : `rgba(${r},${g},${b},0.95)`)
    : `rgb(${lr},${lg},${lb})`;
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';
  const valueColor = isDark ? '#fff' : '#0a0a0a';

  // Two cards per row.
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <div className="relative z-10 -mt-10 flex flex-col gap-2.5">
      {rows.map((row, rowIndex) => (
        <InfoRow
          key={rowIndex}
          items={row}
          isDark={isDark}
          cardBg={cardBg}
          iconColor={iconColor}
          labelColor={labelColor}
          valueColor={valueColor}
        />
      ))}
    </div>
  );
}

/**
 * One row of the mobile info grid. Two discrete modes only, decided by the
 * measured intrinsic width of the values:
 *  - equal: both cards fit in half the row → they share it 50/50.
 *  - compact: a value needs more than half (e.g. a long venue name) → that card
 *    takes the space it needs and the other shrinks to its own content + padding.
 * A value still wider than its box is truncated on one line — never wrapped.
 */
function InfoRow({ items, isDark, cardBg, iconColor, labelColor, valueColor }: {
  items: InfoItem[];
  isDark: boolean;
  cardBg: string;
  iconColor: string;
  labelColor: string;
  valueColor: string;
}) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const measureRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const [mode, setMode] = React.useState<{ compact: boolean; widest: number }>({ compact: false, widest: 0 });
  // Stable dep so the inline `items` array identity doesn't re-run the effect.
  const valueKey = items.map((i) => i.value).join('\u0000');

  React.useLayoutEffect(() => {
    const measure = () => {
      const row = rowRef.current;
      if (!row) return;
      const half = (row.clientWidth - 10) / 2; // gap-2.5 = 10px
      const widths = measureRefs.current.map((el) => (el?.offsetWidth ?? 0) + 32); // px-4 both sides
      const widest = widths.reduce((m, w, i) => (w > widths[m] ? i : m), 0);
      const compact = widths[widest] > half;
      // Return the same reference when unchanged — avoids a render loop.
      setMode((prev) => (prev.compact === compact && prev.widest === widest ? prev : { compact, widest }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  return (
    <div ref={rowRef} className="relative flex gap-2.5">
      {items.map((item, idx) => (
        <div key={item.label}
          {...(item.onClick ? {
            role: 'button',
            tabIndex: 0,
            onClick: item.onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onClick?.(); }
            },
            'aria-label': `${item.label}: ${item.value}`,
          } : {})}
          className={`relative rounded-2xl px-4 py-3.5 overflow-hidden ${
            !mode.compact || idx === mode.widest ? 'flex-1 min-w-0' : 'flex-none'
          } ${item.onClick ? 'cursor-pointer' : ''}`}
          style={{
            background: cardBg,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10 flex items-center gap-2 mb-2.5" style={{ color: iconColor }}>
            {item.icon}
            <span className="text-[9px] tracking-[1.4px] uppercase truncate"
              style={{ fontFamily: "'Inter', sans-serif", color: labelColor, fontWeight: 600 }}>
              {item.label}
            </span>
          </div>
          <p className="relative z-10 text-[13.5px] font-light truncate"
            style={{ color: valueColor, fontFamily: "'Inter', sans-serif" }}>
            {item.value}
          </p>
        </div>
      ))}
      {/* Off-layout intrinsic-width measurers (same font as the value text). */}
      {items.map((item, idx) => (
        <span key={`measure-${item.label}`} aria-hidden="true"
          ref={(el) => { measureRefs.current[idx] = el; }}
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-[13.5px] font-light"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          {item.value}
        </span>
      ))}
    </div>
  );
}

function InfoCard({ icon, label, value, rgb }: { icon: React.ReactNode; label: string; value: string; rgb?: [number, number, number] | null }) {
  const { isDark } = useTheme();
  const accent = rgb ? boostSaturation(rgb) : ([214, 249, 5] as [number, number, number]);
  const [r, g, b] = accent;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  const bg = isDark
    ? `rgba(${r},${g},${b},0.14)`
    : `rgba(${r},${g},${b},${luminance > 0.75 ? 0.22 : 0.16})`;
  const iconColor = isDark
    ? (luminance < 0.35 ? `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})` : `rgba(${r},${g},${b},0.95)`)
    : (luminance > 0.6 ? '#0a0a0a' : `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})`);
  const labelColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const valueColor = isDark ? '#fff' : '#0a0a0a';

  return (
    <div className="relative rounded-2xl p-4 overflow-hidden"
      style={{ background: bg, backdropFilter: 'blur(30px)' }}>
      <GlassReflection isDark={isDark} />
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: `linear-gradient(165deg, rgba(${r},${g},${b},0.18) 0%, transparent 60%)` }} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2" style={{ color: iconColor }}>
          {icon}
          <span className="text-[10px] tracking-[0.5px]"
            style={{ fontFamily: "'Inter', sans-serif", color: labelColor }}>
            {label}
          </span>
        </div>
        <p className="text-[14px] font-light" style={{ color: valueColor }}>{value}</p>
      </div>
    </div>
  );
}
