import { Gift } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function SoldOutBar({ isDark, onNavigate }: { isDark: boolean; onNavigate?: (view: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center gap-3 min-[380px]:gap-4 overflow-hidden px-4 min-[380px]:px-5 py-3 rounded-2xl"
        style={{
          background: isDark ? 'transparent' : 'rgba(255,255,255,0.72)',
          backdropFilter: isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: isDark ? 'blur(60px) saturate(2) brightness(1.15)' : 'blur(24px) saturate(1.8)',
          border: 'none',
        }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex flex-col flex-shrink-0 gap-1" style={{ width: 78 }}>
          <span className="text-[9px] tracking-[1.8px] uppercase leading-none"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,100,90,0.7)' : 'rgba(200,40,30,0.6)', fontWeight: 600 }}>
            Sold Out
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ff3b30' }} />
            <span className="text-[10px] leading-none"
              style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
              No tickets
            </span>
          </div>
        </div>
        <div className="relative z-10 w-px self-stretch my-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
        <div className="relative z-10 h-10 w-10 min-[380px]:w-auto rounded-xl flex items-center justify-center gap-1.5 flex-shrink-0 min-[380px]:px-[10px] opacity-30 cursor-not-allowed"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: 'none',
          }}>
          <Gift className="w-[16px] h-[16px]"
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} strokeWidth={1.75} />
          <span className="hidden min-[380px]:inline text-[12px] tracking-[0.3px]"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)' }}>
            Gift
          </span>
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 cursor-not-allowed opacity-40"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <span className="text-[14px] tracking-[0.3px]"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
            Sold Out
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 px-1">
        <span className="text-[11px]"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
          Tickets may be available on the
        </span>
        <AppButton
          onClick={() => onNavigate?.('resale')}
          className="text-[11px] underline underline-offset-2 cursor-pointer"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: isDark ? '#d6f905' : '#0a0a0a', background: 'none', border: 'none', padding: 0 }}>
          resale marketplace →
        </AppButton>
      </div>
    </div>
  );
}
