import { motion, AnimatePresence } from 'motion/react';
import { Check, X, HelpCircle, Users, Plus, Minus, Sparkles, CalendarCheck, UserPlus, CalendarPlus, Send, Copy, MessageCircle, Mail, Phone, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import type { CustomQuestion, RsvpStatus } from '@/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { disabledSurface, disabledInk } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { registrationModule, type SchemaQuestion, type ConsentDocument } from '@/lib/registration';
import { mapApiError } from '@/lib/errors';
import { copyText } from '@/lib/utils/clipboard';
import { toastError, toastSuccess } from '@/lib/feedback';

interface RsvpSectionProps {
  event: any;
  status: RsvpStatus;
  onStatusChange: (s: RsvpStatus) => void;
  guests: number;
  onGuestsChange: (n: number) => void;
  onRegister: () => void;
  onRequestAuth: () => void;
}

const ATTENDEE_GRADIENTS = [
  'linear-gradient(135deg, #1a1a1a 0%, #d6f905 100%)',
  'linear-gradient(135deg, #d6f905 0%, #ec4899 100%)',
  'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
  'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #fb923c 0%, #d6f905 100%)',
  'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
];

const ATTENDEE_NAMES = [
  'Selam', 'Dawit', 'Hanna', 'Yonas', 'Mahlet', 'Eyob',
  'Tigist', 'Bereket', 'Liya', 'Naod', 'Saron', 'Abel',
];

function buildIcsDataUri(event: any): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const toIcsDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const start = new Date(`${event.date} ${event.time || '19:00'}`);
  const startSafe = isNaN(start.getTime()) ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : start;
  const endSafe = new Date(startSafe.getTime() + 3 * 60 * 60 * 1000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Digis//RSVP//EN',
    'BEGIN:VEVENT',
    `UID:${(event.name || 'event').replace(/\s+/g, '-').toLowerCase()}-${startSafe.getTime()}@digis`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(startSafe)}`,
    `DTEND:${toIcsDate(endSafe)}`,
    `SUMMARY:${event.name || 'Event'}`,
    `LOCATION:${event.venue || ''}`,
    `DESCRIPTION:You're going to ${event.name || 'this event'} on Digis.`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function buildShareUrl(event: any): string {
  const slug = (event.name || 'event').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `https://digis.events/e/${slug}`;
}

export function RsvpSection({ event, status, onStatusChange, guests, onGuestsChange, onRegister, onRequestAuth }: RsvpSectionProps) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [calAdded, setCalAdded] = useState(false);
  const accent = isDark ? '#d6f905' : '#d6f905';
  const accentRgb = isDark ? '214,249,5' : '214,249,5';

  // Backend values render as-is — absent data is never fabricated (a missing
  // rsvp_capacity/rsvp_going is not 500/287).
  const capacity: number | undefined = event.rsvpCapacity;
  const baseGoing: number | undefined = event.rsvpGoing;
  const hasCapacity = typeof capacity === 'number';
  const allowsPlusOne: boolean = event.allowsPlusOne ?? true;
  const maxGuests: number = event.maxGuests ?? 3;

  const myCount = status === 'going' ? 1 + guests : 0;
  const totalGoing = baseGoing != null
    ? baseGoing + myCount
    : (myCount > 0 ? myCount : undefined);
  const filledPct = hasCapacity && totalGoing != null
    ? Math.min(100, (totalGoing / capacity) * 100)
    : undefined;
  const spotsLeft = hasCapacity && totalGoing != null
    ? Math.max(0, capacity - totalGoing)
    : undefined;
  const isFull = spotsLeft === 0;
  const isAlmostFull = spotsLeft != null && spotsLeft > 0 && spotsLeft <= capacity * 0.1;

  const attendees = useMemo(() => {
    return ATTENDEE_NAMES.slice(0, 6).map((n, i) => ({
      name: n,
      gradient: ATTENDEE_GRADIENTS[i % ATTENDEE_GRADIENTS.length],
      initial: n[0],
    }));
  }, []);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, rgba(${accentRgb},0.2), transparent)` }} />
        <h2 className="text-[12px] tracking-[3px] uppercase" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? `rgba(${accentRgb},0.7)` : '#0a0a0a' }}>
          RSVP
        </h2>
        <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, rgba(${accentRgb},0.2), transparent)` }} />
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-7">
        <Sparkles className="w-3 h-3" style={{ color: isDark ? accent : "#0a0a0a" }} strokeWidth={2} />
        <span className="text-[10px] tracking-[1.5px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
          Free event · Reserve your spot
        </span>
      </div>

      {/* Capacity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="relative rounded-3xl overflow-hidden mb-4"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}>
        <GlassReflection isDark={isDark} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, rgba(${accentRgb},0.08), transparent 50%)` }} />

        <div className="relative z-10 p-5">
          {hasCapacity ? (
            <>
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-[28px] leading-none"
                      style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                      {(totalGoing ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[13px]"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                      / {capacity.toLocaleString()} going
                    </span>
                  </div>
                  <span className="text-[10px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                    {isFull ? 'At capacity · Waitlist open' : isAlmostFull ? `Only ${spotsLeft} spots left` : `${spotsLeft} spots remaining`}
                  </span>
                </div>

                {/* Pulse status chip */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: isFull
                      ? (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)')
                      : isAlmostFull
                        ? (isDark ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.08)')
                        : `rgba(${accentRgb},0.1)`,
                    border: `1px solid ${isFull
                      ? 'rgba(239,68,68,0.25)'
                      : isAlmostFull ? 'rgba(251,146,60,0.25)' : `rgba(${accentRgb},0.22)`}`,
                  }}>
                  <motion.span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isFull ? '#ef4444' : isAlmostFull ? '#fb923c' : accent }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
                  <span className="text-[9px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif",
                      color: isFull ? '#ef4444' : isAlmostFull ? '#fb923c' : accent }}>
                    {isFull ? 'Full' : isAlmostFull ? 'Filling fast' : 'Open'}
                  </span>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="relative h-2 rounded-full overflow-hidden mb-4"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${filledPct}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    background: isFull
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : isAlmostFull
                        ? 'linear-gradient(90deg, #fb923c, #fbbf24)'
                        : `linear-gradient(90deg, rgba(${accentRgb},0.6), ${accent})`,
                  }} />
              </div>
            </>
          ) : (
            <p className="text-[13px] mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
              Reserve your spot — free entry.
            </p>
          )}

          {/* Attendee preview */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {attendees.map((a, i) => (
                <motion.div key={a.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: a.gradient,
                    border: `2px solid ${isDark ? '#0e0e14' : '#fff'}`,
                    zIndex: 10 - i,
                  }}>
                  <span className="text-[11px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>
                    {a.initial}
                  </span>
                </motion.div>
              ))}
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `2px solid ${isDark ? '#0e0e14' : '#fff'}`,
                }}>
                <span className="text-[9px] tracking-[0.5px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                  +{Math.max(0, totalGoing - attendees.length)}
                </span>
              </div>
            </div>
            <p className="text-[11px] flex-1"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              <span style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{attendees[0].name}</span>, {attendees[1].name} and {Math.max(0, totalGoing - 2)} others are going
            </p>
          </div>
        </div>
      </motion.div>

      {/* RSVP pill selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
        className="relative rounded-3xl overflow-hidden p-1.5 grid grid-cols-3 gap-1.5 mb-4"
        style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}>
        <GlassReflection isDark={isDark} />
        <RsvpPill
          label="Going" icon={<Check className="w-4 h-4" strokeWidth={2.5} />}
          active={status === 'going'} accent={accent} accentRgb={accentRgb}
          onClick={() => status === 'going' ? onStatusChange(null) : onRegister()} isDark={isDark} />
        <RsvpPill
          label="Maybe" icon={<HelpCircle className="w-4 h-4" strokeWidth={2.25} />}
          active={status === 'maybe'} accent={accent} accentRgb={accentRgb} neutral
          onClick={() => isAuthenticated ? onStatusChange(status === 'maybe' ? null : 'maybe') : onRequestAuth()} isDark={isDark} />
        <RsvpPill
          label="Can't go" icon={<X className="w-4 h-4" strokeWidth={2.5} />}
          active={status === 'declined'} accent={accent} accentRgb={accentRgb} neutral
          onClick={() => isAuthenticated ? onStatusChange(status === 'declined' ? null : 'declined') : onRequestAuth()} isDark={isDark} />
      </motion.div>

      {/* Plus-one stepper */}
      <AnimatePresence initial={false}>
        {status === 'going' && allowsPlusOne && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}>
            <div className="relative rounded-3xl overflow-hidden p-4 flex items-center gap-3"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              }}>
              <GlassReflection isDark={isDark} />
              <div className="relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `rgba(${accentRgb},0.1)`,
                  border: `1px solid rgba(${accentRgb},0.18)`,
                }}>
                <UserPlus className="w-4 h-4" style={{ color: isDark ? accent : "#0a0a0a" }} strokeWidth={2} />
              </div>
              <div className="relative z-10 flex-1 min-w-0">
                <p className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 500 }}>
                  Bringing guests?
                </p>
                <p className="text-[11px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                  Up to {maxGuests} additional guest{maxGuests > 1 ? 's' : ''}
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-1 overflow-hidden p-1 rounded-full"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}>
                <GlassReflection isDark={isDark} />
                <AppButton whileTap={{ scale: 0.9 }}
                  onClick={() => onGuestsChange(Math.max(0, guests - 1))}
                  disabled={guests <= 0}
                  className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center disabled:cursor-not-allowed"
                  style={{ background: 'transparent' }}>
                  <Minus className="w-3 h-3" style={{ color: guests <= 0 ? disabledInk(isDark) : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') }} strokeWidth={2.5} />
                </AppButton>
                <span className="relative z-10 w-5 text-center text-[13px] tabular-nums"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                  {guests}
                </span>
                <AppButton whileTap={{ scale: 0.9 }}
                  onClick={() => onGuestsChange(Math.min(maxGuests, guests + 1))}
                  disabled={guests >= maxGuests}
                  className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center disabled:cursor-not-allowed"
                  style={guests >= maxGuests ? disabledSurface(isDark) : { background: accent }}>
                  <Plus className="w-3 h-3" style={{ color: guests >= maxGuests ? disabledInk(isDark) : (isDark ? '#000' : '#fff') }} strokeWidth={2.5} />
                </AppButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation banner */}
      <AnimatePresence initial={false}>
        {status === 'going' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            className="relative rounded-3xl p-4 overflow-hidden"
            style={{
              background: isDark
                ? `linear-gradient(135deg, rgba(${accentRgb},0.1) 0%, rgba(${accentRgb},0.04) 100%)`
                : `linear-gradient(135deg, rgba(${accentRgb},0.08) 0%, rgba(${accentRgb},0.02) 100%)`,
              border: `1px solid rgba(${accentRgb},0.22)`,
            }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: accent }}>
                <CalendarCheck className="w-4 h-4" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] mb-0.5"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 600 }}>
                  You're going{guests > 0 ? ` with ${guests} guest${guests > 1 ? 's' : ''}` : ''}
                </p>
                <p className="text-[11px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
                  We'll send a reminder the day before
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <motion.a
                href={buildIcsDataUri(event)}
                download={`${(event.name || 'event').replace(/\s+/g, '-').toLowerCase()}.ics`}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setCalAdded(true); setTimeout(() => setCalAdded(false), 2200); }}
                className="relative flex items-center justify-center gap-2 overflow-hidden py-2.5 rounded-2xl cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}>
                <GlassReflection isDark={isDark} />
                {calAdded ? (
                  <Check className="relative z-10 w-3.5 h-3.5" style={{ color: isDark ? accent : "#0a0a0a" }} strokeWidth={2.5} />
                ) : (
                  <CalendarPlus className="relative z-10 w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }} strokeWidth={2} />
                )}
                <span className="relative z-10 text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif",
                    color: calAdded ? accent : (isDark ? '#fff' : '#1a1a1a'), fontWeight: 500 }}>
                  {calAdded ? 'Added' : 'Add to Calendar'}
                </span>
              </motion.a>
              <AppButton
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowShare(true)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl cursor-pointer"
                style={{
                  background: accent,
                  color: isDark ? '#000' : '#fff',
                }}>
                <Send className="w-3.5 h-3.5" strokeWidth={2.25} />
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                  Invite Friends
                </span>
              </AppButton>
            </div>
          </motion.div>
        )}
        {status === 'maybe' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="relative rounded-3xl overflow-hidden p-4 flex items-start gap-3"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <HelpCircle className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)' }} strokeWidth={2} />
            </div>
            <div className="relative z-10 flex-1">
              <p className="text-[13px] mb-0.5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 500 }}>
                Marked as maybe
              </p>
              <p className="text-[11px]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                We'll nudge you a few days out so you can decide
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share bottom sheet */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowShare(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden"
              style={{
                background: isDark ? '#101010' : '#fff',
              }}>
              <GlassReflection isDark={isDark} />
              {/* Drag handle */}
              <div className="relative z-10 flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full"
                  style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
              </div>

              <div className="relative z-10 px-6 pt-3 pb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[18px] leading-tight"
                    style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
                    Invite friends
                  </h3>
                  <AppButton onClick={() => setShowShare(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} strokeWidth={2} />
                  </AppButton>
                </div>
                <p className="text-[12px] mb-5"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                  Invite people who belong in the room — they’ll RSVP with their own details.
                </p>

                {/* Digis invites are account-only; external sharing remains available to guests. */}
                {isAuthenticated ? (
                  <div className="mb-4">
                    <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                      Suggested friends
                    </p>
                    <div className="space-y-1">
                      {[
                        { name: 'Selam Tadesse', handle: '@selamt', gradient: 'linear-gradient(135deg, #1a1a1a 0%, #d6f905 100%)' },
                        { name: 'Dawit Mekonnen', handle: '@dawitm', gradient: 'linear-gradient(135deg, #d6f905 0%, #ec4899 100%)' },
                        { name: 'Hanna Bekele', handle: '@hannab', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
                        { name: 'Yonas Girma', handle: '@yonasg', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' },
                      ].map((f) => (
                        <FriendRow key={f.handle} friend={f} accent={accent} accentRgb={accentRgb} isDark={isDark} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <AppButton
                    type="button"
                    onClick={() => { setShowShare(false); onRequestAuth(); }}
                    className="w-full mb-4 flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left"
                    style={{ background: isDark ? 'rgba(214,249,5,0.07)' : 'rgba(214,249,5,0.12)' }}
                  >
                    <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: isDark ? 'rgba(214,249,5,0.13)' : 'rgba(255,255,255,0.72)' }}>
                      <UserPlus className="w-4 h-4" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 600 }}>Invite friends on Digis</span>
                      <span className="block text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.5)' }}>Sign in to find and invite your friends.</span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
                  </AppButton>
                )}

                {/* Channels */}
                <p className="text-[10px] tracking-[1.5px] uppercase mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  Or share via
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <ShareChannel
                    label="WhatsApp" icon={<MessageCircle className="w-4 h-4" strokeWidth={2} />} color="#25D366"
                    href={`https://wa.me/?text=${encodeURIComponent(`Going to ${event.name}! ${buildShareUrl(event)}`)}`}
                    isDark={isDark} />
                  <ShareChannel
                    label="Telegram" icon={<Send className="w-4 h-4" strokeWidth={2} />} color="#229ED9"
                    href={`https://t.me/share/url?url=${encodeURIComponent(buildShareUrl(event))}&text=${encodeURIComponent(`Going to ${event.name}!`)}`}
                    isDark={isDark} />
                  <ShareChannel
                    label="More" icon={<Share2Icon />} color={accent}
                    onClick={() => {
                      const url = buildShareUrl(event);
                      if (navigator.share) {
                        // The user can dismiss the share sheet — not an error.
                        navigator.share({ title: event.name, url }).catch(() => {});
                      } else {
                        // No Web Share support: fall back to copy, with feedback.
                        void copyText(url).then((ok) => {
                          if (ok) toastSuccess('Link copied.');
                          else toastError(new Error('clipboard unavailable'), 'Couldn’t share or copy the link.');
                        });
                      }
                    }}
                    isDark={isDark} />
                </div>

                {/* Copy link */}
                <AppButton
                  onClick={() => {
                    void copyText(buildShareUrl(event)).then((ok) => {
                      if (ok) {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      } else {
                        toastError(new Error('clipboard unavailable'), 'Couldn’t copy the link — long-press to copy it manually.');
                      }
                    });
                  }}
                  className="relative w-full flex items-center gap-3 overflow-hidden px-4 py-3 rounded-2xl cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  }}>
                  <GlassReflection isDark={isDark} />
                  <Copy className="relative z-10 w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }} strokeWidth={2} />
                  <span className="relative z-10 flex-1 truncate text-[12px] text-left"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>
                    {buildShareUrl(event)}
                  </span>
                  <span className="relative z-10 text-[11px] tracking-[0.5px]"
                    style={{ fontFamily: "'Inter', sans-serif",
                      color: copied ? accent : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                      fontWeight: 600 }}>
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust footer */}
      <div className="flex items-center justify-center gap-2 mt-6 mb-2">
        <Users className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }} strokeWidth={2} />
        <p className="text-[10px] tracking-[1.2px] uppercase"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          Your name appears on the guest list
        </p>
      </div>
    </div>
  );
}

export function RsvpRegistrationSheet({ event, guests, ticketTypeId, onClose, onComplete, onRequestAuth }: {
  event: any;
  guests: number;
  /** The event's free RSVP ticket type id (from products — `ticket_type.id`). */
  ticketTypeId: string;
  onClose: () => void;
  onComplete: () => void;
  onRequestAuth?: () => void;
}) {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const requirements = event.rsvpRequirements ?? {};
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Public RSVP (#27) — guests prove phone ownership via OTP, then submit.
  const [otpStage, setOtpStage] = useState<'idle' | 'sending' | 'sent' | 'submitting'>('idle');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submitError, setSubmitError] = useState('');
  // Required answers come from the registration schema (backend validates
  // against the published form), not the event's rsvp_requirements display
  // copy — fetch the form version + questions like paid checkout does.
  const [schemaQuestions, setSchemaQuestions] = useState<SchemaQuestion[]>([]);
  const [formVersionId, setFormVersionId] = useState<string>();
  // Required consent documents (public schema) — must be accepted before submit.
  const [consents, setConsents] = useState<ConsentDocument[]>([]);
  const [acceptedConsentIds, setAcceptedConsentIds] = useState<string[]>([]);
  const [consentError, setConsentError] = useState('');
  // These fetches are advisory for layout, but a failed terms fetch MUST be
  // visible — otherwise the user submits with no way to accept the terms and
  // only sees a server rejection.
  const [consentsLoadError, setConsentsLoadError] = useState(false);
  const [schemaLoadError, setSchemaLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.46)';
  const surface = isDark ? '#101115' : '#fff';
  const requireName = requirements.requireName !== false;
  const requireEmail = Boolean(requirements.requireEmail);
  // Guests must verify a phone for the OTP even when the organizer didn't ask
  // for one — the public RSVP endpoint keys identity on the phone.
  const requirePhone = isAuthenticated ? Boolean(requirements.requirePhone) : true;
  const slug = event.slug ?? '';

  useEffect(() => {
    if (!slug || !ticketTypeId) return;
    let alive = true;
    setConsentsLoadError(false);
    setSchemaLoadError(false);
    registrationModule.fetchRegistrationSchema(slug, ticketTypeId)
      .then((schema) => {
        if (!alive || !schema) return;
        setFormVersionId(schema.forms[0]?.id);
        setSchemaQuestions(schema.forms[0]?.questions ?? []);
      })
      .catch(() => { if (alive) setSchemaLoadError(true); });
    registrationModule.fetchConsentRequirements(slug, ticketTypeId)
      .then((docs) => { if (alive) setConsents(docs); })
      .catch(() => { if (alive) setConsentsLoadError(true); });
    return () => { alive = false; };
  }, [slug, ticketTypeId, reloadKey]);

  const requiredConsents = consents.filter((c) => c.required);
  const toggleConsent = (versionId: string) => {
    setAcceptedConsentIds((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId]);
    setConsentError('');
  };

  const schemaAsCustom: CustomQuestion[] = schemaQuestions.map((q) => ({
    id: q.key ?? q.id,
    type: q.type === 'long_text' ? 'textarea' : q.type === 'short_text' ? 'text' : q.type as CustomQuestion['type'],
    label: q.label,
    required: q.required,
    options: Array.isArray(q.options) ? q.options as string[] : undefined,
  }));
  const questions: CustomQuestion[] = schemaQuestions.length > 0
    ? schemaAsCustom
    : (requirements.questions ?? []);
  const organizerFields = questions.length > 0 || requireEmail || requirePhone;

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (requireName && name.trim().length < 2) next.name = 'Add the name for the guest list.';
    if (requireEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Add a valid email address.';
    if (requirePhone && phone.replace(/\D/g, '').length < 9) next.phone = 'Add a valid phone number.';
    questions.forEach((question) => {
      const value = answers[question.id];
      const empty = Array.isArray(value) ? value.length === 0 : !value?.trim();
      if (question.required && empty) next[question.id] = 'This response is required.';
    });
    const missingConsents = requiredConsents.filter((c) => !acceptedConsentIds.includes(c.versionId));
    if (missingConsents.length > 0) {
      next.consents = 'Please accept the event’s terms to continue.';
      setConsentError('Please accept the event’s terms to continue.');
    } else {
      setConsentError('');
    }
    return next;
  };

  const collectedAnswers = () =>
    questions.map((question) => ({
      questionKey: question.id,
      value: answers[question.id] ?? '',
      ...(formVersionId ? { formVersionId } : {}),
    }));

  const acceptedConsents = () =>
    consents
      .filter((c) => acceptedConsentIds.includes(c.versionId))
      .map((c) => ({ consentDocumentVersionId: c.versionId, contentSha256: c.contentSha256 }));

  const submitRsvp = async (verificationToken?: string) => {
    setSubmitError('');
    setOtpStage('submitting');
    try {
      await registrationModule.rsvpSubmit(slug, ticketTypeId, {
        ...(isAuthenticated ? {} : { phone, verificationToken }),
        packageQuantity: 1 + guests,
        answers: collectedAnswers(),
        consents: acceptedConsents(),
      });
      onComplete();
    } catch (err) {
      setSubmitError(mapApiError(err));
      setOtpStage(verificationToken ? 'sent' : 'idle');
    }
  };

  const sendCode = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitError('');
    setOtpStage('sending');
    try {
      const { challengeId: id } = await registrationModule.rsvpRequestOtp(slug, ticketTypeId, phone);
      setChallengeId(id);
      setOtpStage('sent');
    } catch (err) {
      setSubmitError(mapApiError(err));
      setOtpStage('idle');
    }
  };

  const confirm = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (isAuthenticated) {
      await submitRsvp();
      return;
    }
    if (!challengeId) {
      setSubmitError('Something went wrong — please try again.');
      return;
    }
    if (otpCode.replace(/\D/g, '').length < 4) {
      setErrors((current) => ({ ...current, otp: 'Enter the 6-digit code we sent.' }));
      return;
    }
    try {
      const { verificationToken } = await registrationModule.verifyPhoneOtp(challengeId, otpCode);
      await submitRsvp(verificationToken);
    } catch (err) {
      setSubmitError(mapApiError(err));
      setOtpStage('sent');
    }
  };

  const setAnswer = (question: CustomQuestion, value: string | string[]) => {
    setAnswers((current) => ({ ...current, [question.id]: value }));
    setErrors((current) => ({ ...current, [question.id]: '' }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <motion.section
        initial={{ y: 44, opacity: 0, scale: 0.985 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 44, opacity: 0, scale: 0.985 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] sm:rounded-[28px]"
        style={{ background: surface }}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)' }} /></div>
        <div className="relative z-10 px-5 sm:px-6 pt-4 pb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl grid place-items-center" style={{ background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.16)' }}>
                  <UserCheck className="w-4 h-4" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={2} />
                </div>
                <span className="text-[10px] tracking-[1.8px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>RSVP registration</span>
              </div>
              <h3 className="text-[21px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>Reserve your place</h3>
              <p className="text-[12px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                {isAuthenticated && !organizerFields ? 'Your account is ready. Confirm and you’re on the list.' : `A few details requested by ${event.organizer ?? 'the organizer'}.`}
              </p>
            </div>
            <AppButton onClick={onClose} aria-label="Close RSVP registration" className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: muted }}><X className="w-4 h-4" /></AppButton>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl mb-4" style={{ background: isDark ? 'rgba(214,249,5,0.06)' : 'rgba(214,249,5,0.11)' }}>
              <div className="w-8 h-8 rounded-full grid place-items-center" style={{ background: isDark ? 'rgba(214,249,5,0.14)' : 'rgba(255,255,255,0.7)' }}><UserCheck className="w-3.5 h-3.5" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} /></div>
              <p className="text-[12px] flex-1" style={{ fontFamily: "'Inter', sans-serif", color: text }}><strong>{user?.name || 'Your account'}</strong> will be added to the guest list.</p>
            </div>
          )}

          <div className="space-y-3">
            {requireName && (!isAuthenticated || organizerFields || !user?.name) && <RsvpField icon={<UserCheck className="w-4 h-4" />} label="Name" value={name} onChange={(value) => { setName(value); setErrors((current) => ({ ...current, name: '' })); }} placeholder="Your full name" error={errors.name} isDark={isDark} />}
            {requireEmail && <RsvpField icon={<Mail className="w-4 h-4" />} label="Email" value={email} onChange={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: '' })); }} placeholder="you@example.com" error={errors.email} type="email" isDark={isDark} />}
            {requirePhone && <RsvpField icon={<Phone className="w-4 h-4" />} label="Phone" value={phone} onChange={(value) => { setPhone(value); setErrors((current) => ({ ...current, phone: '' })); }} placeholder="09xx xxx xxx" error={errors.phone} type="tel" isDark={isDark} />}
            {questions.map((question) => <RsvpQuestion key={question.id} question={question} value={answers[question.id]} onChange={(value) => setAnswer(question, value)} error={errors[question.id]} isDark={isDark} />)}
          </div>

          {(consentsLoadError || schemaLoadError) && (
            <div className="mt-4 rounded-2xl px-3.5 py-3"
              style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.25)' }}>
              <p className="text-[11.5px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>
                {consentsLoadError
                  ? 'Couldn’t load this event’s terms. Retry before continuing.'
                  : 'Couldn’t load this event’s questions. Retry before continuing.'}
              </p>
              <AppButton onClick={() => setReloadKey((k) => k + 1)}
                className="mt-2 text-[11.5px] underline cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a', fontWeight: 700 }}>
                Try again
              </AppButton>
            </div>
          )}

          {requiredConsents.length > 0 && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] tracking-[1.4px] uppercase mb-1 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>Terms</label>
              {requiredConsents.map((doc) => {
                const accepted = acceptedConsentIds.includes(doc.versionId);
                return (
                  <AppButton
                    key={doc.versionId}
                    type="button"
                    onClick={() => toggleConsent(doc.versionId)}
                    className="w-full flex items-start gap-3 px-3.5 py-3 rounded-2xl text-left"
                    style={{
                      background: accepted ? (isDark ? 'rgba(214,249,5,0.08)' : 'rgba(214,249,5,0.12)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                      border: `1px solid ${consentError && !accepted ? 'rgba(248,113,113,0.75)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                    }}
                  >
                    <span className="mt-0.5 w-4 h-4 rounded-[4px] border grid place-items-center flex-shrink-0"
                      style={{ borderColor: accepted ? '#d6f905' : muted, background: accepted ? '#d6f905' : 'transparent' }}>
                      {accepted && <Check className="w-3 h-3" style={{ color: '#0a0a0a' }} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                      {doc.title}
                    </span>
                  </AppButton>
                );
              })}
              {consentError && <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{consentError}</p>}
            </div>
          )}

          {!isAuthenticated && <div className="mt-4 flex items-center justify-between gap-3"><p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>No account required. We’ll use these details only for this event and its updates.</p>{onRequestAuth && <AppButton type="button" onClick={() => { onClose(); onRequestAuth(); }} className="shrink-0 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a', fontWeight: 700 }}>Sign in instead</AppButton>}</div>}
          {guests > 0 && <p className="mt-3 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>Your reservation includes {guests} guest{guests > 1 ? 's' : ''}.</p>}
          {!isAuthenticated && otpStage === 'sent' && (
            <div>
              <label className="text-[10px] tracking-[1.4px] uppercase mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>
                Verification code
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: muted }}><Phone className="w-4 h-4" /></span>
                <AppInput
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrors((current) => ({ ...current, otp: '' })); }}
                  placeholder="6-digit code"
                  className="w-full h-12 rounded-xl pl-10 pr-3.5 outline-none text-[13px] tracking-[0.3em]"
                  style={{ background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)', border: `1px solid ${errors.otp ? 'rgba(248,113,113,0.75)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`, color: text, fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              {errors.otp && <p className="mt-1.5 text-[10px]" style={{ color: '#f87171', fontFamily: "'Inter', sans-serif" }}>{errors.otp}</p>}
              <p className="mt-2 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                We sent a code to <span style={{ color: text }}>{phone}</span>.{' '}
                <AppButton type="button" onClick={sendCode} className="inline text-[11px] underline" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
                  Resend
                </AppButton>
              </p>
            </div>
          )}
          {submitError && <p className="mt-3 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{submitError}</p>}
          <AppButton
            onClick={confirm}
            disabled={otpStage === 'sending' || otpStage === 'submitting'}
            className="mt-5 w-full h-12 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#d6f905', color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13 }}
          >
            {isAuthenticated
              ? (isAuthenticated && !organizerFields ? 'Confirm RSVP' : 'Reserve my spot')
              : otpStage === 'sent'
                ? 'Confirm RSVP'
                : 'Send code'} <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
          </AppButton>
        </div>
      </motion.section>
    </motion.div>
  );
}

function RsvpField({ icon, label, value, onChange, placeholder, error, type = 'text', isDark }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: string; type?: string; isDark: boolean }) {
  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)';
  return <div><label className="text-[10px] tracking-[1.4px] uppercase mb-1.5 block" style={{ fontFamily: "'Inter', sans-serif", color: muted, fontWeight: 700 }}>{label}</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: muted }}>{icon}</span><AppInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full h-12 rounded-xl pl-10 pr-3.5 outline-none text-[13px]" style={{ background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)', border: `1px solid ${error ? 'rgba(248,113,113,0.75)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`, color: text, fontFamily: "'Inter', sans-serif" }} /></div>{error && <p className="flex items-center gap-1 mt-1.5 text-[10px]" style={{ color: '#f87171', fontFamily: "'Inter', sans-serif" }}><AlertCircle className="w-3 h-3" />{error}</p>}</div>;
}

function RsvpQuestion({ question, value, onChange, error, isDark }: { key?: React.Key; question: CustomQuestion; value: string | string[] | undefined; onChange: (value: string | string[]) => void; error?: string; isDark: boolean }) {
  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)';
  const inputStyle: React.CSSProperties = { background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)', border: `1px solid ${error ? 'rgba(248,113,113,0.75)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`, color: text, fontFamily: "'Inter', sans-serif" };
  const label = <label className="text-[12px] block mb-1" style={{ fontFamily: "'Inter', sans-serif", color: text, fontWeight: 600 }}>{question.label}{question.required && <span style={{ color: '#f87171' }}> *</span>}{question.helper && <span className="block text-[10.5px] font-normal mt-0.5" style={{ color: muted }}>{question.helper}</span>}</label>;
  const errorLine = error && <p className="mt-1.5 text-[10px]" style={{ color: '#f87171', fontFamily: "'Inter', sans-serif" }}>{error}</p>;
  if (question.type === 'select') return <div>{label}<select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} className="w-full h-12 rounded-xl px-3 outline-none text-[13px]" style={inputStyle}><option value="">{question.placeholder ?? 'Choose one'}</option>{question.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>{errorLine}</div>;
  if (question.type === 'radio') return <div>{label}<div className="grid gap-2">{question.options?.map((option) => { const selected = value === option; return <AppButton type="button" key={option} onClick={() => onChange(option)} className="h-11 px-3 rounded-xl text-left flex items-center gap-2" style={{ ...inputStyle, background: selected ? (isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.13)') : inputStyle.background }}><span className="w-4 h-4 rounded-full border grid place-items-center" style={{ borderColor: selected ? '#d6f905' : muted }}>{selected && <span className="w-2 h-2 rounded-full" style={{ background: '#d6f905' }} />}</span><span className="text-[12px]">{option}</span></AppButton>; })}</div>{errorLine}</div>;
  if (question.type === 'checkbox') { const selected = Array.isArray(value) ? value : []; return <div>{label}<div className="grid gap-2">{question.options?.map((option) => { const checked = selected.includes(option); return <AppButton type="button" key={option} onClick={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])} className="h-11 px-3 rounded-xl text-left flex items-center gap-2" style={{ ...inputStyle, background: checked ? (isDark ? 'rgba(214,249,5,0.1)' : 'rgba(214,249,5,0.13)') : inputStyle.background }}><span className="w-4 h-4 rounded-[4px] border grid place-items-center" style={{ borderColor: checked ? '#d6f905' : muted }}>{checked && <Check className="w-3 h-3" style={{ color: '#d6f905' }} strokeWidth={3} />}</span><span className="text-[12px]">{option}</span></AppButton>; })}</div>{errorLine}</div>; }
  if (question.type === 'textarea') return <div>{label}<AppTextArea value={typeof value === 'string' ? value : ''} maxLength={question.maxLength} onChange={(event) => onChange(event.target.value)} placeholder={question.placeholder} className="w-full min-h-20 rounded-xl px-3 py-3 outline-none text-[13px] resize-none" style={inputStyle} />{errorLine}</div>;
  return <div>{label}<AppInput value={typeof value === 'string' ? value : ''} maxLength={question.maxLength} onChange={(event) => onChange(event.target.value)} placeholder={question.placeholder} className="w-full h-12 rounded-xl px-3 outline-none text-[13px]" style={inputStyle} />{errorLine}</div>;
}

function FriendRow({ friend, accent, accentRgb, isDark }: {
  key?: string;
  friend: { name: string; handle: string; gradient: string };
  accent: string; accentRgb: string; isDark: boolean;
}) {
  const [invited, setInvited] = useState(false);
  const initial = friend.name[0];
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-2xl"
      style={{ background: 'transparent' }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: friend.gradient }}>
        <span className="text-[12px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: '#fff' }}>{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 500 }}>
          {friend.name}
        </p>
        <p className="text-[11px] truncate"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          {friend.handle}
        </p>
      </div>
      <AppButton whileTap={{ scale: 0.95 }}
        onClick={() => setInvited(true)}
        disabled={invited}
        className="flex-shrink-0 px-3 py-1.5 rounded-full cursor-pointer"
        style={{
          background: invited ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : `rgba(${accentRgb},0.12)`,
          border: `1px solid ${invited
            ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
            : `rgba(${accentRgb},0.25)`}`,
        }}>
        <span className="text-[11px] tracking-[0.3px] flex items-center gap-1"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: invited ? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)') : accent,
            fontWeight: 600,
          }}>
          {invited && <Check className="w-3 h-3" strokeWidth={2.5} />}
          {invited ? 'Invited' : 'Invite'}
        </span>
      </AppButton>
    </div>
  );
}

function ShareChannel({ label, icon, color, href, onClick, isDark }: {
  label: string; icon: React.ReactNode; color: string; href?: string; onClick?: () => void; isDark: boolean;
}) {
  const inner = (
    <>
      <div className="relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center mb-1.5"
        style={{ background: `${color}1f`, border: `1px solid ${color}33`, color }}>
        {icon}
      </div>
      <span className="relative z-10 text-[10px] tracking-[0.5px]"
        style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
        {label}
      </span>
    </>
  );
  const baseClass = "relative flex flex-col items-center justify-center overflow-hidden py-3 rounded-2xl cursor-pointer";
  const baseStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass} style={baseStyle}><GlassReflection isDark={isDark} />{inner}</a>;
  }
  return <AppButton onClick={onClick} className={baseClass} style={baseStyle}><GlassReflection isDark={isDark} />{inner}</AppButton>;
}

function Share2Icon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function RsvpPill({ label, icon, active, neutral, accent, accentRgb, onClick, isDark }: {
  label: string; icon: React.ReactNode; active: boolean; neutral?: boolean;
  accent: string; accentRgb: string; onClick: () => void; isDark: boolean;
}) {
  return (
    <AppButton
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative z-10 flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl cursor-pointer transition-colors"
      style={{
        background: active
          ? (neutral
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
            : accent)
          : 'transparent',
        border: active && !neutral ? 'none' : `1px solid ${active
          ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')
          : 'transparent'}`,
        color: active
          ? (neutral ? (isDark ? '#fff' : '#1a1a1a') : (isDark ? '#000' : '#fff'))
          : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'),
      }}>
      {icon}
      <span className="text-[11px] tracking-[0.5px]"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: active ? 600 : 500 }}>
        {label}
      </span>
    </AppButton>
  );
}
