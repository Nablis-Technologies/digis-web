import { categoryMeta, getCategoryColor } from '@/lib/categoryColors';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function EventCategoryTag({ category, rgb, isDark, detail = false }: { category: string; rgb: string; isDark: boolean; detail?: boolean }) {
  const c = getCategoryColor(category, rgb);
  const Icon = categoryMeta(category)?.Icon;

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full tracking-[1.5px] uppercase ${detail ? "px-3 py-1.5 text-[10px]" : "h-[22px] px-2.5 text-[9px] leading-none"}`}
      style={{
        fontFamily: "'Inter', sans-serif",
        background: `linear-gradient(${c.scrim}, ${c.scrim}), rgba(${c.rgb},${c.tint})`,
        backdropFilter: "blur(10px)",
        color: `rgba(${c.rgb},${c.text})`,
        fontWeight: 600,
      }}
    >
      <GlassReflection isDark={isDark} />
      {Icon && <Icon aria-hidden="true" className="relative z-10 mr-1 h-3 w-3 shrink-0" />}
      <span className="relative z-10">{category}</span>
    </span>
  );
}
