import { motion } from 'motion/react';
import { Check, Mail } from 'lucide-react';
import { SummaryLine } from './OrderSummary';
import { Money } from '@/lib/money';

export function SuccessView({ event, ticketType, total, isDark }: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.4)';
  const notchColor = isDark ? '#0f0f0f' : '#ffffff';
  const hasTotal = typeof total === 'number';

  return (
    <div className="flex flex-col items-center text-center w-full">
      {/* Confetti orbs */}
      {[
        { x: -120, y: -40, d: 0, c: '#d6f905' },
        { x: 130, y: -50, d: 0.2, c: '#ec4899' },
        { x: -100, y: 60, d: 0.4, c: '#d6f905' },
        { x: 110, y: 80, d: 0.6, c: '#22d3ee' },
        { x: 0, y: -110, d: 0.3, c: '#d9ff00' },
      ].map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
          transition={{ duration: 1.4, delay: s.d, ease: 'easeOut' }}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ background: s.c }}
        />
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          boxShadow: 'none',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: 'spring', damping: 12, stiffness: 200 }}
        >
          <Check className="w-9 h-9 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <p className="text-[10px] tracking-[3px] uppercase mb-2"
        style={{ fontFamily: "'Inter', sans-serif", color: '#34d399' }}>
        Payment Confirmed
      </p>
      <h3 className="text-[26px] font-light mb-2"
        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
        You're going!
      </h3>
      <p className="text-[13px] max-w-[300px] mb-7"
        style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
        Your ticket for <span style={{ color: textPrimary }}>{event.name}</span> is ready in your collection.
      </p>

      {/* Physical confirmation ticket — drops in and settles */}
      <motion.div
        initial={{ y: -28, opacity: 0, rotate: -3, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 220, damping: 18 }}
        className="relative w-full flex rounded-2xl overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(150deg, #1a2207 0%, #0e1304 100%)'
            : 'linear-gradient(150deg, #fbffe0 0%, #f2fab8 100%)',
          boxShadow: isDark
            ? '0 24px 48px -18px rgba(0,0,0,0.7), 0 14px 34px -12px rgba(214,249,5,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 24px 48px -18px rgba(0,0,0,0.28), 0 14px 30px -14px rgba(214,249,5,0.5), inset 0 1px 0 rgba(255,255,255,0.7)',
          border: `1px solid ${isDark ? 'rgba(217,255,0,0.18)' : 'rgba(214,249,5,0.4)'}`,
        }}
      >
        {/* Paper grain */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.04,
            mixBlendMode: isDark ? 'overlay' : 'multiply',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='gc'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23gc)'/%3E%3C/svg%3E")`,
            backgroundSize: '160px 160px',
          }}
        />

        {/* Main section */}
        <div className="relative flex-1 p-4 text-left space-y-2.5 min-w-0">
          <SummaryLine label="Event" value={event.name} isDark={isDark} />
          <SummaryLine label="Tier" value={ticketType} isDark={isDark} />
          <SummaryLine label="When" value={`${event.date} · ${event.time}`} isDark={isDark} />
          {hasTotal && (
            <>
              <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.1)' }} />
              <SummaryLine label="Paid" value={Money.fromMinor(total, "ETB").format()} isDark={isDark} />
            </>
          )}
        </div>

        {/* Vertical perforation + notches */}
        <div className="relative w-px self-stretch my-0 flex-shrink-0">
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: notchColor }} />
          <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: notchColor }} />
          <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-px"
            style={{
              backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} 0%, ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} 40%, transparent 45%)`,
              backgroundSize: '2px 6px',
              backgroundRepeat: 'repeat-y',
            }}
          />
        </div>

        {/* Stub */}
        <div className="relative w-[78px] flex-shrink-0 flex flex-col items-center justify-center gap-2 py-4 px-2">
          {/* Faux barcode */}
          <div className="flex items-end gap-[2px] h-8">
            {[3,7,4,8,2,6,3,7,5,2,8,4].map((h, i) => (
              <div key={i} className="w-[2px] rounded-sm"
                style={{ height: `${h * 3}px`, background: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)' }} />
            ))}
          </div>
          <span className="text-[7px] tracking-[2px] uppercase"
            style={{ fontFamily: "'Courier New', ui-monospace, monospace", color: isDark ? 'rgba(214,249,5,0.7)' : 'rgba(0,0,0,0.5)', fontWeight: 700 }}>
            Admit One
          </span>
        </div>
      </motion.div>

      <div className="flex items-center gap-1.5 mt-5"
        style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}>
        <Mail className="w-3 h-3" strokeWidth={1.8} />
        <span className="text-[10px] tracking-[1px] uppercase">Receipt sent to your email</span>
      </div>
    </div>
  );
}
