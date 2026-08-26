import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, Share2, Download, ChevronDown, ChevronRight, Sparkles, Send, Tag, Check, Ticket as TicketIcon, ArrowRight, Compass, X, ArrowUpRight } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { useImageColor } from '@/lib/hooks/useImageColor';
import type { UserTicket } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

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
        style={{
          padding: '44px 28px 36px',
          background: isDark
            ? 'linear-gradient(165deg, rgba(40,40,20,0.55) 0%, rgba(18,18,10,0.75) 100%)'
            : 'linear-gradient(165deg, rgba(255,255,255,0.8) 0%, rgba(250,250,235,0.9) 100%)',
          border: `1px solid ${isDark ? 'rgba(217,255,0,0.18)' : 'rgba(214,249,5,0.15)'}`,
          backdropFilter: 'blur(40px) saturate(1.4)',
          boxShadow: isDark
            ? '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
            : 'none',
        }}
      >
        {/* Animated colorful Digis ticket passes */}
        <div className="relative flex items-center justify-center mb-7" style={{ height: '170px' }}>
          {[
            // back-left — violet
            {
              rot: -16, x: -54, dur: 6, delay: 0,
              grad: 'linear-gradient(155deg, #a78bfa 0%, #6d28d9 100%)',
              text: '#fff', sub: 'rgba(255,255,255,0.7)',
              glow: 'rgba(124,58,237,0.45)', border: 'rgba(167,139,250,0.6)', scale: 0.84, front: false,
            },
            // back-right — cyan
            {
              rot: 14, x: 54, dur: 5.5, delay: 0.3,
              grad: 'linear-gradient(155deg, #22d3ee 0%, #0e7490 100%)',
              text: '#fff', sub: 'rgba(255,255,255,0.75)',
              glow: 'rgba(34,211,238,0.45)', border: 'rgba(103,232,249,0.6)', scale: 0.89, front: false,
            },
            // front — brand lime
            {
              rot: -2, x: 0, dur: 4.5, delay: 0.15,
              grad: 'linear-gradient(155deg, #e9ff4d 0%, #b6dd00 100%)',
              text: '#0a0a0a', sub: 'rgba(10,10,10,0.6)',
              glow: 'rgba(214,249,5,0.6)', border: 'rgba(180,221,0,0.9)', scale: 1, front: true,
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30, rotate: card.rot * 0.4 }}
              animate={{ opacity: 1, y: [0, card.front ? -8 : -4, 0], rotate: card.rot }}
              transition={{
                opacity: { duration: 0.5, delay: card.delay },
                rotate: { duration: 0.5, delay: card.delay },
                y: { duration: card.dur, repeat: Infinity, ease: 'easeInOut', delay: card.delay + 0.4 },
              }}
              className="absolute rounded-[16px] overflow-hidden"
              style={{
                width: '112px', height: '138px',
                marginLeft: `${card.x}px`,
                scale: card.scale,
                background: card.grad,
                border: `1px solid ${card.border}`,
                boxShadow: `0 20px 44px -16px rgba(0,0,0,0.45), 0 6px 16px -8px rgba(0,0,0,0.4)`,
              }}
            >
              {/* Glossy sheen */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 42%)' }} />
              {/* Top row */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="text-[6px] tracking-[1.5px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: card.sub }}>
                  Admit One
                </span>
                <motion.div
                  animate={card.front ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-3 h-3" strokeWidth={1.75} style={{ color: card.text }} />
                </motion.div>
              </div>
              {/* Digis wordmark */}
              <div className="absolute inset-x-0 top-[36%] -translate-y-1/2 flex flex-col items-center">
                <span className="leading-none"
                  style={{
                    fontFamily: "'Zalando Sans Expanded', sans-serif", fontWeight: 600,
                    fontSize: card.front ? '20px' : '16px', letterSpacing: '-0.5px', color: card.text,
                  }}>
                  Digis
                </span>
                <span className="mt-1 text-[5.5px] tracking-[2px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: card.sub }}>
                  Event Pass
                </span>
              </div>
              {/* Notches + perforation */}
              <div className="absolute -left-[5px] top-[60%] -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{ background: isDark ? '#121009' : '#fafaf0' }} />
              <div className="absolute -right-[5px] top-[60%] -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{ background: isDark ? '#121009' : '#fafaf0' }} />
              <div className="absolute left-2.5 right-2.5"
                style={{ top: '60%', borderTop: `1px dashed ${card.front ? 'rgba(10,10,10,0.25)' : 'rgba(255,255,255,0.4)'}` }} />
              {/* Barcode */}
              <div className="absolute left-2.5 right-2.5 bottom-2.5 flex items-end gap-[2px] h-5">
                {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 3].map((w, b) => (
                  <div key={b} className="rounded-[1px]"
                    style={{ width: w, height: '100%', background: card.text, opacity: b % 2 === 0 ? 0.85 : 0.5 }} />
                ))}
              </div>
            </motion.div>
          ))}

          {/* Confetti sparkles */}
          {[
            { x: -82, y: -34, d: 0 },
            { x: 80, y: -44, d: 0.5 },
            { x: -74, y: 46, d: 1 },
            { x: 84, y: 36, d: 1.4 },
          ].map((s, i) => (
            <motion.div
              key={i}
              animate={{ y: [s.y, s.y - 6, s.y], opacity: [0.3, 0.9, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
              className="absolute"
              style={{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)` }}
            >
              <Sparkles className="w-3 h-3" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} strokeWidth={1.5} />
            </motion.div>
          ))}
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
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full cursor-pointer relative overflow-hidden"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: isDark
                ? 'linear-gradient(135deg, #d9ff00, #d6f905)'
                : 'linear-gradient(135deg, #d6f905, #d6f905)',
              color: '#000',
              fontSize: '13px',
              letterSpacing: '0.5px',
              boxShadow: 'none',
            }}
          >
            <Compass className="w-4 h-4" strokeWidth={1.8} />
            {copy.cta}
            <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            {/* Shine sweep */}
            <motion.span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
            />
          </AppButton>

          {isUpcoming && (
            <div className="flex items-center justify-center gap-5 mt-7 pt-6 border-t"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.06)' }}
            >
              {[
                { icon: <TicketIcon className="w-3.5 h-3.5" />, label: 'Live events' },
                { icon: <Send className="w-3.5 h-3.5" />, label: 'Transferable' },
                { icon: <Sparkles className="w-3.5 h-3.5" />, label: 'VIP access' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '10px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)',
                  }}
                >
                  <span style={{ color: isDark ? '#d6f905' : '#0a0a0a' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
