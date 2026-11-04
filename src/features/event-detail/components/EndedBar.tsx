import { Hourglass } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassEdge } from '@/lib/ui/glass';
import { purchaseBarGlass } from './PurchaseBar';

export function EndedBar({ isDark, onBrowse }: { isDark: boolean; onBrowse?: () => void }) {
  return (
    <div className="relative grid items-center gap-3 overflow-hidden rounded-2xl px-4 py-3"
      style={{ ...purchaseBarGlass(isDark), gridTemplateColumns: onBrowse ? "minmax(0, 1fr) auto minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
      <GlassReflection isDark={isDark} />
      <div role="status" className="relative flex min-w-0 items-center gap-2.5">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl" style={glassControl(isDark)}>
          <GlassReflection isDark={isDark} />
          <Hourglass aria-hidden="true" className="relative h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[9px] uppercase tracking-[1.5px] text-muted-foreground">Tickets</p>
          <p className="text-xs text-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Event ended</p>
        </div>
      </div>
      {onBrowse && (<>
        <span aria-hidden="true" className="relative h-6 w-px self-center bg-current/10" />
        <AppButton onClick={onBrowse} className="relative inline-flex h-10 shrink-0 items-center justify-self-end rounded-full px-5 sm:px-6 text-xs font-semibold"
          style={{ ...glassEdge(isDark), background: isDark ? 'rgba(214,249,5,0.12)' : '#d6f905', color: isDark ? '#d6f905' : '#0a0a0a' }}>
          Browse events
        </AppButton>
        </>
      )}
    </div>
  );
}
