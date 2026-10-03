import { motion } from 'motion/react';
import { ArrowRight, Compass } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassEdge } from '@/lib/ui/glass';

export function TicketsEmptyState({ tab, isDark, onDiscover }: { tab: 'upcoming' | 'past'; isDark: boolean; onDiscover?: () => void }) {
  const isUpcoming = tab === 'upcoming';

  const copy = isUpcoming
    ? {
        kicker: 'Your story starts here',
        title: 'No plans yet?',
        sub: "Let's fix that. The city is alive tonight — concerts, coffee ceremonies, rooftop vibes. Your next memory is one tap away.",
        cta: 'Discover events',
      }
    : {
        kicker: 'The archive',
        title: 'No memories yet',
        sub: 'Past events will live here — a little museum of the nights you said yes to. Go collect some.',
        cta: 'Find something new',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="px-6 pt-16 pb-10"
    >
      <div
        className="relative mx-auto max-w-md rounded-[28px] overflow-hidden"
        style={{ padding: '44px 28px 36px', ...glass(isDark) }}
      >
        <GlassReflection isDark={isDark} />
        {/* Ticket stack — one front pass on the standard glass, two behind */}
        <div className="relative flex items-center justify-center mb-7" style={{ height: '160px' }}>
          {[
            { rot: -14, x: -46, dur: 5, delay: 0 },
            { rot: 12, x: 46, dur: 5.5, delay: 0.3 },
          ].map((card, i) => (
            <motion.div
              key={i}
              className="absolute rounded-[16px] w-[108px] h-[134px]"
              style={{
                marginLeft: `${card.x}px`,
                rotate: card.rot,
                background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)',
                ...glassEdge(isDark),
              }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: card.dur, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
            />
          ))}
          {/* Front — the standard glass surface */}
          <motion.div
            className="relative rounded-[16px] w-[108px] h-[134px] overflow-hidden"
            style={{ rotate: -2, ...glass(isDark), ...glassEdge(isDark) }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <GlassReflection isDark={isDark} />
            <div className="relative z-10 absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <span className="text-[6px] tracking-[1.5px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.45)' }}>
                Admit One
              </span>
            </div>
            <div className="relative z-10 absolute inset-x-0 top-[40%] -translate-y-1/2 flex flex-col items-center">
              <span className="text-[20px] leading-none"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 600, letterSpacing: '-0.5px', color: isDark ? '#fff' : '#1a1a1a' }}>
                Digis
              </span>
              <span className="mt-1 text-[5.5px] tracking-[2px] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.45)' }}>
                Event Pass
              </span>
            </div>
            <div className="absolute left-2.5 right-2.5" style={{ top: '60%', borderTop: `1px dashed ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)'}` }} />
          </motion.div>
        </div>

        <div className="relative text-center">
          <p
            className="text-[10px] tracking-[3px] uppercase mb-3"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark ? '#d6f905' : '#0a0a0a',
            }}
          >
            {copy.kicker}
          </p>
          <h3
            className="text-[26px] font-light tracking-[-0.3px] mb-3"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              color: isDark ? '#fff' : '#1a1a1a',
            }}
          >
            {copy.title}
          </h3>
          <p
            className="text-[13px] leading-relaxed mb-7 max-w-[320px] mx-auto"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.6)',
            }}
          >
            {copy.sub}
          </p>

          <AppButton
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDiscover}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full cursor-pointer"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: '#d6f905',
              color: '#000',
              fontSize: '13px',
              letterSpacing: '0.5px',
              ...glassEdge(isDark),
            }}
          >
            <Compass className="w-4 h-4" strokeWidth={1.8} />
            {copy.cta}
            <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
          </AppButton>
        </div>
      </div>
    </motion.div>
  );
}
