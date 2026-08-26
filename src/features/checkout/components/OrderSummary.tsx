export function SummaryLine({ label, value, color, isDark }: { label: string; value: string; color?: string; isDark: boolean }) {
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  return (
    <div className="flex items-center justify-between text-[12px]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <span style={{ color: textMuted }}>{label}</span>
      <span style={{ color: color || textPrimary, fontWeight: color ? 500 : 400 }}>{value}</span>
    </div>
  );
}

export function OrderSummary({ subtotal, discountTotal, promoCode, serviceFee, total, isDark, compact = false }: {
  subtotal: number; discountTotal: number; promoCode?: string; serviceFee: number; total: number; isDark: boolean; compact?: boolean;
}) {
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  return (
    <div className={compact ? 'space-y-2' : 'p-4 space-y-2'}>
      <SummaryLine label="Subtotal" value={`ETB ${subtotal.toLocaleString()}`} isDark={isDark} />
      {discountTotal > 0 && <SummaryLine label={`Promo ${promoCode ? `· ${promoCode}` : ''}`} value={`− ETB ${discountTotal.toLocaleString()}`} color="#34d399" isDark={isDark} />}
      <SummaryLine label="Service fee" value={`ETB ${serviceFee.toLocaleString()}`} isDark={isDark} />
      <div className="flex items-baseline justify-between pt-2.5 mt-1" style={{ borderTop: `1px solid ${divider}` }}>
        <span className="text-[11px] tracking-[1.5px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>Total</span>
        <span className="text-[20px] font-light leading-none" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>ETB {total.toLocaleString()}</span>
      </div>
    </div>
  );
}
