import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Users, BadgeCheck, Hourglass, Check, ArrowRight } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';
import { TicketTypeCard } from './TicketTypeCard';
import type {
  DayState,
  ScheduleArtist,
  CancelledDayAlertData,
  SoldOutDayNoticeData,
  LineupDay,
  AgendaDay,
  FestivalDayBarDay,
  FestivalDayStripDay,
  FestivalTier,
} from '@/lib/festival';

const INTER = "'Inter', sans-serif";
const ZALANDO = "'Zalando Sans Expanded', sans-serif";

const RED = (isDark: boolean) => (isDark ? '#ff5a4f' : '#c0271c');

export interface SectionHeadingProps {
  children: ReactNode;
  right?: ReactNode;
}

export function SectionHeading({ children, right }: SectionHeadingProps) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2
        className="text-[11px] tracking-[1.8px] uppercase"
        style={{
          fontFamily: INTER,
          fontWeight: 600,
          color: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(0,0,0,0.7)',
        }}
      >
        {children}
      </h2>
      {right}
    </div>
  );
}

/* ─────────────────────────── Multi-day Notices ─────────────────────────── */

export function SoldOutDayNotice({ headline, hasOtherOpenDays }: SoldOutDayNoticeData) {
  const { isDark } = useTheme();
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-[20px] p-4 flex items-start gap-3 overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,90,79,0.08)' : 'rgba(192,39,28,0.05)',
        ...glassEdge(isDark),
      }}
    >
      <span
        className="mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: RED(isDark) }}
      >
        <Users className="w-4 h-4 text-white" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-[1.5px] uppercase" style={{ fontFamily: INTER, fontWeight: 800, color: RED(isDark) }}>
          {headline}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ fontFamily: INTER, color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.62)' }}>
          Single day tickets for this date are gone.{hasOtherOpenDays ? ' Pick another day to keep going.' : ''}
        </p>
      </div>
    </motion.div>
  );
}

export function CancelledDayAlert({ headline, reason, refundNote, refundRows }: CancelledDayAlertData) {
  const { isDark } = useTheme();
  const ink = isDark ? '#fff' : '#0a0a0a';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const hair = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const red = RED(isDark);
  const lime = isDark ? '#d6f905' : '#3d4a00';
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: isDark ? 'rgba(20,20,20,0.72)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        ...glassEdge(isDark),
      }}
    >
      <GlassReflection isDark={isDark} />
      <div className="relative px-3.5 pt-3 pb-2.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[9px] tracking-[1.5px] uppercase leading-none" style={{ fontFamily: INTER, fontWeight: 800, color: red }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: red }} />
            {headline}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug line-clamp-2" style={{ fontFamily: INTER, fontWeight: 600, color: ink }}>
            {reason ?? 'This day will not go ahead.'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] leading-snug" style={{ fontFamily: INTER, color: muted }}>
            <Check className="w-3 h-3 flex-shrink-0" strokeWidth={2.75} style={{ color: lime }} />
            <span className="truncate">{refundNote}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-full flex items-center justify-between px-3.5 h-9 cursor-pointer text-[11px]"
        style={{
          fontFamily: INTER,
          fontWeight: 600,
          color: muted,
          boxShadow: `inset 0 1px 0 ${hair}`,
        }}
      >
        Refund breakdown
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`} strokeWidth={2} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative overflow-hidden">
            <div className="px-3.5 pb-3 grid gap-1.5">
              {refundRows.map((row) => (
                <div key={row.name} className="flex items-center gap-3 text-[11.5px]" style={{ fontFamily: INTER }}>
                  <span className="truncate" style={{ color: ink }}>{row.name}</span>
                  <span aria-hidden className="flex-1 border-b border-dotted translate-y-[3px]" style={{ borderColor: hair }} />
                  <span className="flex-shrink-0 tabular-nums" style={{ fontWeight: 700, color: lime }}>{row.right}</span>
                </div>
              ))}
              <p className="mt-1 text-[10px]" style={{ fontFamily: INTER, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
                To your original payment method in 5–7 business days. No action needed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const STATE_LABEL: Partial<Record<DayState, string>> = {
  past: 'Ended',
  cancelled: 'Cancelled',
  soldOut: 'Sold out',
  live: 'Today',
};

/* ─────────────────────────── Day Switcher ─────────────────────────── */

export type DaySwitcherDay = {
  id: string;
  top: string;
  sub: string;
  cancelled?: boolean;
};

export interface DaySwitcherProps {
  days: DaySwitcherDay[];
  value: string;
  onChange: (id: string) => void;
  allLabel: string;
  layoutId?: string;
}

export function DaySwitcher({ days, value, onChange, allLabel, layoutId = 'day-switcher-pill' }: DaySwitcherProps) {
  const { isDark } = useTheme();
  const options: DaySwitcherDay[] = [{ id: 'all', top: 'All Days', sub: allLabel }, ...days];
  const scroll = options.length > 5;

  return (
    <div
      className={`relative rounded-2xl p-1 ${scroll ? 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}`}
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        ...glassEdge(isDark),
      }}
      role="tablist"
      aria-label="Festival day"
    >
      <div className={scroll ? 'flex gap-1 w-max' : 'grid gap-1'} style={scroll ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.id)}
              className={`relative rounded-xl px-2 py-2 flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6f905]/60 ${scroll ? 'min-w-[84px]' : 'min-w-0'}`}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-xl"
                  style={
                    o.cancelled
                      ? { background: isDark ? 'rgba(255,90,79,0.14)' : 'rgba(210,40,30,0.08)', ...glassEdge(isDark) }
                      : { background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' }
                  }
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className="relative text-[11.5px] leading-none truncate max-w-full"
                style={{
                  fontFamily: INTER,
                  fontWeight: active ? 700 : 600,
                  color: o.cancelled ? RED(isDark) : active ? '#0a0a0a' : isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)',
                  textDecoration: o.cancelled ? 'line-through' : undefined,
                }}
              >
                {o.top}
              </span>
              {o.cancelled ? (
                <span
                  className="relative mt-1 h-[14px] px-1.5 inline-flex items-center rounded-full text-[7.5px] tracking-[1px] uppercase leading-none"
                  style={{ fontFamily: INTER, fontWeight: 800, background: RED(isDark), color: '#fff' }}
                >
                  Cancelled
                </span>
              ) : (
                <span
                  className="relative mt-1 text-[9px] tracking-[0.8px] uppercase leading-none"
                  style={{
                    fontFamily: INTER,
                    fontWeight: 600,
                    color: active ? 'rgba(10,10,10,0.62)' : isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)',
                  }}
                >
                  {o.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Day Lineup & Agenda ─────────────────────────── */

export interface DayLineupProps {
  days: LineupDay[];
  dayId: string;
  onPickDay?: (id: string) => void;
  agenda?: AgendaDay[];
  onOpenArtist?: (artist: ScheduleArtist) => void;
}

export function DayLineup({ days, dayId, onPickDay, agenda, onOpenArtist }: DayLineupProps) {
  const { isDark } = useTheme();
  const rail = isDark ? '#4a4a4a' : '#c2c2bc';

  if (dayId === 'all' && agenda && onPickDay) {
    return <DayAgenda days={agenda} onPickDay={onPickDay} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dayId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22 }}
        className="mt-6 flex flex-col gap-7"
      >
        {days.map((d) => (
          <div key={d.id}>
            {dayId === 'all' && (
              <div className="mb-3 flex items-center gap-3 leading-none">
                <span className="w-12 flex-shrink-0 flex items-baseline justify-center gap-1 whitespace-nowrap">
                  <span className="text-[10px] tracking-[1px] uppercase" style={{ fontFamily: INTER, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.5)' }}>Day</span>
                  <span className="text-[11px] tabular-nums" style={{ fontFamily: ZALANDO, fontWeight: 600, color: isDark ? '#d6f905' : '#4a5800' }}>{d.dayNumberLabel}</span>
                </span>
                <span className="ml-2 h-6 w-px flex-shrink-0" aria-hidden style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.13)' }} />
                <span className="min-w-0 whitespace-nowrap">
                  <span className="text-[13px]" style={{ fontFamily: ZALANDO, fontWeight: 400, color: isDark ? '#fff' : '#0a0a0a' }}>{d.dowLong}</span>
                  <span className="ml-1.5 text-[9px] tracking-[1.3px] uppercase" style={{ fontFamily: INTER, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.5)' }}>{d.monDay}</span>
                </span>
                <span className="ml-auto flex-shrink-0 whitespace-nowrap">
                  <span className="text-[8px] tracking-[1.3px] uppercase" style={{ fontFamily: INTER, fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)' }}>Doors </span>
                  <span className="text-[11px] tabular-nums" style={{ fontFamily: INTER, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.7)' }}>{d.doorsLabel}</span>
                </span>
              </div>
            )}
            {d.cancelledAlert && <div className="mb-4"><CancelledDayAlert {...d.cancelledAlert} /></div>}
            {d.soldOutNotice && <div className="mb-4"><SoldOutDayNotice {...d.soldOutNotice} /></div>}
            <ol className={`relative ${d.cancelled ? 'opacity-40 grayscale' : ''}`} aria-hidden={d.cancelled || undefined}>
              <span
                aria-hidden
                className="absolute left-[68px] top-0 bottom-0 w-px"
                style={{
                  backgroundImage: `linear-gradient(${rail} 4px, transparent 4px)`,
                  backgroundSize: '1px 9px',
                  backgroundRepeat: 'repeat-y',
                }}
              />
              {d.lineup.map((a, i) => (
                <motion.li
                  key={a.name + d.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pb-1.5 last:pb-0"
                >
                  <TimelineEntry artist={a} onOpen={() => onOpenArtist?.(a)} />
                </motion.li>
              ))}
            </ol>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function DayAgenda({ days, onPickDay }: { days: AgendaDay[]; onPickDay: (id: string) => void }) {
  const { isDark } = useTheme();
  const ink = isDark ? '#fff' : '#0a0a0a';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <motion.ol initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mt-5 flex flex-col gap-1.5">
      {days.map((d) => {
        const state = d.state;
        const tag = STATE_LABEL[state];
        const head = d.headliner;
        const off = state === 'past' || state === 'cancelled';
        return (
          <li key={d.id}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => onPickDay(d.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                ...glassEdge(isDark),
              }}
            >
              <span className={`w-11 flex-shrink-0 flex flex-col items-center ${off ? 'opacity-50' : ''}`}>
                <span className="text-[8.5px] tracking-[1.3px] uppercase leading-none" style={{ fontFamily: INTER, fontWeight: 700, color: muted }}>{d.dow}</span>
                <span className="mt-1 text-[20px] leading-none tabular-nums" style={{ fontFamily: ZALANDO, fontWeight: 300, color: ink, textDecoration: state === 'cancelled' ? 'line-through' : undefined }}>{d.dayNum}</span>
              </span>
              {head?.image && <img src={head.image} alt="" className={`w-9 h-9 rounded-full object-cover flex-shrink-0 ${off ? 'grayscale opacity-50' : ''}`} />}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] tracking-[1.3px] uppercase" style={{ fontFamily: INTER, fontWeight: 800, color: muted }}>{d.dayLabel}</span>
                  {tag && <span className="text-[9px] tracking-[1px] uppercase" style={{ fontFamily: INTER, fontWeight: 800, color: state === 'cancelled' || state === 'soldOut' ? RED(isDark) : state === 'live' ? (isDark ? '#d6f905' : '#4a5800') : muted }}>· {tag}</span>}
                </span>
                <span className="block mt-0.5 text-[13px] truncate" style={{ fontFamily: INTER, fontWeight: 600, color: off ? muted : ink }}>{head?.name ?? 'Lineup TBA'}</span>
                <span className="block text-[10.5px] truncate" style={{ fontFamily: INTER, color: muted }}>{d.subLine}</span>
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" strokeWidth={2} style={{ color: muted }} />
            </motion.button>
          </li>
        );
      })}
    </motion.ol>
  );
}

function TimelineEntry({ artist, onOpen }: { artist: ScheduleArtist; onOpen: () => void }) {
  const { isDark } = useTheme();
  const press = {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen();
      }
    },
  };
  const headliner = /headliner|closing/i.test(artist.role ?? '');
  const ink = isDark ? '#fff' : '#0a0a0a';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';
  const [clock, ap] = (artist.time ?? '6:00 PM').split(' ');
  const displayClock = /^\d:/.test(clock) ? `0${clock}` : clock;

  return (
    <div className="grid grid-cols-[48px_16px_minmax(0,1fr)] gap-x-3 min-w-0">
      <div className="flex flex-col items-center justify-center text-center">
        <span className="block text-[12px] leading-none tabular-nums" style={{ fontFamily: INTER, fontWeight: 700, color: headliner ? (isDark ? '#d6f905' : '#4a5800') : ink }}>{displayClock}</span>
        <span className="block mt-1 text-[8px] tracking-[1.1px] uppercase" style={{ fontFamily: INTER, fontWeight: 700, color: muted }}>{ap || 'PM'}</span>
      </div>
      <div className="relative flex items-center justify-center">
        <span aria-hidden className="relative z-10 w-[7px] h-[7px] rounded-full" style={{ background: headliner ? (isDark ? '#d6f905' : '#5a6b00') : isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.38)' }} />
      </div>
      {headliner ? (
        <div
          {...press}
          className="relative overflow-hidden flex min-w-0 items-center gap-3 rounded-[18px] px-3 py-2.5 cursor-pointer"
          style={{
            background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            ...glassEdge(isDark),
          }}
        >
          <GlassReflection isDark={isDark} />
          {artist.image && <img src={artist.image} alt="" className="relative z-10 w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy" />}
          <div className="relative z-10 min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[14px] leading-none truncate" style={{ fontFamily: ZALANDO, fontWeight: 400, color: ink }}>
              {artist.name}
              {artist.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isDark ? '#d6f905' : '#4a5800' }} strokeWidth={2} />}
            </p>
            <span className="block mt-1 text-[8px] tracking-[1.25px] uppercase truncate" style={{ fontFamily: INTER, fontWeight: 800, color: isDark ? '#d6f905' : '#4a5800' }}>
              {artist.role}
            </span>
          </div>
          <ChevronRight className="relative z-10 w-3.5 h-3.5 flex-shrink-0" style={{ color: isDark ? '#d6f905' : '#4a5800' }} strokeWidth={2} />
        </div>
      ) : (
        <div
          {...press}
          className="group relative overflow-hidden flex min-w-0 items-center gap-3 rounded-[18px] px-3 py-2.5 cursor-pointer"
          style={{
            background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            ...glassEdge(isDark),
          }}
        >
          <GlassReflection isDark={isDark} />
          {artist.image && <img src={artist.image} alt="" className="relative z-10 w-10 h-10 rounded-xl object-cover flex-shrink-0" loading="lazy" />}
          <div className="relative z-10 min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[14px] truncate" style={{ fontFamily: ZALANDO, fontWeight: 400, color: ink }}>
              {artist.name}
              {artist.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isDark ? '#d6f905' : '#5a6b00' }} strokeWidth={2} />}
            </p>
            <p className="mt-1 text-[10px] truncate" style={{ fontFamily: INTER, color: muted }}>
              {artist.role}{artist.genre ? ` · ${artist.genre}` : ''}
            </p>
          </div>
          <ChevronRight className="relative z-10 w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: ink }} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Festival Day Bar ─────────────────────────── */

export interface FestivalDayBarProps {
  days: FestivalDayBarDay[];
  showPass: boolean;
  passSpanLabel: string;
  value: string;
  onPick: (id: string) => void;
  stuck?: boolean;
}

export function FestivalDayBar({ days, showPass, passSpanLabel, value, onPick, stuck }: FestivalDayBarProps) {
  const { isDark } = useTheme();
  const allOn = value === 'all';
  const ink = isDark ? '#fff' : '#0a0a0a';
  const muted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.45)';
  const limeInk = isDark ? '#d6f905' : '#4a5800';
  const onSub = 'rgba(10,10,10,0.58)';
  const listRef = useRef<HTMLDivElement>(null);
  const scroll = days.length > 5;

  useEffect(() => {
    if (!scroll) return;
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;
    const l = list.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    list.scrollTo({ left: list.scrollLeft + (r.left - l.left) - (l.width - r.width) / 2, behavior: 'smooth' });
  }, [value, scroll]);

  const sz = days.length <= 3 ? { cap: 8.5, num: 16, dow: 9 } : { cap: 7.5, num: 14, dow: 8 };
  const radius = days.length <= 4 ? 16 : 14;
  const tile = 'group relative h-full flex-shrink-0 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6f905]/60';
  const idle = isDark ? 'bg-white/[0.05] hover:bg-white/[0.1]' : 'bg-black/[0.035] hover:bg-black/[0.07]';
  const wash = isDark ? 'bg-[#d6f905]/[0.08] hover:bg-[#d6f905]/[0.13]' : 'bg-[#5a6b00]/[0.07] hover:bg-[#5a6b00]/[0.11]';
  const sub = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)';
  const isCovered = (d?: FestivalDayBarDay) => !!d && allOn && d.inPass;
  const connector = (show: boolean) => show && (
    <span aria-hidden className="absolute top-1/2 -right-3 w-3 -translate-y-1/2" style={{ background: isDark ? 'rgba(214,249,5,0.35)' : 'rgba(90,107,0,0.35)', height: '0.5px' }} />
  );

  return (
    <div
      className="relative w-full rounded-[20px] p-1.5 transition-[background] duration-300"
      style={{
        background: stuck ? (isDark ? 'transparent' : 'rgba(255,255,255,0.72)') : 'transparent',
        backdropFilter: stuck ? (isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)') : undefined,
        WebkitBackdropFilter: stuck ? (isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)') : undefined,
      }}
      role="tablist"
      aria-label="Choose your days"
    >
      {stuck && <GlassReflection isDark={isDark} />}

      <div className="relative z-10 flex h-[72px] items-stretch gap-3">
        {showPass && (
          <motion.button
            type="button"
            role="tab"
            aria-selected={allOn}
            onClick={() => onPick('all')}
            whileTap={{ scale: 0.92 }}
            className="group relative h-full flex-shrink-0 flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none"
          >
            <span className="tracking-[1.2px] uppercase leading-none" style={{ fontSize: sz.cap, fontFamily: INTER, fontWeight: 700, color: limeInk }}>Pass</span>
            <span className={`relative mt-1.5 h-[32px] px-3 rounded-[10px] flex items-center transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-[#d6f905]/60 ${allOn ? '' : idle}`}>
              {allOn && (
                <motion.span layoutId="festival-day-stop" className="absolute inset-0" style={{ background: '#d6f905', borderRadius: 10 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }} />
              )}
              {connector(isCovered(days[0]))}
              <span className="relative leading-none tracking-[-0.2px] whitespace-nowrap" style={{ fontSize: sz.num - 3, fontFamily: ZALANDO, fontWeight: 500, color: allOn ? '#0a0a0a' : ink }}>All days</span>
            </span>
            <span className="mt-1.5 tracking-[0.6px] uppercase leading-none whitespace-nowrap" style={{ fontSize: sz.dow, fontFamily: INTER, fontWeight: 800, color: sub }}>{passSpanLabel}</span>
          </motion.button>
        )}

        <div
          ref={listRef}
          className="relative flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={scroll ? { maskImage: 'linear-gradient(90deg, #000 calc(100% - 30px), transparent)', WebkitMaskImage: 'linear-gradient(90deg, #000 calc(100% - 30px), transparent)' } : undefined}
        >
          <div
            className={`h-full grid gap-3 ${scroll ? 'grid-flow-col' : ''}`}
            style={scroll ? { gridAutoColumns: 'calc((100% - 48px) / 5)' } : { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {days.map((d, i) => {
              const state = d.state;
              const on = value === d.id;
              const covered = isCovered(d);
              const off = state === 'past' || state === 'cancelled';
              const alert = state === 'soldOut' || state === 'cancelled';
              const note = state === 'live' ? 'Today' : STATE_LABEL[state];
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onPick(d.id)}
                  whileTap={{ scale: 0.92 }}
                  title={note ? `Day ${i + 1} · ${note}` : `Day ${i + 1}`}
                  style={{ borderRadius: radius }}
                  className={`${tile} min-w-0 ${on ? '' : covered ? wash : idle} ${off && !on ? 'opacity-50' : ''}`}
                >
                  {on && (
                    <motion.span layoutId="festival-day-stop" className="absolute inset-0" style={{ background: '#d6f905', borderRadius: radius }} transition={{ type: 'spring', stiffness: 460, damping: 34 }} />
                  )}
                  {connector(covered && isCovered(days[i + 1]))}
                  <span className="relative tracking-[1.2px] uppercase leading-none" style={{ fontSize: sz.cap, fontFamily: INTER, fontWeight: 700, color: on ? onSub : covered ? limeInk : muted }}>Day {i + 1}</span>
                  <span
                    className={`relative mt-[9px] leading-none tabular-nums tracking-[-0.2px] ${state === 'cancelled' ? 'line-through' : ''}`}
                    style={{ fontSize: sz.num, fontFamily: ZALANDO, fontWeight: 500, color: on ? '#0a0a0a' : state === 'cancelled' ? RED(isDark) : ink }}
                  >
                    {d.dayNum}
                  </span>
                  <span className="relative mt-[9px] tracking-[1.1px] uppercase leading-none whitespace-nowrap" style={{ fontSize: sz.dow, fontFamily: INTER, fontWeight: 800, color: on ? onSub : alert ? RED(isDark) : sub }}>
                    {d.dow}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Festival Day Strip ─────────────────────────── */

export interface FestivalDayStripProps {
  days: FestivalDayStripDay[];
  showPass: boolean;
  passFromLabel?: string;
  value: string;
  onPick: (id: string) => void;
}

export function FestivalDayStrip({ days, showPass, passFromLabel, value, onPick }: FestivalDayStripProps) {
  const { isDark } = useTheme();
  const allActive = value === 'all';

  return (
    <div className="-mx-5 px-5 lg:mx-0 lg:px-0 grid grid-flow-col auto-cols-[42%] sm:auto-cols-fr gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Choose your days">
      {showPass && (
        <motion.button
          type="button"
          role="tab"
          whileTap={{ scale: 0.97 }}
          onClick={() => onPick('all')}
          aria-selected={allActive}
          className="relative h-[124px] rounded-2xl overflow-hidden text-left cursor-pointer"
          style={{
            background: allActive ? 'linear-gradient(135deg, #d6f905 0%, #b8d900 100%)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            boxShadow: allActive ? `0 0 24px rgba(214,249,5,${isDark ? 0.3 : 0.2})` : 'none',
            ...glassEdge(isDark),
          }}
        >
          <div
            className="absolute top-2.5 left-2.5 h-[20px] px-2 inline-flex items-center rounded-full text-[8.5px] tracking-[1.3px] leading-none"
            style={{ fontFamily: INTER, fontWeight: 800, background: allActive ? '#0a0a0a' : '#d6f905', color: allActive ? '#d6f905' : '#0a0a0a' }}
          >
            ALL DAYS
          </div>
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="text-[9px] tracking-[1.4px] uppercase" style={{ fontFamily: INTER, fontWeight: 700, color: allActive ? 'rgba(10,10,10,0.6)' : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>Festival pass</p>
            <p className="mt-1 text-[14px] leading-tight truncate" style={{ fontFamily: ZALANDO, fontWeight: 400, color: allActive || !isDark ? '#0a0a0a' : '#fff' }}>{passFromLabel || 'Available'}</p>
          </div>
        </motion.button>
      )}

      {days.map((d, i) => {
        const head = d.headliner;
        const active = d.id === value;
        const state = d.state;
        const tag = STATE_LABEL[state];
        return (
          <motion.button
            key={d.id}
            type="button"
            role="tab"
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(d.id)}
            aria-selected={active}
            className="relative h-[124px] rounded-2xl overflow-hidden text-left cursor-pointer"
            style={{
              boxShadow: active ? `inset 0 0 0 2px #d6f905, 0 0 24px rgba(214,249,5,${isDark ? 0.3 : 0.2})` : 'none',
              ...glassEdge(isDark),
            }}
          >
            {head?.image && (
              <img src={head.image} alt="" className={`absolute inset-0 w-full h-full object-cover ${state === 'past' || state === 'cancelled' ? 'grayscale opacity-60' : ''}`} loading="lazy" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.82) 100%)' }} />
            <div
              className="absolute top-2.5 left-2.5 h-[20px] px-2 inline-flex items-center rounded-full text-[8.5px] tracking-[1.3px] leading-none"
              style={{ fontFamily: INTER, fontWeight: 800, background: active ? '#d6f905' : 'rgba(10,10,10,0.55)', color: active ? '#0a0a0a' : '#fff', backdropFilter: 'blur(8px)' }}
            >
              DAY {i + 1}
            </div>
            {tag && (
              <div
                className="absolute top-2.5 right-2.5 h-[20px] px-2 inline-flex items-center gap-1 rounded-full text-[8.5px] tracking-[1.3px] uppercase leading-none"
                style={{
                  fontFamily: INTER,
                  fontWeight: 800,
                  background: 'rgba(10,10,10,0.6)',
                  color: state === 'live' ? '#d6f905' : state === 'soldOut' || state === 'cancelled' ? '#ff8a80' : 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {state === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[#d6f905]" />}
                {tag}
              </div>
            )}
            <div className="absolute bottom-2.5 left-3 right-3">
              <p className="text-[9px] tracking-[1.4px] uppercase text-white/65 truncate" style={{ fontFamily: INTER, fontWeight: 700 }}>
                {d.dateLabel}{d.fromPriceLabel ? ` · ${d.fromPriceLabel}` : ''}
              </p>
              <p className={`mt-1 text-[14px] leading-tight text-white truncate ${state === 'cancelled' ? 'line-through opacity-70' : ''}`} style={{ fontFamily: ZALANDO, fontWeight: 400 }}>
                {head?.name}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Festival Ticket Selector ─────────────────────────── */

export interface FestivalTicketSelectorProps {
  dayId: string;
  onDayChange: (id: string) => void;
  selectedTicketType: string | null;
  onSelectTicketType: (name: string) => void;
  underway: boolean;
  cancelledCount: number;
  showPasses: boolean;
  title: string;
  passFromLabel?: string;
  doorsLabel?: string;
  cancelledAlert?: CancelledDayAlertData;
  soldOutNotice?: SoldOutDayNoticeData;
  dayEnded?: boolean;
  tiers: FestivalTier[];
  passUpsell?: {
    label: string;
    offLabel?: string;
  };
}

export function FestivalTicketSelector({
  dayId,
  onDayChange,
  selectedTicketType,
  onSelectTicketType,
  underway,
  cancelledCount: cancelled,
  showPasses,
  title,
  passFromLabel,
  doorsLabel,
  cancelledAlert,
  soldOutNotice,
  dayEnded,
  tiers,
  passUpsell,
}: FestivalTicketSelectorProps) {
  const { isDark } = useTheme();
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const ink = isDark ? '#fff' : '#0a0a0a';

  return (
    <>
      <SectionHeading>Tickets</SectionHeading>
      {(underway || cancelled > 0) && (
        <div
          className="mb-3 px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', ...glassEdge(isDark) }}
        >
          {underway ? (
            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isDark ? '#d6f905' : '#5a6b00' }} />
          ) : (
            <Hourglass className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} />
          )}
          <p className="text-[11.5px] leading-snug" style={{ fontFamily: INTER, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>
            {underway && (
              <>
                <span style={{ fontWeight: 700, color: ink }}>Festival under way.</span> Passes now cover only the remaining days, priced to match.{' '}
              </>
            )}
            {cancelled > 0 && (
              <>
                <span style={{ fontWeight: 700, color: RED(isDark) }}>{cancelled === 1 ? '1 day' : `${cancelled} days`} cancelled.</span> Day tickets are refunded in full; pass holders get a pro-rata refund.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 px-1">
        <p className="text-[20px] leading-none" style={{ fontFamily: ZALANDO, fontWeight: 300, color: ink }}>
          {title}
        </p>
        {showPasses && passFromLabel && <span className="text-[11px] whitespace-nowrap" style={{ fontFamily: INTER, color: muted }}>{passFromLabel}</span>}
        {doorsLabel && <span className="text-[11px] whitespace-nowrap" style={{ fontFamily: INTER, color: muted }}>{doorsLabel}</span>}
      </div>

      {cancelledAlert && <div className="mt-4"><CancelledDayAlert {...cancelledAlert} /></div>}
      {soldOutNotice && <div className="mt-4"><SoldOutDayNotice {...soldOutNotice} /></div>}
      {dayEnded && <p className="mt-4 px-1 text-[12px]" style={{ fontFamily: INTER, color: muted }}>This day has ended.</p>}

      <AnimatePresence mode="wait">
        <motion.div
          key={dayId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="mt-4 space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"
        >
          {tiers.map(({ tier: t }, i) => (
            <div key={t.name}>
              <TicketTypeCard
                type={t}
                index={i}
                selected={selectedTicketType === t.name}
                onSelect={() => onSelectTicketType(t.name)}
              />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {passUpsell && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => onDayChange('all')}
          className="mt-3 w-full flex items-center justify-between gap-3 px-3.5 h-[40px] rounded-xl text-left cursor-pointer"
          style={{
            background: isDark ? 'rgba(214,249,5,0.07)' : 'rgba(90,107,0,0.08)',
            ...glassEdge(isDark),
          }}
        >
          <span className="min-w-0 truncate text-[12px]" style={{ fontFamily: INTER, color: muted }}>
            Get <span style={{ fontWeight: 600, color: ink }}>{passUpsell.label}</span>
            {passUpsell.offLabel && <span style={{ fontWeight: 600, color: isDark ? '#d6f905' : '#4a5800' }}> · {passUpsell.offLabel}</span>}
          </span>
          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} style={{ color: isDark ? '#d6f905' : '#4a5800' }} />
        </motion.button>
      )}

      {!showPasses && (
        <p className="text-center text-[11px] mt-6 tracking-[0.3px]" style={{ fontFamily: INTER, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)' }}>
          Each day ticket admits one entry on its date only.
        </p>
      )}
    </>
  );
}

/* ─────────────────────────── Session Guests ─────────────────────────── */

export interface SessionGuestsProps {
  sessionId: string;
  guests: ScheduleArtist[];
  embedded?: boolean;
  onOpenArtist?: (artist: ScheduleArtist) => void;
}

export function SessionGuests({ sessionId, guests, embedded, onOpenArtist }: SessionGuestsProps) {
  const { isDark } = useTheme();
  if (embedded && !guests.length) return null;

  return (
    <div className={embedded ? 'pt-5' : undefined}>
      {embedded ? (
        <p className="mb-3 text-[9.5px] tracking-[1.4px] uppercase" style={{ fontFamily: INTER, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}>
          Special guests
        </p>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={sessionId}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
          className={`-mx-5 px-5 ${embedded ? 'gap-4' : 'gap-4'} flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        >
          {guests.map((a) => (
            <button
              type="button"
              key={a.name}
              onClick={() => onOpenArtist?.(a)}
              className="flex-shrink-0 w-[72px] flex flex-col items-center text-center cursor-pointer"
            >
              <div
                className="w-[60px] h-[60px] rounded-full p-[2px]"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.62)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  ...glassEdge(isDark),
                }}
              >
                {a.image ? (
                  <img src={a.image} alt={a.name} className="w-full h-full rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center bg-white/10 text-[12px] font-bold">
                    {a.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-tight truncate w-full" style={{ fontFamily: INTER, fontWeight: 600, color: isDark ? '#fff' : '#0a0a0a' }}>
                {a.name}
              </p>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Event Ended Notice ─────────────────────────── */

export interface EventEndedNoticeProps {
  dateSpanLabel: string;
  isSeries?: boolean;
  onBrowse?: () => void;
}

export function EventEndedNotice({ dateSpanLabel, isSeries, onBrowse }: EventEndedNoticeProps) {
  const { isDark } = useTheme();
  const ink = isDark ? '#fff' : '#0a0a0a';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';

  return (
    <div
      className="relative mx-auto max-w-md rounded-[24px] p-6 text-center overflow-hidden"
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(28px)',
        ...glassEdge(isDark),
      }}
    >
      <GlassReflection isDark={isDark} />
      <div className="relative z-10">
        <div className="mx-auto w-11 h-11 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}>
          <Hourglass className="w-5 h-5" strokeWidth={1.75} style={{ color: muted }} />
        </div>
        <p className="mt-4 text-[10px] tracking-[1.6px] uppercase" style={{ fontFamily: INTER, fontWeight: 700, color: muted }}>{dateSpanLabel}</p>
        <h3 className="mt-1.5 text-[20px]" style={{ fontFamily: ZALANDO, fontWeight: 300, color: ink }}>{isSeries ? 'This series has wrapped' : 'This event has ended'}</h3>
        <p className="mt-2 text-[12px] leading-relaxed" style={{ fontFamily: INTER, color: muted }}>Ticket sales are closed. Follow the organizer to hear about the next edition first.</p>
        {onBrowse && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onBrowse}
            className="mt-5 h-11 px-5 rounded-full inline-flex items-center gap-2 text-[13px] cursor-pointer"
            style={{ fontFamily: INTER, fontWeight: 700, background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)', color: '#0a0a0a' }}
          >
            Browse upcoming events <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
