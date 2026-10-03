import { motion } from 'motion/react';
import { Search, Sparkles, Shield, ArrowUpDown, Tag } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassEdge } from '@/lib/ui/glass';

/**
 * Resale marketplace empty state. Uses the app's standard glass surface
 * (`glass()` + `GlassReflection` + `glassEdge`) with a single restrained
 * ticket-swap motif — no aurora blobs, floating particles, or glow shadows.
 */
export function ResaleEmptyState({ isDark, searchQuery, onClear }: { isDark: boolean; searchQuery: string; onClear: () => void }) {
  const isSearch = !!searchQuery.trim();
  const brand = '#d6f905';
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
        style={{ ...glass(isDark) }}
      >
        <GlassReflection isDark={isDark} />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Ticket-swap motif — two cards exchanging hands */}
          <div className="relative w-[200px] h-[130px] mb-9 flex items-center justify-center">
            {/* Left ticket */}
            <motion.div
              className="absolute rounded-[16px] overflow-hidden"
              style={{
                left: 'calc(50% - 96px)', width: '96px', height: '120px',
                background: isDark
                  ? 'linear-gradient(160deg, rgba(214,249,5,0.16) 0%, rgba(214,249,5,0.04) 100%)'
                  : 'linear-gradient(160deg, rgba(214,249,5,0.4) 0%, rgba(214,249,5,0.14) 100%)',
                border: `1px solid ${isDark ? 'rgba(214,249,5,0.28)' : 'rgba(150,180,0,0.45)'}`,
              }}
              animate={{ rotate: -8, y: [0, -3, 0] }}
              transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
            >
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="text-[6px] tracking-[1.6px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.45)' }}>
                  Admit One
                </span>
                <Tag className="w-3 h-3" strokeWidth={2} style={{ color: isDark ? 'rgba(214,249,5,0.7)' : 'rgba(10,10,10,0.4)' }} />
              </div>
              <div className="absolute inset-x-0 top-[46%] -translate-y-1/2 flex flex-col items-center">
                <span className="text-[5.5px] tracking-[1.5px] uppercase mb-0.5"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,10,0.4)' }}>
                  Resale
                </span>
                <span className="text-[15px] leading-none tracking-[-0.5px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 700, color: isDark ? '#fff' : '#1a1a1a' }}>
                  Digis
                </span>
              </div>
              <div className="absolute inset-x-2.5" style={{ top: '66%', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(10,10,10,0.2)'}` }} />
            </motion.div>

            {/* Right ticket — the standard glass surface, offset */}
            <motion.div
              className="absolute rounded-[16px] overflow-hidden"
              style={{
                left: 'calc(50%)', width: '96px', height: '120px',
                ...glass(isDark),
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
              }}
              animate={{ rotate: 8, y: [0, -3, 0] }}
              transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 } }}
            >
              <GlassReflection isDark={isDark} />
              <div className="relative z-10 absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="text-[6px] tracking-[1.6px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(10,10,10,0.4)' }}>
                  Admit One
                </span>
              </div>
              <div className="relative z-10 absolute inset-x-0 top-[46%] -translate-y-1/2 flex flex-col items-center">
                <span className="text-[5.5px] tracking-[1.5px] uppercase mb-0.5"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,10,0.4)' }}>
                  Resale
                </span>
                <span className="text-[15px] leading-none tracking-[-0.5px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 700, color: isDark ? '#fff' : '#1a1a1a' }}>
                  Digis
                </span>
              </div>
              <div className="relative z-10 absolute inset-x-2.5" style={{ top: '66%', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}` }} />
            </motion.div>

            {/* Center swap badge */}
            <motion.div
              className="relative z-20 w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: isDark ? 'rgba(16,17,21,0.92)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(214,249,5,0.35)' : 'rgba(180,210,0,0.5)'}`,
                ...glassEdge(isDark),
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowUpDown className="w-5 h-5 rotate-90" strokeWidth={2}
                style={{ color: isDark ? brand : '#5a6b00' }} />
            </motion.div>
          </div>

          {/* Kicker */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
            style={{
              background: isDark ? 'rgba(217,255,0,0.08)' : 'rgba(214,249,5,0.16)',
              ...glassEdge(isDark),
            }}
          >
            <Sparkles className="w-3 h-3" strokeWidth={2} style={{ color: isDark ? brand : '#5a6b00' }} />
            <span className="text-[10px] tracking-[1.5px] uppercase"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(244,255,128,0.9)' : 'rgba(0,0,0,0.7)' }}>
              {isSearch ? 'No matches' : 'Resale marketplace'}
            </span>
          </div>

          <h3
            className="text-[24px] sm:text-[30px] font-light tracking-[-0.5px] mb-3"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#0a0a0a' }}
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
                background: isDark ? '#d6f905' : '#0a0a0a',
                color: isDark ? '#000' : '#fff',
                fontFamily: "'Inter', sans-serif", fontSize: '13px', letterSpacing: '0.3px', fontWeight: 600,
                ...glassEdge(isDark),
              }}
            >
              <Search className="w-4 h-4" strokeWidth={2} />
              <span>Clear search</span>
            </AppButton>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
                ...glassEdge(isDark),
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
