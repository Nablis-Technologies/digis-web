import { CalendarX } from 'lucide-react';
import { GlassReflection } from '@/components/primitives/GlassReflection';

/** Docked purchase-bar state for an event whose dates have all ended
 *  (BACKEND_GAPS #34 frontend mitigation — the backend still accepts orders
 *  for past events, so the frontend disables the buy entry). */
export function EndedBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="relative flex items-center gap-3 min-[380px]:gap-4 overflow-hidden px-4 min-[380px]:px-5 py-3 rounded-2xl"
      style={{
        background: isDark ? 'transparent' : 'rgba(255,255,255,0.72)',
        backdropFilter: isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)',
        border: 'none',
      }}
    >
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 flex flex-col flex-shrink-0 gap-1" style={{ width: 78 }}>
        <span
          className="text-[9px] tracking-[1.8px] uppercase leading-none"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(214,249,5,0.7)' : 'rgba(0,0,0,0.55)', fontWeight: 600 }}
        >
          Event ended
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isDark ? '#d6f905' : '#0a0a0a' }} />
          <span
            className="text-[10px] leading-none"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
          >
            No tickets
          </span>
        </div>
      </div>
      <div className="relative z-10 w-px self-stretch my-1" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
      <div
        className="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 cursor-not-allowed opacity-50"
        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
      >
        <CalendarX className="w-4 h-4" strokeWidth={1.75} style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }} />
        <span
          className="text-[14px] tracking-[0.3px]"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
        >
          Event ended
        </span>
      </div>
    </div>
  );
}