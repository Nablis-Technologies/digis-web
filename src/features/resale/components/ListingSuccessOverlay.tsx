import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Check, Copy } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { Money } from '@/lib/money';
import { copyText } from '@/lib/utils/clipboard';
import { toastError } from '@/lib/feedback';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassEdge } from '@/lib/ui/glass';

export function ListingSuccessOverlay({ ticket, price, listingId, isDark, onClose }: { ticket: UserTicket; price: number; listingId: string; isDark: boolean; onClose: () => void }) {
  const brand = '#d6f905';
  const [copied, setCopied] = useState(false);
  const copyListingLink = async () => {
    // A real, resolvable route (it opens the listing's event resale page).
    const link = typeof window === 'undefined'
      ? `/resale/listings/${listingId}`
      : `${window.location.origin}/resale/listings/${listingId}`;
    if (await copyText(link)) setCopied(true);
    else toastError(new Error('clipboard unavailable'), 'Couldn’t copy the link — long-press to copy it manually.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-6"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: isDark ? 'rgba(7,7,7,0.82)' : 'rgba(240,239,248,0.88)' }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: -10, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden flex flex-col items-center text-center px-8 py-12"
        style={{ ...glass(isDark) }}
      >
        <GlassReflection isDark={isDark} />

        {/* Checkmark on the brand accent — no glow, no sparkle bursts */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ background: brand, ...glassEdge(isDark) }}
        >
          <Check className="w-7 h-7" strokeWidth={2.75} style={{ color: '#0a0a0a' }} />
        </motion.div>

        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="relative z-10 text-[10px] tracking-[2.5px] uppercase mb-2"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? brand : '#5a6b00' }}
        >
          You're live
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.4 }}
          className="relative z-10 text-[26px] font-light tracking-[-0.4px] mb-2"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#0a0a0a' }}
        >
          Your ticket is listed
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="relative z-10 text-[13px] leading-relaxed mb-7 max-w-[280px]"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.6)' }}
        >
          {ticket.eventName} · {Money.fromMinor(price, 'ETB').format()} is now visible to buyers. We'll notify you the moment it sells.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72, duration: 0.4 }} className="relative z-10 mt-8 w-full flex gap-2.5">
          <AppButton onClick={copyListingLink} className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)', ...glassEdge(isDark) }}>
            {copied ? <Check className="w-4 h-4" style={{ color: brand }} strokeWidth={2} /> : <Copy className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.72)' : '#1a1a1a' }} strokeWidth={1.7} />}
            <span className="text-[12px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: copied ? brand : (isDark ? '#fff' : '#1a1a1a') }}>{copied ? 'Link copied' : 'Copy link'}</span>
          </AppButton>
          <AppButton onClick={onClose} className="flex-1 h-12 rounded-2xl flex items-center justify-center cursor-pointer" style={{ background: brand, color: '#152006' }}>
            <span className="text-[12px] font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>View listing</span>
          </AppButton>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Delist confirmation sheet ─── */
