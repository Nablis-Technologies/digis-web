import { useDominantColor } from '../hooks/useDominantColor';

export function SheetEnvironment({ artwork, isDark }: { artwork?: string | null; isDark: boolean }) {
  const rgb = useDominantColor(artwork || undefined);
  if (!artwork) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden"
      style={{ maskImage: 'linear-gradient(black, transparent)' }}>
      <img src={artwork} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-[48px]"
        style={{ opacity: isDark ? 0.22 : 0.16 }} />
      {rgb && <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at top left, rgba(${rgb.join(',')}, ${isDark ? 0.22 : 0.16}), transparent 75%)`,
      }} />}
    </div>
  );
}
