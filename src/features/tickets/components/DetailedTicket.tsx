import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Share2, Download, ChevronRight, Sparkles, Send, Tag, Check, X, ArrowUpRight, FilePenLine, Plus, Car, Coffee, Gift, Heart, Package, Smartphone, ShoppingBag, Armchair, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { tierTheme } from '@/lib/utils/tierTheme';
import type { UserTicket } from '@/types';
import { TicketQRCode } from './TicketQRCode';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { copyText } from '@/lib/utils/clipboard';
import { toastError } from '@/lib/feedback';

const extraIconFor = { parking: Car, merchandise: Package, donation: Heart, food: Coffee, digital_addon: Smartphone, other: Gift, ticket: Gift } as const;

// Per-type accent, tinted translucently over whatever surface is behind it.
const extraStyleFor: Record<string, { rgb: string; label: string }> = {
  parking: { rgb: '96,165,250', label: 'Parking' },
  merchandise: { rgb: '167,139,250', label: 'Merch' },
  donation: { rgb: '244,63,94', label: 'Donation' },
  food: { rgb: '234,179,8', label: 'Food & Drink' },
  digital_addon: { rgb: '6,182,212', label: 'Digital' },
  other: { rgb: '132,155,10', label: 'Extra' },
  ticket: { rgb: '132,155,10', label: 'Ticket' },
};

/** Theme-aware surface + type tokens shared across the whole ticket view. */
function ticketTokens(isDark: boolean) {
  return {
    base: isDark ? '#0c0a18' : '#f4f3f9',
    panelBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,18,40,0.07)',
    panel: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.72)',
    text: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(20,18,40,0.92)',
    textSoft: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(20,18,40,0.6)',
    textMuted: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(20,18,40,0.45)',
    accent: isDark ? '#d6f905' : '#6f8a04',
    accentSoft: isDark ? 'rgba(214,249,5,0.8)' : 'rgba(90,112,4,0.9)',
  };
}

function ExtraCard({ item, index, isDark }: { item: import('@/types').SelectedEventProduct; index: number; isDark: boolean }) {
  const Icon = extraIconFor[item.type] ?? Gift;
  const s = extraStyleFor[item.type] ?? extraStyleFor.other;
  const t = ticketTokens(isDark);
  const accent = isDark ? `rgb(${s.rgb})` : `rgba(${s.rgb},1)`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative rounded-2xl p-3 flex items-center gap-2.5"
      style={{
        background: isDark ? `rgba(${s.rgb},0.09)` : 'rgba(255,255,255,0.78)',
        border: `1px solid rgba(${s.rgb},${isDark ? 0.2 : 0.22})`,
        backdropFilter: 'blur(20px)',
      }}>
      <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
        style={{ background: `rgba(${s.rgb},${isDark ? 0.16 : 0.13})`, color: accent }}>
        <Icon className="w-4 h-4" strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[8.5px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: accent, fontWeight: 600 }}>{s.label}</p>
        <p className="text-[12px] leading-tight truncate" style={{ fontFamily: "'Inter', sans-serif", color: t.text, fontWeight: 500 }}>{item.name}</p>
      </div>
      {item.quantity > 1 && (
        <span className="shrink-0 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full"
          style={{ fontFamily: "'Inter', sans-serif", color: accent, background: `rgba(${s.rgb},0.12)` }}>×{item.quantity}</span>
      )}
    </motion.div>
  );
}

function DetailRow({ icon, label, value, isDark, href }: { icon: React.ReactNode; label: string; value: string; isDark: boolean; href?: string }) {
  const t = ticketTokens(isDark);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5" style={{ color: t.textMuted }}>
        {icon}
        <span className="text-[10px] tracking-[1.5px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          {label}
        </span>
      </div>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-right truncate hover:underline" style={{ fontFamily: "'Inter', sans-serif", color: t.text }}>{value}</a> : <span className="text-[13px] text-right truncate" style={{ fontFamily: "'Inter', sans-serif", color: t.text }}>{value}</span>}
    </div>
  );
}

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'No preference';
  if (typeof value === 'string' && value.trim()) return value;
  return '—';
}

/* ═══════════════════════════════════════════════════════
   DETAILED TICKET (modal view)
   ═══════════════════════════════════════════════════════ */
export function DetailedTicket({ ticket, onClose, onTransfer, onShare, onResell, onEditAnswers, onAddExtras, onDownload, downloading = false, downloadDone = false, receivedFrom, receivedNote, footer, onClaim }: {
  ticket: UserTicket; onClose: () => void; onTransfer?: () => void; onShare?: () => void; onResell?: () => void; onEditAnswers?: () => void; onAddExtras?: () => void;
  onDownload?: () => void; downloading?: boolean; downloadDone?: boolean;
  /** Guest tickets only — "Save to my account" (#31 claim flow). */
  onClaim?: () => void;
  /** When this ticket arrived via a transfer, the sender's name (shown instead of "Purchased"). */
  receivedFrom?: string;
  /** Optional personal note that came with the transfer. */
  receivedNote?: string;
  /** Custom call-to-action area rendered below the actions (e.g. "Sign in to add to My Tickets"). */
  footer?: React.ReactNode;
}) {
  const secondaryActions = [
    onShare && { Icon: Share2, label: 'Share', action: onShare },
    onTransfer && { Icon: Send, label: 'Transfer', action: onTransfer },
    onResell && { Icon: Tag, label: 'Resell', action: onResell },
  ].filter(Boolean) as { Icon: typeof Share2; label: string; action: () => void }[];
  const { rgb } = useImageColor(ticket.image || '');
  const { isDark } = useTheme();
  const t = ticketTokens(isDark);
  const [zoomQR, setZoomQR] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Tier tag matches the ticket-type accents from the event/purchase page.
  const tt = tierTheme(ticket.ticketType, ticket.ticketLevel);
  const isVIP = tt.premium;
  const tier = { rgb: tt.rgb, color: isDark ? tt.bright : tt.ink, label: ticket.ticketType || 'Standard' };

  // Countdown
  const countdown = (() => {
    const ts = Date.parse(ticket.eventDate);
    if (isNaN(ts)) return null;
    const ms = ts - Date.now();
    const days = Math.ceil(ms / 86400000);
    if (days < 0) return { label: 'Event passed', tone: 'past' };
    if (days === 0) return { label: 'Tonight — show this at the gate', tone: 'live' };
    if (days === 1) return { label: 'Tomorrow', tone: 'soon' };
    if (days <= 7) return { label: `${days} days to go`, tone: 'soon' };
    return { label: `${days} days to go`, tone: 'future' };
  })();

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px]"
        style={{ background: t.base }}
      >
        {/* Poster-driven atmosphere — the artwork becomes the whole surface */}
        {ticket.image && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute inset-0"
              style={{
                backgroundImage: `url("${ticket.image}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: 'scale(1.4)',
                filter: isDark
                  ? 'blur(60px) saturate(1.5) brightness(0.8)'
                  : 'blur(70px) saturate(1.4) brightness(1.1)',
                opacity: isDark ? 0.5 : 0.32,
              }}
            />
            <div className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 95% 55% at 50% -8%, rgba(${rgb},${isDark ? 0.32 : 0.22}), transparent 62%),
                  radial-gradient(ellipse 70% 45% at 88% 70%, rgba(${rgb},${isDark ? 0.16 : 0.12}), transparent 60%)
                `,
              }}
            />
            <div className="absolute inset-0"
              style={{
                background: isDark
                  ? `linear-gradient(180deg, rgba(12,10,24,0.26) 0%, rgba(12,10,24,0.62) 40%, rgba(12,10,24,0.86) 72%, rgba(12,10,24,0.95) 100%)`
                  : `linear-gradient(180deg, rgba(244,243,249,0.42) 0%, rgba(244,243,249,0.68) 40%, rgba(244,243,249,0.86) 74%, rgba(244,243,249,0.94) 100%)`,
              }}
            />
          </div>
        )}

        {/* Header — poster thumbnail + tier + title */}
        <div className="relative px-5 sm:px-7 pt-5 sm:pt-7">
          <div className="flex items-start gap-4">
            {ticket.image && (
              <div className="relative shrink-0 w-[54px] h-[54px] sm:w-[64px] sm:h-[64px] rounded-2xl overflow-hidden"
                style={{ boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(20,18,40,0.14)' }}>
                <GlassReflection isDark={isDark} />
                <img src={ticket.image} alt="" className="relative z-10 w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="relative inline-flex items-center gap-1 overflow-hidden px-2 py-0.5 rounded-md text-[9px] tracking-[1.8px] uppercase"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: isDark ? `rgba(${tier.rgb},0.14)` : `rgba(${tier.rgb},0.18)`,
                  border: 'none',
                  color: tier.color,
                  fontWeight: 600,
                }}>
                <GlassReflection isDark={isDark} />
                {isVIP && <Sparkles className="relative z-10 w-2.5 h-2.5" strokeWidth={2.5} />}
                <span className="relative z-10">{tier.label}</span>
              </span>
              <h2 className="mt-2 text-[17px] sm:text-[21px] leading-tight font-light truncate"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", letterSpacing: '-0.3px', color: t.text }}>
                {ticket.eventName}
              </h2>
            </div>
            <AppButton whileTap={{ scale: 0.92 }} onClick={onClose}
              className="relative shrink-0 -mt-1 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
              style={{
                background: isDark ? 'rgba(12,10,24,0.5)' : 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px)',
              }}>
              <GlassReflection isDark={isDark} />
              <X className="relative z-10 w-4 h-4" strokeWidth={1.8} style={{ color: t.textSoft }} />
            </AppButton>
          </div>

          {/* Countdown */}
          {countdown && countdown.tone !== 'past' && (
            <div className="mt-4 flex items-center gap-2">
              {countdown.tone === 'live' ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#f43f5e' }}
                />
              ) : (
                <Clock className="w-3 h-3"
                  style={{ color: countdown.tone === 'soon' ? (isDark ? '#34d399' : '#0f9b6c') : t.textMuted }}
                  strokeWidth={2} />
              )}
              <span className="text-[11px] tracking-[1px] uppercase"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: countdown.tone === 'live' ? (isDark ? '#fda4af' : '#c2325a')
                    : countdown.tone === 'soon' ? (isDark ? '#6ee7b7' : '#0f9b6c')
                    : t.textMuted,
                  fontWeight: 500,
                }}>
                {countdown.label}
              </span>
            </div>
          )}
        </div>

        {/* QR — always light so it stays scannable */}
        <div className="relative px-5 sm:px-7 pt-5">
          <AppButton
            whileTap={{ scale: 0.99 }}
            onClick={() => setZoomQR(true)}
            className="relative w-full rounded-2xl p-4 sm:p-5 cursor-pointer flex items-center gap-4 sm:gap-5"
            style={{ background: '#fff', boxShadow: isDark ? 'none' : '0 12px 34px rgba(20,18,40,0.10)' }}
          >
            <div className="flex-shrink-0 w-[92px] h-[92px] sm:w-[110px] sm:h-[110px]">
              <TicketQRCode code={ticket.qrCode} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[9px] tracking-[2px] uppercase mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: '#9ca3af' }}>
                Scan at entry
              </p>
              <p className="text-[13px] font-light text-gray-700 leading-snug">
                {ticket.ticketType || 'Standard'}
              </p>
              <div className="flex items-center gap-1 mt-3 text-[10px] tracking-[1px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: '#6b7280' }}>
                <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
                <span>Enlarge</span>
              </div>
            </div>
          </AppButton>
        </div>

        {/* Divider between the QR and the trip details */}
        <div className="relative mx-5 sm:mx-7 mt-5 h-px" style={{ background: t.panelBorder }} />

        {/* Details — bare rows */}
        <div className="relative px-5 sm:px-7 pt-4 space-y-3.5">
          <DetailRow isDark={isDark} icon={<Calendar className="w-3.5 h-3.5" />} label="When"
            value={`${ticket.eventDate} · ${ticket.eventTime}`} />
          <DetailRow isDark={isDark} icon={<MapPin className="w-3.5 h-3.5" />} label="Where"
            value={ticket.venue} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.venue)}`} />
          {ticket.seat && (
            <DetailRow isDark={isDark} icon={<Armchair className="w-3.5 h-3.5" />} label="Seat"
              value={ticket.seat} />
          )}
          {!receivedFrom && (
            <DetailRow isDark={isDark} icon={<Tag className="w-3.5 h-3.5" />} label="Purchased"
              value={ticket.purchased} />
          )}
        </div>

        {/* Gift from the sender — a single clean block combining who sent it + their note */}
        {receivedFrom && (
          <div className="relative px-5 sm:px-7 pt-4">
            <div className="rounded-2xl p-4 flex items-start gap-3.5"
              style={{ background: isDark ? 'rgba(214,249,5,0.06)' : 'rgba(214,249,5,0.13)' }}>
              <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center"
                style={{ background: isDark ? 'rgba(214,249,5,0.14)' : 'rgba(214,249,5,0.35)', color: t.accent }}>
                <Gift className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] tracking-[1.6px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", color: t.accentSoft, fontWeight: 700 }}>
                  Gift from {receivedFrom}
                </p>
                <p className="text-[13px] leading-snug mt-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: receivedNote ? t.textSoft : t.text, fontWeight: receivedNote ? 400 : 500 }}>
                  {receivedNote ? `“${receivedNote}”` : 'Sent you this ticket — enjoy the event!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Extras */}
        {(ticket.addOns?.length || onAddExtras) ? (
          <section className="relative px-5 sm:px-7 pt-4">
            {ticket.addOns?.length ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-[10px] tracking-[1.6px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: t.accentSoft, fontWeight: 700 }}>Your extras</p>
                  {onAddExtras && (
                    <AppButton whileTap={{ scale: 0.96 }} onClick={onAddExtras}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] cursor-pointer"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#0a0a0a', background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', fontWeight: 600 }}>
                      <Plus className="w-3 h-3" strokeWidth={2.5} /> Add extras
                    </AppButton>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {ticket.addOns.map((item, i) => <ExtraCard key={item.productId} item={item} index={i} isDark={isDark} />)}
                </div>
              </>
            ) : (
              <AppButton whileTap={{ scale: 0.99 }} onClick={onAddExtras}
                className="relative w-full rounded-2xl overflow-hidden px-4 py-3.5 flex items-center gap-3.5 text-left cursor-pointer"
                style={{ background: t.panel, backdropFilter: 'blur(24px)' }}>
                <GlassReflection isDark={isDark} />
                <div className="relative z-10 flex items-center gap-3.5 w-full">
                <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center"
                  style={{
                    background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.22)',
                    color: t.accent,
                  }}>
                  <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-tight" style={{ fontFamily: "'Inter', sans-serif", color: t.text, fontWeight: 500 }}>Add extras</p>
                  <p className="text-[11px] leading-tight mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: t.textMuted }}>Parking, merch, food &amp; more</p>
                </div>
                <span className="shrink-0 w-7 h-7 rounded-full grid place-items-center"
                  style={{ background: isDark ? 'rgba(214,249,5,0.14)' : 'rgba(214,249,5,0.28)', color: t.accent }}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                </span>
                </div>
              </AppButton>
            )}
          </section>
        ) : null}

        {/* Responses — collapsed by default */}
        {ticket.customQuestions?.length ? (
          <section className="relative mx-5 sm:mx-7 mt-4 rounded-2xl overflow-hidden"
            style={{ background: t.panel, backdropFilter: 'blur(24px)' }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <AppButton
                type="button"
                onClick={() => setResponsesOpen((v) => !v)}
                aria-expanded={responsesOpen}
                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer">
                <motion.span animate={{ rotate: responsesOpen ? 90 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 inline-flex">
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} style={{ color: t.accentSoft }} />
                </motion.span>
                <p className="text-[10px] tracking-[1.6px] uppercase truncate" style={{ fontFamily: "'Inter', sans-serif", color: t.accentSoft, fontWeight: 700 }}>Your responses</p>
                <span className="shrink-0 text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: t.textMuted }}>{ticket.customQuestions.length}</span>
              </AppButton>
              {onEditAnswers && (
                <AppButton type="button" whileTap={{ scale: 0.96 }} onClick={onEditAnswers}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] cursor-pointer"
                  style={{ fontFamily: "'Inter', sans-serif", color: t.accent, background: isDark ? 'rgba(214,249,5,0.09)' : 'rgba(214,249,5,0.22)', fontWeight: 600 }}>
                  <FilePenLine className="w-3 h-3" strokeWidth={1.8} /> Edit
                </AppButton>
              )}
            </div>
            <AnimatePresence initial={false}>
              {responsesOpen && (
                <motion.dl
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden px-4 pb-3.5 space-y-2.5">
                  {ticket.customQuestions.map((question) => (
                    <div key={question.id} className="flex items-baseline justify-between gap-4">
                      <dt className="min-w-0 truncate text-[10.5px]" style={{ fontFamily: "'Inter', sans-serif", color: t.textMuted }}>{question.label}</dt>
                      <dd className="max-w-[58%] truncate text-right text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: t.text }}>{formatAnswer(ticket.answers?.[question.id])}</dd>
                    </div>
                  ))}
                </motion.dl>
              )}
            </AnimatePresence>
            </div>
          </section>
        ) : null}

        {/* Primary action: Download */}
        {onDownload && (
        <div className="relative px-5 sm:px-7 pt-5">
          <AppButton
            whileTap={{ scale: downloading ? 1 : 0.98 }}
            onClick={onDownload}
            disabled={downloading}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13.5px',
              letterSpacing: '0.3px',
              fontWeight: 600,
              background: downloadDone
                ? (isDark ? 'rgba(52,211,153,0.14)' : 'rgba(15,155,108,0.12)')
                : 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)',
              border: downloadDone ? `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(15,155,108,0.35)'}` : 'none',
              color: downloadDone ? (isDark ? '#34d399' : '#0b7c56') : '#0a0a0a',
            }}
          >
            {downloading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a' }}
                />
                Generating…
              </>
            ) : downloadDone ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Saved
              </>
            ) : (
              <>
                <Download className="w-4 h-4" strokeWidth={2} />
                Save for Offline
              </>
            )}
          </AppButton>
        </div>
        )}

        {/* Secondary actions — roomy stacked tiles */}
        {secondaryActions.length > 0 && (
          <div className="relative px-5 sm:px-7 pt-3 grid gap-3"
            style={{ gridTemplateColumns: `repeat(${secondaryActions.length}, minmax(0, 1fr))` }}>
            {secondaryActions.map(({ Icon, label, action }) => (
              <AppButton
                key={label}
                whileTap={{ scale: 0.96 }}
                onClick={action}
                className="relative rounded-2xl overflow-hidden py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: t.panel, backdropFilter: 'blur(24px)' }}>
                <GlassReflection isDark={isDark} />
                <span className="relative z-10 flex items-center justify-center gap-2">
                <Icon className="w-[18px] h-[18px]" style={{ color: t.textSoft }} strokeWidth={1.8} />
                <span className="text-[11.5px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: t.text }}>
                  {label}
                </span>
                </span>
              </AppButton>
            ))}
          </div>
        )}

        {/* Signed public view link — guest payment-refresh tickets only (#14).
            Lets a guest reopen/share the ticket from another device. */}
        {ticket.ticketViewUrl && (
          <div className="relative px-5 sm:px-7 pt-3">
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                void copyText(ticket.ticketViewUrl!).then((ok) => {
                  if (ok) {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 1800);
                  } else {
                    toastError(new Error('clipboard unavailable'), 'Couldn’t copy the link — long-press to copy it manually.');
                  }
                });
              }}
              className="relative w-full rounded-2xl overflow-hidden py-3 px-4 flex items-center gap-3 cursor-pointer"
              style={{ background: t.panel, backdropFilter: 'blur(24px)' }}>
              <GlassReflection isDark={isDark} />
              <ArrowUpRight className="relative z-10 w-[16px] h-[16px] flex-shrink-0" style={{ color: t.textSoft }} strokeWidth={1.8} />
              <span className="relative z-10 flex-1 min-w-0">
                <span className="block text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: t.text, fontWeight: 600 }}>
                  Ticket link
                </span>
                <span className="block truncate text-[10.5px]" style={{ fontFamily: "'Inter', sans-serif", color: t.textSoft }}>
                  Reopen or share this ticket from any device
                </span>
              </span>
              <span className="relative z-10 flex items-center gap-1 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: linkCopied ? t.accent : t.textSoft, fontWeight: 600 }}>
                {linkCopied && <Check className="w-3 h-3" strokeWidth={2.5} />}
                {linkCopied ? 'Copied' : 'Copy'}
              </span>
            </AppButton>
          </div>
        )}

        {/* Save-to-account — guest tickets only (#31 claim). */}
        {onClaim && (
          <div className="relative px-5 sm:px-7 pt-3">
            <AppButton
              whileTap={{ scale: 0.97 }}
              onClick={onClaim}
              className="relative w-full rounded-2xl overflow-hidden py-3.5 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #d9ff00, #d6f905)', color: '#0a0a0a' }}>
              <GlassReflection isDark={isDark} />
              <UserCheck className="relative z-10 w-[16px] h-[16px]" strokeWidth={2} />
              <span className="relative z-10 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                Save to my account
              </span>
            </AppButton>
          </div>
        )}

        {/* Custom footer (e.g. claim / account-linking CTA) */}
        {footer && <div className="relative px-5 sm:px-7 pt-3">{footer}</div>}

        <div className="pb-6 sm:pb-8" />
      </div>

      {/* Fullscreen QR zoom for entry scanning */}
      <AnimatePresence>
        {zoomQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomQR(false)}
            className="fixed inset-0 z-[140] flex flex-col items-center justify-center p-6 cursor-pointer"
            style={{ background: '#fff' }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className="flex flex-col items-center"
            >
              <p className="text-[10px] tracking-[3px] uppercase mb-6 text-gray-500"
                style={{ fontFamily: "'Inter', sans-serif" }}>
                Show this at the gate
              </p>
              <div className="w-[280px] h-[280px] flex items-center justify-center">
                <TicketQRCode code={ticket.qrCode} />
              </div>
              <p className="text-[14px] font-light tracking-[1px] text-gray-700 mt-6">{ticket.ticketType || 'Standard'}</p>
              <p className="text-[11px] tracking-[1px] uppercase mt-8 text-gray-400"
                style={{ fontFamily: "'Inter', sans-serif" }}>
                Tap anywhere to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
