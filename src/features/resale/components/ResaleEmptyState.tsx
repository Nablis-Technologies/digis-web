import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Calendar, MapPin, Clock, Tag, TrendingUp, TrendingDown, Shield, ArrowRight, X, ArrowLeft, AlertTriangle, Check, ChevronDown, ChevronRight, DollarSign, ArrowUpDown, Search, Filter, Sparkles, Crown, Minus, Plus, Ticket } from 'lucide-react';
import type { ResaleListing, UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

const RESALE_PARTICLES = [
  { left: '12%', top: '70%', size: 5, delay: 0, dur: 7, kind: 'dot' },
  { left: '84%', top: '64%', size: 6, delay: 1.2, dur: 8, kind: 'tag' },
  { left: '22%', top: '30%', size: 4, delay: 2.1, dur: 6.5, kind: 'dot' },
  { left: '76%', top: '26%', size: 7, delay: 0.6, dur: 9, kind: 'coin' },
  { left: '50%', top: '14%', size: 4, delay: 1.8, dur: 7.5, kind: 'dot' },
  { left: '90%', top: '44%', size: 5, delay: 2.6, dur: 8.5, kind: 'dot' },
  { left: '8%', top: '46%', size: 6, delay: 0.9, dur: 7.8, kind: 'coin' },
] as const;

export function ResaleEmptyState({ isDark, searchQuery, onClear }: { isDark: boolean; searchQuery: string; onClear: () => void }) {
  const isSearch = !!searchQuery.trim();
  const brand = '#d6f905';
  const ring = (a: number) => (isDark ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
  const subtle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.6)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="px-2 sm:px-4"
    >
      <div
        className="relative overflow-hidden rounded-[30px] px-6 py-16 sm:py-20 mx-auto max-w-xl"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 100%)'
            : 'linear-gradient(180deg, #edecf7 0%, #f4f3ee 42%, #e7e6f1 100%)',
          border: 'none',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <GlassReflection isDark={isDark} />
        {/* Dual drifting aurora blobs (brand lime + violet) */}
        <motion.div
          className="absolute -top-28 -left-16 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(217,255,0,0.16)' : 'rgba(214,249,5,0.22)'} 0%, transparent 64%)`, filter: 'blur(6px)' }}
          animate={{ x: [0, 36, 0], y: [0, 22, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-36 -right-12 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(139,92,246,0.16)' : 'rgba(139,92,246,0.16)'} 0%, transparent 64%)`, filter: 'blur(6px)' }}
          animate={{ x: [0, -32, 0], y: [0, -18, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating particles — drifting coins / tags */}
        {RESALE_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none flex items-center justify-center"
            style={{ left: p.left, top: p.top, width: p.size * 2, height: p.size * 2 }}
            animate={{ y: [0, -18, 0], opacity: [0, 0.9, 0], rotate: [0, 12, 0] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            {p.kind === 'tag' ? (
              <Tag style={{ width: p.size * 2, height: p.size * 2, color: isDark ? brand : '#9bbf00' }} strokeWidth={2} />
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: p.size, height: p.size,
                  background: p.kind === 'coin' ? brand : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.22)'),
                  boxShadow: p.kind === 'coin' ? `0 0 8px ${brand}` : 'none',
                }}
              />
            )}
          </motion.div>
        ))}

        <div className="relative flex flex-col items-center text-center">
          {/* Ticket-swap motif */}
          <div className="relative w-[260px] h-[190px] mb-10 flex items-center justify-center">
            {/* Hand-off arc connecting the two tickets */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 250 160" fill="none">
              <path
                d="M62 92 Q125 40 188 92"
                stroke={isDark ? 'rgba(217,255,0,0.35)' : 'rgba(150,180,0,0.45)'}
                strokeWidth="1.5"
                strokeDasharray="4 5"
                strokeLinecap="round"
              />
            </svg>
            {/* Glowing dot travelling along the arc (the ticket changing hands) */}
            <motion.div
              className="absolute z-20 w-2.5 h-2.5 rounded-full"
              style={{ background: brand, boxShadow: `0 0 12px ${brand}` }}
              animate={{
                left: ['25%', '50%', '75%', '50%', '25%'],
                top: ['57%', '34%', '57%', '34%', '57%'],
                opacity: [0, 1, 1, 1, 0],
              }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Left ticket — lime, leaning in */}
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: [0, -4, 0], rotate: -10 }}
              transition={{
                opacity: { duration: 0.5 },
                rotate: { duration: 0.5 },
                x: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute rounded-[18px] overflow-hidden"
              style={{
                left: 'calc(50% - 118px)', width: '118px', height: '148px',
                background: 'linear-gradient(160deg, #eeff52 0%, #c8e800 55%, #a8c800 100%)',
                border: '1px solid rgba(200,232,0,0.95)',
                boxShadow: '0 12px 32px -12px rgba(0,0,0,0.3)',
              }}
            >
              {/* Glossy sheen */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.5) 0%, transparent 40%)' }} />
              {/* Top section */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[6px] tracking-[1.8px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(10,10,10,0.5)' }}>
                  Admit One
                </span>
                <Tag className="w-3 h-3" strokeWidth={2} style={{ color: 'rgba(10,10,10,0.4)' }} />
              </div>
              {/* Digis wordmark */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col">
                <span className="text-[7px] tracking-[1.5px] uppercase mb-0.5"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(10,10,10,0.45)' }}>
                  Resale
                </span>
                <span className="text-[16px] leading-none tracking-[-0.5px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 700, color: '#0a0a0a' }}>
                  Digis
                </span>
              </div>
              {/* Perforation line */}
              <div className="absolute inset-x-0" style={{ top: '65%', borderTop: '1px dashed rgba(10,10,10,0.2)' }} />
              {/* Notches */}
              <div className="absolute -left-[5px] w-3 h-3 rounded-full" style={{ top: '65%', marginTop: -6, background: isDark ? '#0e0e10' : '#edecf4' }} />
              <div className="absolute -right-[5px] w-3 h-3 rounded-full" style={{ top: '65%', marginTop: -6, background: isDark ? '#0e0e10' : '#edecf4' }} />
              {/* Barcode stub */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-[2px] h-5">
                {[2,1,3,1,2,1,3,2,1,2,3,1,2,1,3].map((w,i) => (
                  <div key={i} className="rounded-[1px]"
                    style={{ width: w, height: '100%', background: 'rgba(10,10,10,0.55)', opacity: i%2===0 ? 0.9 : 0.5 }} />
                ))}
              </div>
            </motion.div>

            {/* Right ticket — violet, leaning in */}
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: [0, 4, 0], rotate: 10 }}
              transition={{
                opacity: { duration: 0.5, delay: 0.1 },
                rotate: { duration: 0.5, delay: 0.1 },
                x: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 },
              }}
              className="absolute rounded-[18px] overflow-hidden"
              style={{
                left: 'calc(50%)', width: '118px', height: '148px',
                background: 'linear-gradient(160deg, #b89dff 0%, #7c3aed 55%, #5b21b6 100%)',
                border: '1px solid rgba(167,139,250,0.7)',
                boxShadow: '0 20px 48px -12px rgba(109,40,217,0.65), 0 4px 12px -4px rgba(0,0,0,0.3)',
              }}
            >
              {/* Glossy sheen */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.35) 0%, transparent 40%)' }} />
              {/* Top section */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[6px] tracking-[1.8px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  Admit One
                </span>
                <Tag className="w-3 h-3" strokeWidth={2} style={{ color: 'rgba(255,255,255,0.45)' }} />
              </div>
              {/* Digis wordmark */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-end">
                <span className="text-[7px] tracking-[1.5px] uppercase mb-0.5"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                  Resale
                </span>
                <span className="text-[16px] leading-none tracking-[-0.5px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 700, color: '#fff' }}>
                  Digis
                </span>
              </div>
              {/* Perforation line */}
              <div className="absolute inset-x-0" style={{ top: '65%', borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
              {/* Notches */}
              <div className="absolute -left-[5px] w-3 h-3 rounded-full" style={{ top: '65%', marginTop: -6, background: isDark ? '#0e0e10' : '#edecf4' }} />
              <div className="absolute -right-[5px] w-3 h-3 rounded-full" style={{ top: '65%', marginTop: -6, background: isDark ? '#0e0e10' : '#edecf4' }} />
              {/* Barcode stub */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-[2px] h-5">
                {[3,1,2,1,3,1,2,3,1,2,1,3,2,1,2].map((w,i) => (
                  <div key={i} className="rounded-[1px]"
                    style={{ width: w, height: '100%', background: 'rgba(255,255,255,0.7)', opacity: i%2===0 ? 0.85 : 0.45 }} />
                ))}
              </div>
            </motion.div>

            {/* Center swap badge with rotating dashed ring */}
            <motion.div
              className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: isDark ? 'rgba(15,15,16,0.9)' : '#fff',
                border: `1.5px solid ${isDark ? 'rgba(217,255,0,0.5)' : 'rgba(180,210,0,0.7)'}`,
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                className="absolute inset-[3px] rounded-full"
                style={{ border: `1.5px dashed ${isDark ? 'rgba(217,255,0,0.35)' : 'rgba(150,180,0,0.4)'}` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowUpDown className="w-5 h-5 rotate-90" strokeWidth={2.25}
                  style={{ color: isDark ? brand : '#5a6b00' }} />
              </motion.div>
              {/* price tag accent */}
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: brand }}
                animate={{ scale: [1, 1.12, 1], rotate: [-8, 8, -8] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Tag className="w-3 h-3" strokeWidth={2.5} style={{ color: '#0a0a0a' }} />
              </motion.div>
            </motion.div>

            {/* Twinkles */}
            <motion.div className="absolute -top-1 right-4"
              animate={{ scale: [0.8, 1.15, 0.8], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
              <Sparkles className="w-4 h-4" strokeWidth={1.5} style={{ color: isDark ? brand : '#9bbf00' }} />
            </motion.div>
          </div>

          {/* Kicker */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
            style={{
              background: isDark ? 'rgba(217,255,0,0.08)' : 'rgba(214,249,5,0.16)',
              border: `1px solid ${isDark ? 'rgba(217,255,0,0.2)' : 'rgba(214,249,5,0.4)'}`,
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: brand, opacity: 0.6 }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: brand }} />
            </span>
            <span className="text-[10px] tracking-[1.5px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(244,255,128,0.9)' : 'rgba(0,0,0,0.7)' }}>
              {isSearch ? 'No matches' : 'Resale marketplace'}
            </span>
          </div>

          <h3
            className="text-[24px] sm:text-[30px] font-light tracking-[-0.5px] mb-3"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              color: isDark ? '#fff' : '#0a0a0a',
              textShadow: 'none',
            }}
          >
            {isSearch ? 'No matches found' : 'The marketplace is quiet'}
          </h3>

          <p
            className="text-[14px] leading-relaxed max-w-[360px] mb-8"
            style={{ fontFamily: "'Inter', sans-serif", color: subtle }}
          >
            {isSearch
              ? `Nothing for "${searchQuery.trim()}". Try another event name or clear your search.`
              : "No tickets are up for resale right now. When fans list their spare tickets, they'll appear here — verified and fairly priced."}
          </p>

          {isSearch ? (
            <AppButton
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onClear}
              className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full cursor-pointer overflow-hidden"
              style={{
                background: isDark ? 'linear-gradient(135deg, #d9ff00, #d6f905)' : '#0a0a0a',
                color: isDark ? '#000' : '#fff',
                fontFamily: "'Inter', sans-serif", fontSize: '13px', letterSpacing: '0.3px', fontWeight: 600,
                boxShadow: isDark ? 'none' : '0 10px 30px -10px rgba(0,0,0,0.4)',
              }}
            >
              <motion.span
                className="absolute inset-y-0 w-1/3 pointer-events-none"
                style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)' }}
                initial={{ x: '-150%' }}
                animate={{ x: '350%' }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
              />
              <Search className="relative w-4 h-4" strokeWidth={2} />
              <span className="relative">Clear search</span>
            </AppButton>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${ring(isDark ? 0.1 : 0.08)}`,
              }}
            >
              <Shield className="w-3.5 h-3.5" strokeWidth={2} style={{ color: isDark ? brand : '#5a6b00' }} />
              <span className="text-[11px] tracking-[0.8px]"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: subtle }}>
                Every resale ticket is verified &amp; price-capped
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── "You're live!" listing success overlay ─── */
