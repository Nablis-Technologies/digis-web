import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string): string {
  const palette = [
    'linear-gradient(135deg, #fbbf24, #f59e0b)',
    'linear-gradient(135deg, #34d399, #10b981)',
    'linear-gradient(135deg, #d6f905, #d6f905)',
    'linear-gradient(135deg, #d6f905, #ec4899)',
    'linear-gradient(135deg, #fb923c, #d6f905)',
    'linear-gradient(135deg, #d6f905, #d9ff00)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function ListingDetailSheet({ listing, onClose }: { listing: ResaleListing; onClose: () => void }) {
  const { isDark } = useTheme();
  const isVIP = listing.ticketType === 'VIP';
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = () => {
    setPurchasing(true);
    setTimeout(() => {
      setPurchasing(false);
      setPurchased(true);
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0"
        style={{ background: isDark ? 'rgba(8,9,11,0.88)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}
      />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 max-h-[88vh] rounded-t-3xl flex flex-col"
        style={{
          background: isDark ? '#101115' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          overscrollBehavior: 'contain',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto scrollbar-hide flex-1">
          {/* Hero image */}
          <div className="relative h-[180px] mx-5 rounded-2xl overflow-hidden mb-5">
            <img src={listing.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,20,0.8))' }}
            />
            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {isVIP && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(214,249,5,0.15)', border: '1px solid rgba(214,249,5,0.3)', backdropFilter: 'blur(10px)' }}>
                  <Crown className="w-3 h-3" style={{ color: '#d6f905' }} strokeWidth={1.5} />
                  <span className="text-[9px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#d6f905' }}>VIP</span>
                </div>
              )}
              {listing.verified && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', backdropFilter: 'blur(10px)' }}>
                  <Shield className="w-3 h-3 text-yellow-300" strokeWidth={1.5} />
                  <span className="text-[9px] tracking-[1.5px] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: '#34d399' }}>Verified</span>
                </div>
              )}
            </div>
            {/* Event name overlay */}
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-[22px] font-light text-white leading-tight"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                {listing.eventName}
              </h2>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 pb-4">
            {/* Info rows */}
            <div className="space-y-3 mb-6">
              {[
                { icon: <Calendar className="w-4 h-4" />, label: 'Date', value: listing.eventDate },
                { icon: <Clock className="w-4 h-4" />, label: 'Time', value: listing.eventTime },
                { icon: <MapPin className="w-4 h-4" />, label: 'Venue', value: listing.venue },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: isDark ? 'rgba(214,249,5,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${isDark ? 'rgba(214,249,5,0.1)' : 'rgba(0,0,0,0.06)'}`,
                      color: isDark ? '#d6f905' : '#0a0a0a',
                    }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.5px] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}>
                      {item.label}
                    </p>
                    <p className="text-[14px] font-light"
                      style={{ color: isDark ? 'rgba(255,255,255,0.8)' : '#1a1a1a' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px w-full mb-5"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
            />

            {/* Price breakdown */}
            <div className="rounded-2xl p-4 mb-6"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                  Original price
                </span>
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                  ETB {listing.originalPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>
                  Service fee
                </span>
                <span className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>
                  ETB {Math.round(listing.askingPrice * 0.05).toLocaleString()}
                </span>
              </div>
              <div className="h-px w-full my-2.5"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium"
                  style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  Total
                </span>
                <span className="text-[18px] font-light"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a' }}>
                  ETB {(listing.askingPrice + Math.round(listing.askingPrice * 0.05)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Safety notice */}
            <div className="flex items-start gap-3 mb-2 p-3 rounded-xl"
              style={{
                background: isDark ? 'rgba(52,211,153,0.04)' : 'rgba(5,150,105,0.04)',
                border: `1px solid ${isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.08)'}`,
              }}>
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={1.5} />
              <p className="text-[11px] leading-[1.5]"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(52,211,153,0.7)' : '#059669' }}>
                Protected by Digis Buyer Guarantee. Full refund if the ticket is invalid.
              </p>
            </div>
          </div>
        </div>

        {/* CTA - sticky at bottom */}
        <div className="px-6 pb-10 pt-4 flex-shrink-0" style={{ background: isDark ? '#101115' : '#fff', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          {purchased ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2.5"
              style={{
                background: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.08)',
                border: `1px solid ${isDark ? 'rgba(52,211,153,0.2)' : 'rgba(5,150,105,0.15)'}`,
              }}>
              <Check className="w-5 h-5" style={{ color: isDark ? '#34d399' : '#059669' }} strokeWidth={2} />
              <span className="text-[14px] font-medium"
                style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#34d399' : '#059669' }}>
                Ticket Purchased!
              </span>
            </motion.div>
          ) : (
            <AppButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full h-[56px] rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer relative overflow-hidden"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(214,249,5,0.2), rgba(217,255,0,0.1))'
                  : 'linear-gradient(135deg, rgba(214,249,5,0.9), rgba(109,40,217,0.85))',
                border: `1px solid ${isDark ? 'rgba(214,249,5,0.25)' : 'rgba(214,249,5,0.3)'}`,
              }}>
              {purchasing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 rounded-full"
                  style={{ borderColor: isDark ? 'rgba(214,249,5,0.2)' : 'rgba(255,255,255,0.3)', borderTopColor: isDark ? '#d6f905' : '#fff' }} />
              ) : (
                <>
                  <DollarSign className="w-5 h-5" style={{ color: isDark ? '#f4ff66' : '#fff' }} strokeWidth={1.5} />
                  <span className="text-[14px] font-medium tracking-[0.3px]"
                    style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#f4ff66' : '#fff' }}>
                    Buy Ticket · ETB {(listing.askingPrice + Math.round(listing.askingPrice * 0.05)).toLocaleString()}
                  </span>
                </>
              )}
            </AppButton>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   SELL TICKET SHEET
   ═══════════════════════════════════════════════════════ */
