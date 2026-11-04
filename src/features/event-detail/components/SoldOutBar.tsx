import { purchaseBarGlass } from './PurchaseBar';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function SoldOutBar({ isDark, onNavigate, onJoinWaitlist, waitlistActionLabel = "Join waitlist" }: { isDark: boolean; onJoinWaitlist?: () => void; waitlistActionLabel?: string; onNavigate?: (view: string) => void }) {
  if (onJoinWaitlist) {
    return (
      <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl px-4 py-3"
        style={purchaseBarGlass(isDark)}>
        <GlassReflection isDark={isDark} />
        <span className="relative text-sm text-foreground">Ticket waitlist</span>
        <AppButton onClick={onJoinWaitlist} className="relative shrink-0 rounded-xl bg-[#d6f905] px-3 py-2 text-xs font-semibold text-[#0a0a0a]">
          {waitlistActionLabel}
        </AppButton>
      </div>
    );
  }
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
        <span className="relative z-10 w-full text-center text-sm font-semibold text-foreground">
          Sold Out
        </span>
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
