import { Car, Coffee, Gift, Heart, Package, Plus, Minus, Smartphone } from 'lucide-react';
import type { EventProduct, SelectedEventProduct } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';

const iconFor = { parking: Car, merchandise: Package, donation: Heart, food: Coffee, digital_addon: Smartphone, other: Gift, ticket: Gift } as const;

/**
 * Per-type accent + body, matching the ticket-tier card language. Each type has
 * a dark body (deep tinted gradient, light type) and a light body (barely-tinted
 * surface, dark type) plus a deepened accent, so the hue survives light mode
 * where the dark-mode pastels would wash out.
 */
type ExtraStyle = { rgb: string; lightRgb: string; label: string; body: string; lightBody: string };

const styleFor: Record<string, ExtraStyle> = {
  parking: { rgb: '96,165,250', lightRgb: '29,78,216', label: 'Parking', body: 'linear-gradient(155deg, #101a2d 0%, #0a0e14 100%)', lightBody: 'linear-gradient(155deg, #eef4ff 0%, #f8fafc 100%)' },
  merchandise: { rgb: '196,181,253', lightRgb: '109,40,217', label: 'Merch', body: 'linear-gradient(155deg, #1a1030 0%, #0c0818 100%)', lightBody: 'linear-gradient(155deg, #f4f0ff 0%, #fbfaff 100%)' },
  donation: { rgb: '251,113,133', lightRgb: '190,24,66', label: 'Donation', body: 'linear-gradient(155deg, #2a0f1a 0%, #140709 100%)', lightBody: 'linear-gradient(155deg, #fff0f3 0%, #fffafb 100%)' },
  food: { rgb: '250,200,60', lightRgb: '161,98,7', label: 'Food & Drink', body: 'linear-gradient(155deg, #1e1a0a 0%, #0e0c08 100%)', lightBody: 'linear-gradient(155deg, #fff8e6 0%, #fffdf7 100%)' },
  digital_addon: { rgb: '34,211,238', lightRgb: '14,116,144', label: 'Digital', body: 'linear-gradient(155deg, #06222a 0%, #060f12 100%)', lightBody: 'linear-gradient(155deg, #ecfaff 0%, #f8feff 100%)' },
  other: { rgb: '214,249,5', lightRgb: '101,124,6', label: 'Extra', body: 'linear-gradient(155deg, #14180a 0%, #0a0c06 100%)', lightBody: 'linear-gradient(155deg, #f7fce4 0%, #fcfef5 100%)' },
  ticket: { rgb: '214,249,5', lightRgb: '101,124,6', label: 'Ticket', body: 'linear-gradient(155deg, #14180a 0%, #0a0c06 100%)', lightBody: 'linear-gradient(155deg, #f7fce4 0%, #fcfef5 100%)' },
};

export function ExtrasStep({ products, selected, onChange, includedProductIds = [], isDark, compact }: {
  products: EventProduct[];
  selected: SelectedEventProduct[];
  onChange: (items: SelectedEventProduct[]) => void;
  includedProductIds?: string[];
  isDark: boolean;
  compact?: boolean;
}) {
  const update = (product: EventProduct, delta: number) => {
    if (includedProductIds.includes(product.id)) return; // included extras are locked
    const existing = selected.find((item) => item.productId === product.id);
    const quantity = Math.max(0, Math.min(product.maxPerOrder ?? 8, (existing?.quantity ?? 0) + delta));
    const next = selected.filter((item) => item.productId !== product.id);
    if (quantity) next.push({ productId: product.id, type: product.type, name: product.name, unitPrice: product.price, quantity });
    onChange(next);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-3">
          <p className="text-[11px] tracking-[2.2px] uppercase" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? 'rgba(214,249,5,0.8)' : '#0a0a0a' }}>Make it yours</p>
          <p className="mt-1 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,.48)' : 'rgba(0,0,0,.5)' }}>Optional extras for this event. Skip any you don’t need.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2.5">
        {products.map((product) => {
          const Icon = iconFor[product.type];
          const s = styleFor[product.type] ?? styleFor.other;
          const hue = isDark ? s.rgb : s.lightRgb;
          const accent = `rgb(${hue})`;
          const nameColor = isDark ? '#fff' : 'rgba(20,18,40,0.92)';
          const priceColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(20,18,40,0.55)';
          const isIncluded = includedProductIds.includes(product.id);
          const quantity = selected.find((item) => item.productId === product.id)?.quantity ?? 0;
          const active = isIncluded || quantity > 0;
          return (
            <div key={product.id} className="relative rounded-xl overflow-hidden px-4 py-3 flex items-center gap-3"
              style={{
                background: isDark ? s.body : s.lightBody,
                border: isDark ? undefined : `1px solid rgba(${hue},0.16)`,
                opacity: active ? 1 : isDark ? 0.9 : 0.96,
              }}>
              <div className="relative w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: `rgba(${hue},${isDark ? 0.16 : 0.1})`, color: accent }}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </div>

              <div className="relative min-w-0 flex-1">
                <p className="text-[8px] tracking-[1.5px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: accent, fontWeight: 600 }}>{s.label}</p>
                <p className="text-[13px] leading-tight truncate" style={{ fontFamily: "'Inter', sans-serif", color: nameColor, fontWeight: 600 }}>{product.name}</p>
              </div>

              <div className="relative shrink-0 flex flex-col items-end gap-1.5">
                {!isIncluded && (
                  <span className="text-[11px] tabular-nums" style={{ fontFamily: "'Inter', sans-serif", color: priceColor, fontWeight: 500 }}>
                    ETB {product.price.toLocaleString()}
                  </span>
                )}
                {isIncluded ? (
                  <span className="text-[8.5px] tracking-[1px] uppercase px-2 py-1 rounded-md" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#0a0a0a' : '#fff', background: accent, fontWeight: 700 }}>Included</span>
                ) : quantity > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <AppButton onClick={() => update(product, -1)} className="w-6 h-6 rounded-md grid place-items-center" style={{ background: `rgba(${hue},${isDark ? 0.14 : 0.12})`, color: accent }}><Minus className="w-3 h-3" strokeWidth={2.5} /></AppButton>
                    <span className="w-3 text-center text-[12px] tabular-nums" style={{ color: nameColor }}>{quantity}</span>
                    <AppButton onClick={() => update(product, 1)} className="w-6 h-6 rounded-md grid place-items-center" style={{ background: `rgba(${hue},${isDark ? 0.14 : 0.12})`, color: accent }}><Plus className="w-3 h-3" strokeWidth={2.5} /></AppButton>
                  </div>
                ) : (
                  <AppButton onClick={() => update(product, 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, background: `rgba(${hue},${isDark ? 0.2 : 0.13})`, color: accent }}>
                    <Plus className="w-3 h-3" strokeWidth={2.5} /> Add
                  </AppButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
