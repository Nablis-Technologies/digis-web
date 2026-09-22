import React from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { type GlassReflectionSettings } from '@/lib/ui/glass';
import { GlassReflection } from '@/components/primitives/GlassReflection';

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
  items: { icon: React.ReactNode; label: string; value: string }[];
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

  return (
    <div className="relative z-10 -mt-10 grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div key={item.label}
          className="relative rounded-2xl px-4 py-3.5 overflow-hidden"
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
          <p className="relative z-10 text-[13.5px] font-light leading-snug break-words"
            style={{ color: valueColor, fontFamily: "'Inter', sans-serif" }}>
            {item.value}
          </p>
        </div>
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
