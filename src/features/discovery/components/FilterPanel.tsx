import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useTheme } from "@/app/components/ThemeContext";
import type { EventAccessFilter, EventPriceFilter, EventSortBy } from "@/features/discovery/hooks/useEventFilter";
import { AppButton } from '@/components/primitives/AppButton';
import { glassEdge } from '@/lib/ui/glass';

const EVENT_TYPES: { id: EventAccessFilter; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "ticketed", label: "Ticketed" },
];

const PRICE_RANGES: { id: EventPriceFilter; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "under-1000", label: "Under ETB 1K" },
  { id: "1000-3000", label: "ETB 1K–3K" },
  { id: "3000-plus", label: "ETB 3K+" },
];

export function FilterPanel({
  sortBy,
  onSortChange,
  onlyFeatured,
  onOnlyFeaturedChange,
  onlyAvailable,
  onOnlyAvailableChange,
  eventTypes,
  onEventTypesChange,
  priceRange,
  onPriceRangeChange,
  activeFilterCount,
}: {
  sortBy: EventSortBy;
  onSortChange: (sortBy: EventSortBy) => void;
  onlyFeatured: boolean;
  onOnlyFeaturedChange: (value: boolean) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
  eventTypes: EventAccessFilter[];
  onEventTypesChange: (types: EventAccessFilter[]) => void;
  priceRange: EventPriceFilter | null;
  onPriceRangeChange: (range: EventPriceFilter | null) => void;
  activeFilterCount: number;
}) {
  const { isDark } = useTheme();
  const textMuted = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  const toggleType = (type: EventAccessFilter) => {
    onEventTypesChange(eventTypes.includes(type) ? eventTypes.filter((item) => item !== type) : [...eventTypes, type]);
  };

  return (
    <>
      <AppButton aria-pressed={onlyFeatured} onClick={() => onOnlyFeaturedChange(!onlyFeatured)} className="min-h-11 mb-4 px-3 py-2 rounded-xl text-sm" style={{ color: isDark ? '#fff' : '#1a1a1a', ...glassEdge(isDark) }}>{onlyFeatured && <Check className="w-3 h-3 inline mr-2" />}Featured only</AppButton>
      <FilterLabel>Event access</FilterLabel>
      <div className="flex flex-wrap gap-2 mb-4">
        {EVENT_TYPES.map((option) => (
          <FilterChip key={option.id} label={option.label} active={eventTypes.includes(option.id)} onClick={() => toggleType(option.id)} />
        ))}
      </div>

      <Divider />

      <FilterLabel>Price</FilterLabel>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRICE_RANGES.map((option) => (
          <FilterChip key={option.id} label={option.label} active={priceRange === option.id} onClick={() => onPriceRangeChange(priceRange === option.id ? null : option.id)} />
        ))}
      </div>

      <Divider />

      <FilterLabel>Sort by</FilterLabel>
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { id: "soonest", label: "Soonest" },
          { id: "price-low", label: "Price: Low" },
          { id: "price-high", label: "Price: High" },
          { id: "available", label: "Most available" },
        ] as const).map((option) => (
          <FilterChip key={option.id} label={option.label} active={sortBy === option.id} onClick={() => onSortChange(option.id)} />
        ))}
      </div>

      <Divider />

      <AppButton onClick={() => onOnlyAvailableChange(!onlyAvailable)} className="w-full flex items-center justify-between py-1">
        <div className="flex flex-col items-start">
          <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? "#fff" : "#1a1a1a", fontWeight: 500 }}>Available only</span>
          <span className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>Hide sold-out events</span>
        </div>
        <div className="relative w-10 h-6 rounded-full transition-colors" style={{ background: onlyAvailable ? (isDark ? "#d6f905" : "#0a0a0a") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }}>
          <motion.div animate={{ x: onlyAvailable ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-4 h-4 rounded-full" style={{ background: onlyAvailable ? (isDark ? "#0a0a0a" : "#fff") : "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
        </div>
      </AppButton>

      {activeFilterCount > 0 && (
        <AppButton onClick={() => { onSortChange("soonest"); onOnlyAvailableChange(false); onOnlyFeaturedChange(false); onEventTypesChange([]); onPriceRangeChange(null); }} className="mt-3 text-[11px] tracking-[1.2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)", fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}>Reset filters</AppButton>
      )}
    </>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  return <p className="text-[10px] tracking-[2px] uppercase mb-3" style={{ fontFamily: "'Inter', sans-serif", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontWeight: 600 }}>{children}</p>;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const { isDark } = useTheme();
  return <AppButton onClick={onClick} className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.5px] transition-all flex items-center gap-1.5" style={{ fontFamily: "'Inter', sans-serif", background: active ? (isDark ? "#d6f905" : "#0a0a0a") : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), color: active ? (isDark ? "#0a0a0a" : "#fff") : (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)"), fontWeight: active ? 600 : 500, ...glassEdge(isDark) }}>{active && <Check className="w-3 h-3" strokeWidth={3} />}{label}</AppButton>;
}

function Divider() {
  const { isDark } = useTheme();
  return <div className="h-px w-full mb-4" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }} />;
}
