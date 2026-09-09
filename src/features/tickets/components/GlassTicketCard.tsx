import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Share2, Download, ChevronDown, ChevronRight, Sparkles, Send, Tag, Check, Ticket as TicketIcon, ArrowRight, Compass, X, ArrowUpRight } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import { tierTheme } from '@/lib/utils/tierTheme';
import { EventDateBadge } from '@/components/EventDateBadge';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import type { UserTicket } from '@/types';

export function GlassTicketCard({ ticket, onClick }: { ticket: UserTicket; onClick: () => void }) {
  const tt = tierTheme(ticket.ticketType, ticket.ticketLevel);
  const isVIP = tt.premium;
  const { rgb } = useImageColor(ticket.image || '');
  const { isDark } = useTheme();

  const countdown = (() => {
    const ts = Date.parse(ticket.eventDate);
    if (isNaN(ts)) return null;
    const days = Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Past', tone: 'past' as const };
    if (days === 0) return { label: 'Tonight', tone: 'live' as const };
    if (days === 1) return { label: 'Tomorrow', tone: 'soon' as const };
    if (days <= 7) return { label: `${days} days`, tone: 'soon' as const };
    return { label: `${days} days`, tone: 'future' as const };
  })();

  const tier = { color: tt.bright, rgb: tt.rgb, label: ticket.ticketType || 'Standard' };


  const countdownStyle = (() => {
    if (!countdown) return { bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.6)', border: 'transparent' };
    if (countdown.tone === 'live') return { bg: 'rgba(244,63,94,0.14)', fg: '#fda4af', border: 'rgba(244,63,94,0.32)' };
    if (countdown.tone === 'soon') return { bg: 'rgba(52,211,153,0.12)', fg: '#6ee7b7', border: 'rgba(52,211,153,0.28)' };
    if (countdown.tone === 'past') return { bg: 'rgba(255,255,255,0.04)', fg: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.08)' };
    return isDark
      ? { bg: 'rgba(214,249,5,0.08)', fg: 'rgba(214,249,5,0.85)', border: 'rgba(214,249,5,0.22)' }
      : { bg: '#d6f905', fg: '#0a0a0a', border: 'rgba(0,0,0,0.08)' };
  })();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="relative cursor-pointer group rounded-[22px] overflow-hidden"
      style={{
        background: isDark ? '#101010' : '#fff',
        border: 'none',
        boxShadow: isDark
          ? `0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.6)`
          : `0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 24px -16px rgba(0,0,0,0.18)`,
      }}
    >
      <GlassReflection isDark={isDark} />
      {/* Accent line — pulled from image color */}
      <div
        className="absolute z-10 left-0 top-0 bottom-0 w-[3px]"
        style={{ background: `rgb(${rgb})`, opacity: 0.85 }}
      />

      <div className="relative z-10 flex gap-0">
        {/* Image — left */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 132, aspectRatio: '1/1' }}>
          {ticket.image ? (
            <>
              <img
                src={ticket.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.5) 100%)' }}
              />
            </>
          ) : (
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, rgba(${rgb},0.35), rgba(217,255,0,0.15))` }} />
          )}

          {/* Shared date badge — same footprint as the former ticket-card badge. */}
          <EventDateBadge
            date={ticket.eventDate}
            accentRgb={rgb}
            size="featured"
            className="absolute top-2.5 left-2.5 scale-[1.12] origin-top-left rounded-[1px]"
          />

        </div>

        {/* Content — right */}
        <div className="flex-1 min-w-0 flex flex-col justify-between px-4 py-3.5">
          {/* Title + meta */}
          <div className="min-w-0">
            <h3
              className="text-[16px] tracking-[-0.2px] leading-[1.15] line-clamp-2 mb-1.5"
              style={{
                fontFamily: "'Zalando Sans Expanded', sans-serif",
                color: isDark ? '#ffffff' : '#0a0a0a',
                fontWeight: 400,
              }}
            >
              {ticket.eventName}
            </h3>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 flex-shrink-0" strokeWidth={2}
                  style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }} />
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.venue)}`} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-[11px] truncate hover:underline"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
                  }}>
                  {ticket.venue}
                </a>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={2}
                  style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
                <span className="text-[11px] truncate"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
                  }}>
                  {ticket.eventDate} · {ticket.eventTime}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom row — QR ref + countdown + CTA */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3"
            style={{ borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative w-5 h-5 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDark ? 'rgba(214,249,5,0.12)' : '#d6f905',
                }}>
                <GlassReflection isDark={isDark} />
                <TicketIcon className="relative z-10 w-2.5 h-2.5" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={2} />
              </div>
              <span className="text-[10px] tracking-[1px] truncate max-w-[92px]"
                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                {tier.label}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {countdown && (
                <span
                  className="relative inline-flex items-center gap-1 overflow-hidden text-[9px] tracking-[1.2px] uppercase px-2 py-1 rounded-full"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    background: countdownStyle.bg,
                    color: countdownStyle.fg,
                    border: 'none',
                  }}
                >
                  <GlassReflection isDark={isDark} />
                  {countdown.tone === 'live' && (
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="relative z-10 w-1 h-1 rounded-full"
                      style={{ background: countdownStyle.fg }}
                    />
                  )}
                  <span className="relative z-10">{countdown.label}</span>
                </span>
              )}
              <motion.div
                whileHover={{ scale: 1.08, rotate: -8 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: isDark ? '#d6f905' : '#0a0a0a',
                  color: isDark ? '#0a0a0a' : '#fff',
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.75} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
