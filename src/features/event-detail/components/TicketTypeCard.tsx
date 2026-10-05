import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Crown, Sparkle, Sparkles, Users, Flame } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import type { TicketTier, TicketTierFeature } from '@/types';
import { resolveTierAccent } from '@/lib/tierAccents';
import { InlineCountdown } from './InlineCountdown';
import { AppButton } from '@/components/primitives/AppButton';
import { Money } from '@/lib/money';
import { glassEdgeReflection, glassReflection, type GlassReflectionSettings } from '@/lib/ui/glass';

export function TicketTypeCard({ type, selected, onSelect, onJoinWaitlist, index, reflectionSettings }: { type: TicketTier; selected: boolean; onSelect: () => void; onJoinWaitlist?: () => void; index: number; reflectionSettings?: GlassReflectionSettings }) {
  const { isDark: pageIsDark } = useTheme();
  const isPremium = type.isPremium;
  const isElite = type.isElite;
  const isEarlyBird = type.isEarlyBird;
  // Admissions granted per package unit (backend `ticket_type.admissions_per_unit`).
  // >1 means one price buys entry for several people (a pair, a group).
  const admissionsPerUnit = type.admissionsPerUnit ?? 1;
  const admitsMultiple = admissionsPerUnit > 1;
  // Tier cards are always the vivid dark-colored cards (white text, bright
  // accents) in both themes — matching main. `pageIsDark` only drives the body
  // gradient + glow (below), never the text/accent styling.
  const isDark = true;
  const [expanded, setExpanded] = useState(false);
  // Backend "available: false" → purchasableCap 0 (products.ts). A sold-out
  // TIER is dimmed + non-selectable even when other tiers on the event remain
  // buyable — clicking it would otherwise sail through checkout to a 409
  // inventory_unavailable at order creation.
  const soldOut = type.available === 0;
  // A sold-out offer that accepts a waitlist stays actionable (join), so it is
  // not dimmed like a dead sold-out tier.
  const waitingList = soldOut && type.waitlistEnabled === true && !!onJoinWaitlist;
  const dimmed = soldOut && !waitingList;
  const isFree = type.priceMinor === 0;

  // Rank-based accent (cheapest→emerald, priciest→gold; legacy semantic flags
  // as fallback). Dark mode uses the bright shade; light mode the adjacent ink.
  const { rgb: accentRgb, bright: accentBright, ink: accentInk, bg: accentBg } = resolveTierAccent(type);
  const accentColor = isDark ? accentBright : accentInk;
  const mutedInk = 'rgba(0,0,0,0.55)';

  // Full-card background keyed by the RESOLVED accent (rank `accent`, semantic
  // flags fallback). Live backend tiers only carry `accent` — never the legacy
  // isEarlyBird/isPremium/isElite flags — so the body must derive from the
  // accent, or every card falls through to the standard blue gradient.
  const cardAccent =
    type.accent ??
    (isEarlyBird ? 'emerald' : isElite ? 'violet' : isPremium ? 'gold' : 'blue');
  const cardBackground =
    pageIsDark
      ? ({
          emerald: 'linear-gradient(155deg, #0a2218 0%, #060f0c 100%)',
          rose: 'linear-gradient(155deg, #2a0f1a 0%, #140709 100%)',
          violet: 'radial-gradient(ellipse 120% 80% at 100% 0%, rgba(217,178,89,0.22) 0%, transparent 55%), radial-gradient(ellipse 100% 70% at 0% 110%, rgba(124,58,237,0.32) 0%, transparent 60%), linear-gradient(160deg, #1d0f44 0%, #0a0420 55%, #050108 100%)',
          gold: 'linear-gradient(155deg, #1e1a0a 0%, #0e0c08 100%)',
          blue: 'linear-gradient(155deg, #101a2d 0%, #0a0e14 100%)',
        } as const)[cardAccent]
      : ({
          emerald: 'radial-gradient(ellipse 82% 58% at 10% 0%, rgba(255,255,255,0.11) 0%, transparent 52%), radial-gradient(ellipse 90% 70% at 88% 18%, rgba(52,211,153,0.16) 0%, transparent 58%), linear-gradient(155deg, #17724f 0%, #0f543a 48%, #08271d 100%)',
          rose: 'radial-gradient(ellipse 82% 58% at 10% 0%, rgba(255,255,255,0.10) 0%, transparent 52%), radial-gradient(ellipse 90% 70% at 88% 18%, rgba(251,113,133,0.16) 0%, transparent 58%), linear-gradient(155deg, #84304f 0%, #5d1d37 50%, #270d18 100%)',
          violet: 'radial-gradient(ellipse 120% 80% at 100% 0%, rgba(232,200,122,0.32) 0%, transparent 55%), radial-gradient(ellipse 100% 70% at 0% 110%, rgba(139,92,246,0.38) 0%, transparent 60%), linear-gradient(160deg, #3c2182 0%, #241154 58%, #100628 100%)',
          gold: 'radial-gradient(ellipse 82% 58% at 10% 0%, rgba(255,255,255,0.11) 0%, transparent 52%), radial-gradient(ellipse 90% 70% at 88% 18%, rgba(250,200,60,0.18) 0%, transparent 58%), linear-gradient(155deg, #765817 0%, #4c350d 50%, #211506 100%)',
          blue: 'radial-gradient(ellipse 82% 58% at 10% 0%, rgba(255,255,255,0.11) 0%, transparent 52%), radial-gradient(ellipse 90% 70% at 88% 18%, rgba(96,165,250,0.16) 0%, transparent 58%), linear-gradient(155deg, #255f9f 0%, #1a4778 50%, #0c233d 100%)',
        } as const)[cardAccent];

  const savingsPct = isEarlyBird && type.originalPriceMinor
    ? Math.round((1 - type.priceMinor / type.originalPriceMinor) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={dimmed ? undefined : { scale: 1.01, y: -2 }}
      whileTap={dimmed ? undefined : { scale: 0.99 }}
      onClick={() => { if (waitingList) onJoinWaitlist?.(); else if (!soldOut) onSelect(); }}
      className={`relative rounded-[22px] overflow-visible ${dimmed ? 'opacity-45 grayscale-[0.55] pointer-events-auto select-none' : 'cursor-pointer'}`}
      style={{
        boxShadow: pageIsDark
          ? undefined
          : selected
            ? `0 14px 34px -10px rgba(${accentRgb}, 0.45), 0 4px 12px -4px rgba(0,0,0,0.12)`
            : `0 10px 26px -12px rgba(${accentRgb}, 0.32), 0 2px 8px -4px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Glass body — dark mode stays original, light mode gets fixed solid colored cards */}
      <div
        className="absolute inset-0 rounded-[22px]"
        style={{ background: cardBackground }}
      />
      <span aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none rounded-[22px]" style={glassReflection(pageIsDark, undefined, reflectionSettings)} />
      <span aria-hidden="true" className="absolute inset-0 z-[1] pointer-events-none rounded-[22px]" style={glassEdgeReflection(pageIsDark, reflectionSettings)} />
      {/* VVIP — corner Sparkles */}
      {isElite && (
        <div className="absolute top-2.5 right-9 pointer-events-none z-10">
          <Sparkles className="w-3.5 h-3.5" style={{ color: isDark ? '#e8c87a' : '#a9802a' }} strokeWidth={1.75} />
        </div>
      )}

      {/* Inner light */}
      <div className="absolute inset-0 rounded-[22px] pointer-events-none"
        style={{ background: `linear-gradient(165deg, ${accentBg} 0%, transparent 40%)` }}
      />

      {/* Edge — accent light always on, stronger when selected (no stroke) */}
      <motion.div
        className="absolute inset-0 rounded-[22px] pointer-events-none transition-all duration-400"
        style={{
          boxShadow: selected
            ? pageIsDark
              ? `inset 0 0 0 1.5px rgba(${accentRgb}, ${isPremium ? '0.55' : '0.25'})`
              : isElite
                ? `inset 0 0 0 1.5px rgba(${accentRgb}, 0.58)`
                : `inset 0 0 0 1.5px rgba(${accentRgb}, ${isPremium ? '0.48' : '0.38'})`
            : pageIsDark
              ? `inset 0 0 0 1px rgba(${accentRgb}, 0.1)`
              : isElite
                ? `inset 0 0 0 1px rgba(${accentRgb}, 0.28)`
                : `inset 0 0 0 1px rgba(${accentRgb}, 0.2)`,
        }}
      />

      {/* Top highlight line */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[22px]"
        style={{
          maskImage: 'linear-gradient(to bottom, white 0%, white 1.5px, transparent 1.5px)',
          WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 1.5px, transparent 1.5px)',
          background: pageIsDark
            ? `linear-gradient(90deg, transparent 8%, rgba(${accentRgb}, ${isPremium ? '0.5' : '0.2'}) 50%, transparent 92%)`
            : isElite
              ? `linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.30) 28%, rgba(${accentRgb}, 0.72) 50%, transparent 92%)`
              : `linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.16) 28%, rgba(${accentRgb}, ${isPremium ? '0.48' : '0.34'}) 50%, transparent 92%)`,
        }}
      />

      {/* Shimmer for premium */}
      {isPremium && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[22px] overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, white 0%, white 1.5px, transparent 1.5px)',
            WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 1.5px, transparent 1.5px)',
          }}
        >
          <motion.div
            className="absolute top-0 h-[2px]"
            style={{
              background: pageIsDark
                ? isElite
                  ? 'radial-gradient(ellipse at center, rgba(244,255,128,0.8), transparent 70%)'
                  : 'radial-gradient(ellipse at center, rgba(250,255,150,0.7), transparent 70%)'
                : isElite
                  ? 'radial-gradient(ellipse at center, rgba(244,255,128,0.8), transparent 70%)'
                  : 'radial-gradient(ellipse at center, rgba(255,235,140,0.5), transparent 72%)',
              width: pageIsDark ? '35%' : isElite ? '35%' : '28%',
            }}
            animate={{ left: ['-35%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Card content */}
      <div className="relative z-10 px-4 py-3.5">
        {/* Top: level chip + selection */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-md flex items-center gap-1"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: isElite ? (isDark ? '#f0d28a' : '#7c3aed') : accentColor,
                boxShadow: isElite
                  ? `0 0 0 1px rgba(217,178,89,${isDark ? '0.45' : '0.55'})`
                  : `0 0 0 1px rgba(${accentRgb}, ${isDark ? '0.2' : '0.35'})`,
                background: isElite
                  ? (isDark ? 'linear-gradient(90deg, rgba(217,178,89,0.22), rgba(196,181,253,0.18))' : 'linear-gradient(90deg, rgba(217,178,89,0.18), rgba(124,58,237,0.14))')
                  : `rgba(${accentRgb}, ${isDark ? '0.08' : '0.16'})`,
                fontWeight: isElite ? 700 : 500,
              }}>
              {isElite && <Crown className="w-2.5 h-2.5" strokeWidth={2} style={{ color: isDark ? '#e8c87a' : '#a9802a' }} />}
              {type.level}
            </span>
            {isPremium && !isElite && (
              <Sparkle className="w-3 h-3" strokeWidth={1.5} style={{ color: accentColor, fill: `rgba(${accentRgb}, 0.3)` }} />
            )}
            {admitsMultiple && (
              <Users className="w-3 h-3" strokeWidth={2} style={{ color: accentColor }} />
            )}
            {savingsPct > 0 && (
              <span className="text-[9px] tracking-[1.2px] uppercase flex-shrink-0"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? 'rgba(214,249,5,0.75)' : '#4a5800' }}>
                Save {savingsPct}%
              </span>
            )}
          </div>
          {waitingList ? (
            <AppButton
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onJoinWaitlist?.(); }}
              className="flex-shrink-0 text-[9px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-md cursor-pointer"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: accentColor,
                boxShadow: `0 0 0 1px rgba(${accentRgb}, ${isDark ? '0.4' : '0.5'})`,
                background: `rgba(${accentRgb}, ${isDark ? '0.12' : '0.16'})`,
              }}>
              Join Waitlist
            </AppButton>
          ) : soldOut ? (
            <span className="flex-shrink-0 text-[9px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-md"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                color: isDark ? 'rgba(255,110,100,0.95)' : 'rgba(190,18,60,0.9)',
                boxShadow: isDark
                  ? '0 0 0 1px rgba(248,113,113,0.35)'
                  : '0 0 0 1px rgba(190,18,60,0.4)',
                background: isDark
                  ? 'rgba(248,113,113,0.12)'
                  : 'rgba(248,113,113,0.1)',
              }}>
              Sold Out
            </span>
          ) : (
            <motion.div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                boxShadow: selected ? 'none' : `0 0 0 1.5px rgba(${accentRgb}, 0.3)`,
                backgroundColor: selected ? accentColor : 'transparent',
              }}
              animate={{ scale: selected ? [1, 1.15, 1] : 1 }}
              transition={{ duration: 0.3 }}>
              <AnimatePresence>
                {selected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                    <Check className="w-3 h-3" strokeWidth={2.75} style={{ color: isDark ? 'rgba(0,0,0,0.8)' : '#fff' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Name + price */}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-light tracking-[-0.2px] truncate min-w-0"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              ...(isPremium
                ? {
                    backgroundImage: isElite
                      ? (isDark ? 'linear-gradient(180deg, #f3ecff 0%, #b79bff 100%)' : 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)')
                      : (isDark ? 'linear-gradient(180deg, #fcf6ba 0%, #d4a017 100%)' : 'linear-gradient(180deg, #b8860b 0%, #875f06 100%)'),
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }
                : { color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.88)' }),
            }}>
            {type.name}
          </h3>
          <div className="flex items-baseline gap-1 flex-shrink-0">
            <span className="text-[18px] font-light tracking-[-0.3px] tabular-nums"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : 'rgba(0,0,0,0.88)' }}>
              {isFree ? 'Free' : Money.fromMinor(type.priceMinor, "ETB").formatNumber()}
            </span>
            {admitsMultiple && (
              <span className="text-[10px]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? `rgba(${accentRgb}, 0.55)` : mutedInk }}>
                / {admissionsPerUnit}
              </span>
            )}
          </div>
        </div>

        {/* Compact info subline */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-1.5 text-[10.5px] min-w-0"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? `rgba(${accentRgb}, 0.6)` : mutedInk }}>
            {/* No remaining count is fabricated: the backend serves only an
                `available` boolean (#54), so a tier never prints a fake "N left". */}
            {[
              admitsMultiple ? `Admits ${admissionsPerUnit}` : null,
              type.features?.[0]?.text ?? null,
            ].filter((text): text is string => !!text).map((text, i) => (
              <React.Fragment key={text}>
                {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
                <span className="truncate min-w-0">{text}</span>
              </React.Fragment>
            ))}
          </div>
          {type.features?.length > 1 && (
            <AppButton
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="flex-shrink-0 flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full cursor-pointer"
              style={{
                background: expanded ? `rgba(${accentRgb}, ${isDark ? '0.14' : '0.2'})` : `rgba(${accentRgb}, ${isDark ? '0.07' : '0.14'})`,
              }}>
              <span className="text-[10px] tracking-[0.3px] tabular-nums"
                style={{ fontFamily: "'Inter', sans-serif", color: accentColor, fontWeight: 500 }}>
                {expanded ? 'Hide' : `+${type.features.length - 1} perks`}
              </span>
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: `rgba(${accentRgb}, ${isDark ? '0.18' : '0.26'})` }}>
                <ChevronDown className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
              </motion.span>
            </AppButton>
          )}
        </div>

        {/* Early Bird countdown row */}
        {isEarlyBird && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <Flame className="w-3 h-3 flex-shrink-0" style={{ color: accentColor }} strokeWidth={2.25} />
            <span className="text-[9px] tracking-[1.5px] uppercase flex-shrink-0"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? `rgba(${accentRgb}, 0.65)` : accentInk }}>
              Ends in
            </span>
            <InlineCountdown expiresAt={type.expiresAt} accentColor={accentColor} accentRgb={accentRgb} />
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden">
              <div className="pt-3 mt-3 space-y-2"
                style={{ boxShadow: `inset 0 1px 0 rgba(${accentRgb}, 0.12)` }}>
                {type.features.map((feature: TicketTierFeature, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div style={{ color: isDark ? `rgba(${accentRgb}, 0.7)` : accentInk }}>
                      {React.cloneElement(feature.icon, { className: 'w-3 h-3', strokeWidth: 1.75 })}
                    </div>
                    <span className="text-[12px] font-light" style={{ color: isDark ? `rgba(${accentRgb}, 0.8)` : 'rgba(0,0,0,0.72)' }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shimmer sweep */}
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        <motion.div
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${accentRgb}, ${isPremium ? '0.06' : '0.03'}), transparent)`,
            width: '50%', height: '100%',
          }}
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
}
