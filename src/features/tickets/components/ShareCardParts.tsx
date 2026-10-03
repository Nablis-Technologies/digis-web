import { motion } from 'motion/react';
import { Check, Crown, MapPin, Share2 } from 'lucide-react';
import { formatETB } from '@/lib/utils/format';
import type { ReactNode } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { getCategoryColor } from '@/lib/categoryColors';
import { glassEdge } from '@/lib/ui/glass';
import { AppButton } from '@/components/primitives/AppButton';

const BRAND = '#d6f905';

export type ShareCardEvent = { name: string; date: string; time?: string; venue: string; image: string; category?: string; price?: number; };

function parseEventDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function shortDate(dateStr: string): string {
  const d = parseEventDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

/** Auto-shrink the title as it gets longer so it never overflows the card. */
function eventTitleSize(name: string, base: number, mid: number, small: number) {
  const len = (name || '').length;
  if (len > 56) return small - 4;
  if (len > 42) return small;
  if (len > 28) return mid;
  return base;
}

const titleStyle = {
  fontFamily: "'Zalando Sans Expanded', sans-serif",
  wordBreak: 'break-word' as const,
  overflowWrap: 'anywhere' as const,
};

type CardProps = {
  event: ShareCardEvent;
  ticketType?: string;
  ticketLevel?: string;
  isVIP?: boolean;
  hued: string;        // "r,g,b" — image-extracted accent
  accentText: string;  // "r,g,b" — legibility-clamped accent for text on dark
  /** True only when the user owns the ticket; drives the status pill copy. */
  purchased?: boolean;
};


export function ShareIconButton({ icon, color }: { icon: React.ReactNode; color: string }) {
  const { isDark } = useTheme();
  return (
    <AppButton
      whileTap={{ scale: 0.9 }}
      className="w-[48px] h-[48px] rounded-xl flex items-center justify-center cursor-pointer"
      style={{ background: `${color}1f`, ...glassEdge(isDark), color }}
    >
      {icon}
    </AppButton>
  );
}

/* ── shared bits ─────────────────────────────────────────── */

/** Inline Digis mark — avoids CSS mask/image rendering as a filled box in the share export. */
export function DigisMark({ className = 'w-4 h-4', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      className={className}
      style={{ display: 'block', color }}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M481.88,355.78v142.38c-46.95-6.63-89.03-20.18-126.27-40.59-43.22-23.76-78.63-55.56-106.26-95.49-7.6-10.97-14.62-22.59-21.08-34.81-19.52-37.09-32.65-79-39.35-125.65h161.2c4.05,22.52,10.15,42.5,18.25,60.06,16.46,35.55,40.87,61.77,73.22,78.58,7.03,3.65,14.4,6.9,22.15,9.71,5.83,2.16,11.89,4.1,18.15,5.81Z" />
      <rect x="482.05" y="196.36" width="325.96" height="160.48" />
      <path d="M801.18,817.1h-161.33c-4.02-21.15-9.93-40.07-17.6-56.71-16.46-35.58-40.87-61.8-73.22-78.6-32.38-16.76-72.3-25.18-119.72-25.18h-81.21v-137.52h89.73c15.1,0,29.79.6,44.04,1.79,9.41.77,18.64,1.81,27.68,3.13,46.63,6.65,88.44,20.18,125.48,40.49,55.09,30.26,97.52,73.71,127.32,130.27,19.07,36.22,32,76.96,38.83,122.32Z" />
      <rect x="327.03" y="656.61" width="21.08" height=".02" />
      <rect x="187.65" y="656.64" width="160.46" height="160.46" />
    </svg>
  );
}

/** Brand logo (no square) + Digis wordmark. */
export function Wordmark({ textColor = 'rgba(255,255,255,0.95)', shadow = false }: { textColor?: string; shadow?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <DigisMark className="w-7 h-7 shrink-0" color={BRAND} />
      <span
        className="text-[12px] tracking-[3px] uppercase truncate"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: textColor, textShadow: shadow ? '0 1px 8px rgba(0,0,0,0.6)' : undefined }}
      >
        Digis
      </span>
    </div>
  );
}

export function tierTheme(ticketType?: string, ticketLevel?: string) {
  const source = `${ticketType || ''} ${ticketLevel || ''}`.toLowerCase();
  if (source.includes('early')) return { rgb: '52, 211, 153', color: '#34d399', ink: '#047857' };
  if (source.includes('couple')) return { rgb: '251, 113, 133', color: '#fb7185', ink: '#be123c' };
  if (source.includes('diamond') || source.includes('vvip') || source.includes('elite')) return { rgb: '196, 181, 253', color: '#c4b5fd', ink: '#6d28d9' };
  if (source.includes('vip') || source.includes('gold') || source.includes('premium')) return { rgb: '250, 200, 60', color: '#fac83c', ink: '#9a6a00' };
  return { rgb: '96, 165, 250', color: '#60a5fa', ink: '#1d4ed8' };
}

/** Subtle ticket-tier badge — no "tier" label text. */
export function TierBadge({ ticketType, isVIP, tier }: { ticketType?: string; isVIP?: boolean; tier: ReturnType<typeof tierTheme> }) {
  if (!ticketType) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, background: `rgba(${tier.rgb},0.18)`, border: `1px solid rgba(${tier.rgb},0.55)`, color: tier.color }}>
      {isVIP && <Crown className="w-3 h-3" strokeWidth={2} />}
      {ticketType}
    </span>
  );
}

/** Small status pill. */
export function StatusChip({ accentText, label = 'Ticket Secured' }: { accentText: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 700,
        background: `rgba(${accentText},0.16)`, border: `1px solid rgba(${accentText},0.45)`, color: `rgb(${accentText})`,
      }}>
      {label}
    </span>
  );
}

export function MiniQR({ on, off, size = 'w-9 h-9' }: { on: string; off: string; size?: string }) {
  return (
    <div className={`${size} rounded-lg grid grid-cols-3 grid-rows-3 gap-[2px] p-1 shrink-0`} style={{ background: off }}>
      {[1, 1, 0, 1, 0, 1, 0, 1, 1].map((f, i) => (
        <div key={i} className="rounded-[1px]" style={{ background: f ? on : 'transparent' }} />
      ))}
    </div>
  );
}

/** Derive a complementary second tone from "r,g,b" via HSL hue-rotation, so the
 *  mesh gradients read as a rich two-colour blend instead of one flat hue. */
export function secondTone(rgbStr: string, deg = 155): string {
  const parts = rgbStr.split(',').map((p) => parseInt(p.trim(), 10) || 0);
  let [r, g, b] = (parts.length === 3 ? parts : [214, 249, 5]).map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2; const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  h = (h + deg / 360) % 1;
  s = Math.min(1, Math.max(s, 0.55));
  const hue2 = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2(p, q, h + 1 / 3), hue2(p, q, h), hue2(p, q, h - 1 / 3)]
    .map((c) => Math.round(c * 255)).join(',');
}

/** Fine film grain — gives the flat gradients a premium, printed texture. */
const GRAIN_URL =
  "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ backgroundImage: `url("${GRAIN_URL}")`, backgroundSize: '180px 180px', opacity, mixBlendMode: 'overlay' }}
    />
  );
}

/** Bottom-of-card organic-promotion CTA — the bit that converts the screenshot
 *  into new Digis users. Kept short, confident, scannable. */
export function BrandCTA({ accentText }: { accentText: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-3">
      <DigisMark className="w-3.5 h-3.5 shrink-0" color={`rgb(${accentText})`} />
      <span
        className="text-[9.5px] tracking-[1.8px] uppercase"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}
      >
        Get tickets on Digis
      </span>
    </div>
  );
}

export function MetaFooter({ event, accentText, borderColor }: { event: ShareCardEvent; accentText: string; borderColor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
      <div className="min-w-0">
        <div className="text-[13px] tracking-[0.8px] uppercase truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: '#fff' }}>
          {shortDate(event.date)}{event.time ? ` · ${event.time}` : ''}
        </div>
        <div className="flex items-center gap-1 mt-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: `rgb(${accentText})` }} strokeWidth={2.5} />
          <span className="text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{event.venue}</span>
        </div>
      </div>
      <MiniQR on={`rgb(${accentText})`} off="rgba(255,255,255,0.08)" />
    </div>
  );
}

/* ====================================================================
   CARD 1: SPOTLIGHT — Wrapped-style two-tone mesh, framed poster,
   oversized editorial type. The "show off" hero.
   ==================================================================== */
export function BoldCard({ event, ticketType, ticketLevel, isVIP, hued, accentText }: CardProps) {
  const categoryTokens = getCategoryColor(event.category, hued);
  const tier = tierTheme(ticketType, ticketLevel);
  const second = secondTone(hued);
  const titleSize = eventTitleSize(event.name, 44, 36, 29);
  return (
    <div
      className="relative w-full rounded-[28px] overflow-hidden flex flex-col"
      style={{
        aspectRatio: '9/16',
        background: `
          radial-gradient(ellipse 120% 50% at 12% 0%, rgba(${hued},0.55) 0%, rgba(${hued},0.16) 38%, transparent 68%),
          radial-gradient(ellipse 110% 55% at 100% 22%, rgba(${second},0.42) 0%, rgba(${second},0.10) 42%, transparent 70%),
          radial-gradient(ellipse 130% 60% at 50% 108%, rgba(${hued},0.40) 0%, transparent 64%),
          #08080a
        `,
      }}
    >
      <Grain />

      {/* Header */}
      <div className="relative px-6 pt-6 flex items-center justify-between gap-3">
        <Wordmark />
        <TierBadge ticketType={ticketType} isVIP={isVIP} tier={tier} />
      </div>

      {/* Eyebrow + statement headline (gradient fill) */}
      <div className="relative px-6 mt-7">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[3px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: `rgb(${accentText})` }}>
          ✦ I secured my spot
        </span>
        <h2 className="mt-2 leading-[0.9] tracking-[-1.5px] line-clamp-3"
          style={{
            ...titleStyle, fontWeight: 800, fontSize: titleSize, color: '#ffffff',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}>
          {event.name}
        </h2>
      </div>

      {/* Framed poster */}
      <div className="relative px-6 mt-5 flex-1 min-h-0">
        <div className="relative w-full h-full rounded-[20px] overflow-hidden"
          style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,0.25), 0 12px 32px rgba(0,0,0,0.45)' }}>
          <img src={event.image} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
          {/* foil shimmer sweep */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.22) 47%, transparent 60%)` }} />
          {event.category && (
            <span className="absolute top-3 left-3 text-[9px] tracking-[2px] uppercase px-2.5 py-1 rounded-full"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, background: `linear-gradient(${categoryTokens.scrim}, ${categoryTokens.scrim}), rgba(${categoryTokens.rgb},${categoryTokens.tint})`, border: `1px solid rgba(${categoryTokens.rgb},${categoryTokens.border})`, color: `rgb(${categoryTokens.rgb})` }}>
              {event.category}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative px-6 pb-5 pt-4">
        <MetaFooter event={event} accentText={accentText} borderColor={`rgba(${accentText},0.32)`} />
        <BrandCTA accentText={accentText} />
      </div>
    </div>
  );
}

/* ====================================================================
   CARD 2: AFTER DARK — cinematic full-bleed poster, huge title,
   verified trust mark, moody two-tone wash.
   ==================================================================== */
export function NightCard({ event, ticketType, ticketLevel, isVIP, hued, accentText, purchased }: CardProps) {
  const tier = tierTheme(ticketType, ticketLevel);
  const second = secondTone(hued);
  const titleSize = eventTitleSize(event.name, 46, 37, 30);
  return (
    <div className="relative w-full rounded-[28px] overflow-hidden flex flex-col" style={{ aspectRatio: '9/16', background: '#08080a' }}>
      {/* Full-bleed cinematic image */}
      <div className="relative w-full" style={{ height: '60%' }}>
        <img src={event.image} alt="" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
        {/* cinematic fade to black */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(8,8,10,0.30) 0%, transparent 30%, rgba(8,8,10,0.55) 72%, #08080a 100%)' }} />
        {/* two-tone colour wash from the artwork */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 90% 60% at 20% 100%, rgba(${hued},0.45) 0%, transparent 60%), radial-gradient(ellipse 90% 60% at 90% 90%, rgba(${second},0.32) 0%, transparent 62%)` }} />
        <div className="absolute top-0 left-0 right-0 px-6 pt-6 flex items-center justify-between gap-3">
          <Wordmark shadow />
          <TierBadge ticketType={ticketType} isVIP={isVIP} tier={tier} />
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 flex flex-col px-6 pb-5 min-h-0" style={{ marginTop: '-14%' }}>
        <Grain opacity={0.05} />
        <span className="relative inline-flex items-center gap-1.5 text-[11px] tracking-[3px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: `rgb(${accentText})` }}>
          ✦ Catch me here
        </span>

        <h2 className="relative mt-2 leading-[0.92] tracking-[-1.3px] line-clamp-3"
          style={{ ...titleStyle, fontWeight: 800, color: '#ffffff', fontSize: titleSize, textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
          {event.name}
        </h2>

        {/* Verified status row */}
        <div className="relative mt-4 inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full"
          style={{ background: `rgba(${accentText},0.14)`, border: `1px solid rgba(${accentText},0.5)` }}>
          <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: `rgb(${accentText})` }} />
          <span className="text-[11px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: `rgb(${accentText})` }}>
            {purchased ? 'Ticket Secured' : 'Get Tickets'}
          </span>
        </div>

        <div className="relative mt-auto pt-5">
          <MetaFooter event={event} accentText={accentText} borderColor="rgba(255,255,255,0.16)" />
          <BrandCTA accentText={accentText} />
        </div>
      </div>
    </div>
  );
}

/* ====================================================================
   CARD 3: TICKET CUT — collectible tear-off with foil edge, serial,
   barcode. A keepsake people screenshot.
   ==================================================================== */
export function StubCard({ event, ticketType, ticketLevel, isVIP, hued, accentText }: CardProps) {
  const tier = tierTheme(ticketType, ticketLevel);
  const second = secondTone(hued);
  const titleSize = eventTitleSize(event.name, 30, 25, 21);
  // Deterministic-ish serial from the event name for collectible flavour.
  const serial = String(
    Math.abs([...(event.name || 'DIGIS')].reduce((a, c) => a * 33 + c.charCodeAt(0), 7)) % 900000 + 100000,
  );
  return (
    <div
      className="relative w-full rounded-[28px] overflow-hidden flex flex-col"
      style={{
        aspectRatio: '9/16',
        background: `
          radial-gradient(ellipse 120% 46% at 18% 0%, rgba(${hued},0.42) 0%, transparent 60%),
          radial-gradient(ellipse 120% 46% at 90% 16%, rgba(${second},0.30) 0%, transparent 64%),
          #08080a
        `,
      }}
    >
      <Grain opacity={0.05} />
      <div className="absolute inset-0 p-3.5 flex z-10">
        <div className="relative w-full flex flex-col rounded-[22px] overflow-hidden"
          style={{ background: '#0e0e11', boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)' }}>
          {/* Foil top edge — two-tone */}
          <div className="shrink-0" style={{ height: 6, background: `linear-gradient(90deg, rgb(${hued}), rgb(${second}), rgb(${hued}))` }} />

          {/* Poster fills the upper ticket */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3">
              <Wordmark shadow />
              <TierBadge ticketType={ticketType} isVIP={isVIP} tier={tier} />
            </div>
            <img src={event.image} alt="" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(10,10,12,0.25) 0%, transparent 38%, rgba(14,14,17,0.55) 70%, rgba(14,14,17,0.97) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="text-[10px] tracking-[3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: `rgb(${accentText})` }}>
                ✦ I'll be there
              </span>
              <h2 className="mt-1 leading-[0.95] tracking-[-0.5px] line-clamp-2"
                style={{ ...titleStyle, fontWeight: 800, color: '#fff', fontSize: titleSize }}>
                {event.name}
              </h2>
            </div>
          </div>

          {/* Perforation with side notches */}
          <div className="relative shrink-0 py-2.5" style={{ background: '#0e0e11' }}>
            <div className="mx-4 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,0.22)' }} />
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#08080a' }} />
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full" style={{ background: '#08080a' }} />
          </div>

          {/* Stub footer — details + serial + barcode */}
          <div className="shrink-0 px-4 pb-4 pt-2" style={{ background: '#0e0e11' }}>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] tracking-[0.5px] uppercase truncate" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 800, color: '#fff' }}>
                  {shortDate(event.date)}{event.time ? ` · ${event.time}` : ''}
                </div>
                <div className="flex items-center gap-1 mt-1 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: `rgb(${accentText})` }} strokeWidth={2.5} />
                  <span className="text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{event.venue}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[8px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>No.</div>
                <div className="text-[12px] tracking-[1px] tabular-nums" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 800, color: `rgb(${accentText})` }}>{serial}</div>
              </div>
            </div>

            {/* Barcode */}
            <div className="flex items-end gap-[2px] h-7 mt-3">
              {[2,1,3,1,1,2,3,1,2,1,3,2,1,1,3,1,2,3,1,2,1,3,1,2,2,1,3,1,2,1,3,1].map((w, i) => (
                <div key={i} className="rounded-[0.5px]"
                  style={{ width: w, height: '100%', background: i % 5 === 0 ? `rgb(${accentText})` : 'rgba(255,255,255,0.78)', opacity: i % 2 === 0 ? 0.92 : 0.45 }} />
              ))}
            </div>

            <BrandCTA accentText={accentText} />
          </div>
        </div>
      </div>
    </div>
  );
}
