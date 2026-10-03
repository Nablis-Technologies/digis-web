import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket } from 'lucide-react';
import type { ResaleListing } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { Money } from '@/lib/money';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';

export function RemoveListingSheet({
  listing,
  isDark,
  onCancel,
  onConfirm,
  removing = false,
}: {
  listing: ResaleListing;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  removing?: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[120]"
        style={{ background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(20,18,40,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-[130] px-4 pb-8 pt-2 max-w-lg mx-auto"
      >
        <div
          className="relative rounded-[28px] overflow-hidden px-6 pt-8 pb-6"
          style={{
            background: isDark ? '#101115' : '#fff',
            border: 'none',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
          }}
        >
          <GlassReflection isDark={isDark} />
          {/* Pull handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
            style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />

          {/* Warning icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-6 h-6 text-red-400" strokeWidth={2} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-[20px] font-light tracking-[-0.3px] mb-2"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
              Remove this listing?
            </h3>
            <p className="text-[13px] leading-relaxed max-w-[300px] mx-auto"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
              Your ticket will be delisted from the marketplace. Buyers won't be able to see it anymore.
            </p>
          </div>

          {/* Listing preview card */}
          <div className="relative flex items-center gap-3 p-3 rounded-2xl overflow-hidden mb-6"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}>
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 contents">
            {listing.ticket?.image && (
              <img src={listing.ticket.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                {listing.ticket?.eventName ?? listing.eventName}
              </p>
              <p className="text-[12px] mt-0.5"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                {listing.ticket?.eventDate ?? listing.eventDate} · {Money.fromMinor(listing.askingPriceMinor, "ETB").format()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] tracking-[0.5px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#16a34a' }}>
                  Currently live
                </span>
              </div>
            </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <AppButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="relative flex-1 py-3.5 rounded-2xl overflow-hidden cursor-pointer text-[13px]"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)',
              }}
            >
              <GlassReflection isDark={isDark} />
              <span className="relative z-10">Keep listed</span>
            </AppButton>
            <AppButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (!removing) onConfirm(); }}
              disabled={removing}
              className="flex-1 py-3.5 rounded-2xl cursor-pointer disabled:cursor-not-allowed text-[13px] relative overflow-hidden"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                ...glassEdge(isDark),
              }}
            >
              Yes, delist
            </AppButton>
          </div>
        </div>
      </motion.div>
    </>
  );
}
