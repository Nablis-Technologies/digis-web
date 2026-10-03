import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/app/components/ThemeContext';
import { X, ShieldCheck, MapPin, Calendar, Ticket as TicketIcon } from 'lucide-react';
import { Money } from '@/lib/money';
import type { ResaleListing } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

/**
 * Buy confirmation — the review step before purchasing a resale listing. Shows
 * what is being bought (event, type, date/venue), the asking price vs the face
 * value, and the "Verified by Digis" guarantee, so a buyer never commits blind.
 */
export function BuyListingSheet({ listing, submitting, error, onConfirm, onClose }: {
  listing: ResaleListing;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { isDark } = useTheme();

  const text = isDark ? '#fff' : '#1a1a1a';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const subtle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';

  const asking = Money.fromMinor(listing.askingPriceMinor, listing.currency);
  const face = listing.originalPriceMinor != null
    ? Money.fromMinor(listing.originalPriceMinor, listing.currency)
    : null;
  const aboveFace = face != null && listing.askingPriceMinor > listing.originalPriceMinor!;

  const sheet = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center"
      onClick={onClose}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full lg:max-w-[440px] lg:mx-4 rounded-t-3xl lg:rounded-3xl max-h-[85vh] lg:max-h-[80vh] overflow-y-auto overflow-x-hidden"
        style={{ background: isDark ? '#101115' : '#fff' }}
        onClick={(e) => e.stopPropagation()}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
          <div className="flex justify-center pt-3 pb-2 lg:hidden">
            <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
          </div>

          <div className="px-6 pb-10 pt-3 lg:pt-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[20px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                Confirm purchase
              </h3>
              <AppButton onClick={onClose} className="cursor-pointer">
                <X className="w-5 h-5" style={{ color: muted }} strokeWidth={1.5} />
              </AppButton>
            </div>
            <p className="text-[12px] mb-6" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
              Review before you buy — you’ll pay through Chapa on the next step.
            </p>

            {/* What you're buying */}
            <div className="relative rounded-2xl p-4 overflow-hidden mb-4" style={{ background: cardBg }}>
              <GlassReflection isDark={isDark} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(214,249,5,0.1)' : 'rgba(0,0,0,0.04)', ...glassEdge(isDark) }}>
                  <TicketIcon className="w-5 h-5" style={{ color: accent }} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                    {listing.eventName}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    {listing.ticketType}
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3"
                style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}>
                {listing.eventDate && (
                  <span className="flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} /> {listing.eventDate}
                  </span>
                )}
                {listing.venue && (
                  <span className="flex items-center gap-1.5 text-[11.5px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                    <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} /> {listing.venue}
                  </span>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: cardBg }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                  Resale price
                </span>
                <span className="text-[18px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                  {asking.format()}
                </span>
              </div>
              {face != null && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                    Original face value
                  </span>
                  <span className="text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: subtle }}>
                    {face.format()}
                  </span>
                </div>
              )}
              {aboveFace && (
                <p className="text-[11px] mt-2" style={{ fontFamily: "'Inter', sans-serif", color: muted }}>
                  This listing is above face value. Resale is price-capped by the event.
                </p>
              )}
            </div>

            {/* Trust */}
            <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-6"
              style={{ background: isDark ? 'rgba(214,249,5,0.08)' : 'rgba(214,249,5,0.14)' }}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} strokeWidth={2} />
              <p className="text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#3a3a00' }}>
                Verified by Digis. The seller’s ticket is transferred to you the moment your payment settles — you’ll find it in My Tickets.
              </p>
            </div>

            {error && (
              <p className="text-[12px] mb-4 leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#e5484d' }}>
                {error}
              </p>
            )}

            <AppButton whileHover={submitting ? undefined : { scale: 1.02 }} whileTap={submitting ? undefined : { scale: 0.98 }}
              onClick={() => { if (!submitting) onConfirm(); }}
              disabled={submitting}
              className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              style={{ background: '#d6f905', color: '#0a0a0a', ...glassEdge(isDark) }}>
              <span className="text-[14px] font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                {submitting ? 'Starting payment…' : `Buy for ${asking.format()}`}
              </span>
            </AppButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}
